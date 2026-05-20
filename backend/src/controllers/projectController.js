const { validationResult } = require('express-validator');
const { query } = require('../config/db');

const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#06b6d4',
];

/**
 * GET /api/projects
 * Returns all projects where the user is a member or owner
 */
async function getProjects(req, res, next) {
  try {
    const result = await query(
      `SELECT p.*, u.name AS owner_name,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
        pm.role AS user_role
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.owner_id = $1 OR pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ projects: result.rows });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/projects
 * Create a new project (admin only)
 */
async function createProject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, color } = req.body;
    const projectColor = color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];

    const result = await query(
      `INSERT INTO projects (name, description, color, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), description || null, projectColor, req.user.id]
    );

    const project = result.rows[0];

    // Add creator as admin member
    await query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [project.id, req.user.id]
    );

    res.status(201).json({ message: 'Project created successfully.', project });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:id
 */
async function getProject(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      `SELECT p.*, u.name AS owner_name,
        pm.role AS user_role
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or access denied.' });
    }

    // Get members
    const membersResult = await query(
      `SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [id]
    );

    res.json({
      project: result.rows[0],
      members: membersResult.rows,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/projects/:id
 */
async function updateProject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, color } = req.body;

    const result = await query(
      `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), color = COALESCE($3, color)
       WHERE id = $4 AND owner_id = $5
       RETURNING *`,
      [name?.trim() || null, description || null, color || null, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or you are not the owner.' });
    }

    res.json({ message: 'Project updated.', project: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/projects/:id
 */
async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or you are not the owner.' });
    }

    res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/projects/:id/members
 * Add member to project (project admin only)
 */
async function addMember(req, res, next) {
  try {
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    // Check user exists
    const userCheck = await query('SELECT id, name, email, avatar_color FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Add or update member
    await query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [id, userId, role]
    );

    res.status(201).json({
      message: 'Member added to project.',
      member: { ...userCheck.rows[0], role },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/projects/:id/members/:userId
 */
async function removeMember(req, res, next) {
  try {
    const { id, userId } = req.params;

    // Prevent removing the owner
    const project = await query('SELECT owner_id FROM projects WHERE id = $1', [id]);
    if (project.rows[0]?.owner_id === userId) {
      return res.status(400).json({ error: 'Cannot remove the project owner.' });
    }

    await query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Member removed from project.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
