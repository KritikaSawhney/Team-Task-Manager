const { validationResult } = require('express-validator');
const { query } = require('../config/db');

/**
 * GET /api/tasks
 * All tasks for the authenticated user's projects (dashboard view)
 * Supports filters: status, priority, project_id, assignee_id, overdue
 */
async function getTasks(req, res, next) {
  try {
    const { status, priority, project_id, assignee_id, overdue } = req.query;
    const userId = req.user.id;

    let conditions = [
      `(t.assignee_id = $1 OR t.created_by = $1 OR p.owner_id = $1 OR EXISTS (
        SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $1
      ))`
    ];
    let params = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(status);
    }
    if (priority) {
      conditions.push(`t.priority = $${paramIndex++}`);
      params.push(priority);
    }
    if (project_id) {
      conditions.push(`t.project_id = $${paramIndex++}`);
      params.push(project_id);
    }
    if (assignee_id) {
      conditions.push(`t.assignee_id = $${paramIndex++}`);
      params.push(assignee_id);
    }
    if (overdue === 'true') {
      conditions.push(`t.due_date < CURRENT_DATE AND t.status != 'done'`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT t.*,
        p.name AS project_name, p.color AS project_color,
        u.name AS assignee_name, u.avatar_color AS assignee_avatar_color,
        cb.name AS created_by_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users cb ON cb.id = t.created_by
       ${whereClause}
       ORDER BY
         CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC`,
      params
    );

    res.json({ tasks: result.rows });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tasks
 * Create a task (admin or project admin)
 */
async function createTask(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, status, priority, due_date, project_id, assignee_id } = req.body;

    // Verify requester is member of the project
    const memberCheck = await query(
      `SELECT pm.role FROM project_members pm WHERE pm.project_id = $1 AND pm.user_id = $2
       UNION SELECT 'owner' WHERE EXISTS (SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2)`,
      [project_id, req.user.id]
    );

    if (memberCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not a member of this project.' });
    }

    const userRole = memberCheck.rows[0]?.role;
    if (userRole === 'member' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only project admins can create tasks.' });
    }

    // Verify assignee is project member (if provided)
    if (assignee_id) {
      const assigneeCheck = await query(
        `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2
         UNION SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2`,
        [project_id, assignee_id]
      );
      if (assigneeCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Assignee must be a member of this project.' });
      }
    }

    const result = await query(
      `INSERT INTO tasks (title, description, status, priority, due_date, project_id, assignee_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        status || 'todo',
        priority || 'medium',
        due_date || null,
        project_id,
        assignee_id || null,
        req.user.id,
      ]
    );

    const task = result.rows[0];

    // Fetch enriched data
    const enriched = await query(
      `SELECT t.*,
        p.name AS project_name, p.color AS project_color,
        u.name AS assignee_name, u.avatar_color AS assignee_avatar_color,
        cb.name AS created_by_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users cb ON cb.id = t.created_by
       WHERE t.id = $1`,
      [task.id]
    );

    res.status(201).json({ message: 'Task created.', task: enriched.rows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tasks/:id
 */
async function getTask(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      `SELECT t.*,
        p.name AS project_name, p.color AS project_color,
        u.name AS assignee_name, u.avatar_color AS assignee_avatar_color,
        cb.name AS created_by_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users cb ON cb.id = t.created_by
       WHERE t.id = $1 AND (
         t.assignee_id = $2 OR t.created_by = $2 OR p.owner_id = $2 OR
         EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $2)
       )`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/tasks/:id
 * Full update (admin or project admin)
 */
async function updateTask(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, status, priority, due_date, assignee_id } = req.body;

    // Load task
    const taskResult = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const task = taskResult.rows[0];
    const userId = req.user.id;

    // Check if user has write access (admin, owner, project admin, or assignee)
    const memberCheck = await query(
      `SELECT pm.role FROM project_members pm WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [task.project_id, userId]
    );
    const isProjectAdmin = memberCheck.rows[0]?.role === 'admin';
    const isOwner = await query('SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2', [task.project_id, userId]);
    const isAssignee = task.assignee_id === userId;
    const isGlobalAdmin = req.user.role === 'admin';

    if (!isGlobalAdmin && !isProjectAdmin && !isOwner.rows.length && !isAssignee) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           due_date = COALESCE($5, due_date),
           assignee_id = COALESCE($6, assignee_id)
       WHERE id = $7
       RETURNING *`,
      [
        title?.trim() || null,
        description !== undefined ? description : null,
        status || null,
        priority || null,
        due_date !== undefined ? due_date : null,
        assignee_id || null,
        id,
      ]
    );

    res.json({ message: 'Task updated.', task: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tasks/:id/status
 * Quick status update (assignee or admin)
 */
async function updateTaskStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['todo', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: todo, in_progress, or done.' });
    }

    const taskResult = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const task = taskResult.rows[0];
    const userId = req.user.id;
    const isGlobalAdmin = req.user.role === 'admin';
    const isAssignee = task.assignee_id === userId;

    // Check project membership
    const memberCheck = await query(
      `SELECT pm.role FROM project_members pm WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [task.project_id, userId]
    );
    const isMember = memberCheck.rows.length > 0;

    if (!isGlobalAdmin && !isAssignee && !isMember) {
      return res.status(403).json({ error: 'You cannot update this task status.' });
    }

    const result = await query(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({ message: 'Task status updated.', task: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/tasks/:id
 */
async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const taskResult = await query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const task = taskResult.rows[0];

    // Only task creator, project owner, or global admin can delete
    const isGlobalAdmin = req.user.role === 'admin';
    const isCreator = task.created_by === userId;
    const isOwner = await query('SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2', [task.project_id, userId]);
    const memberCheck = await query(
      `SELECT pm.role FROM project_members pm WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [task.project_id, userId]
    );
    const isProjectAdmin = memberCheck.rows[0]?.role === 'admin';

    if (!isGlobalAdmin && !isCreator && !isOwner.rows.length && !isProjectAdmin) {
      return res.status(403).json({ error: 'Access denied. Cannot delete this task.' });
    }

    await query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tasks/dashboard
 * Dashboard stats for current user
 */
async function getDashboardStats(req, res, next) {
  try {
    const userId = req.user.id;

    const stats = await query(
      `SELECT
        COUNT(*) FILTER (WHERE t.assignee_id = $1) AS my_tasks,
        COUNT(*) FILTER (WHERE t.status = 'todo' AND t.assignee_id = $1) AS todo_count,
        COUNT(*) FILTER (WHERE t.status = 'in_progress' AND t.assignee_id = $1) AS in_progress_count,
        COUNT(*) FILTER (WHERE t.status = 'done' AND t.assignee_id = $1) AS done_count,
        COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status != 'done' AND t.assignee_id = $1) AS overdue_count
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE p.owner_id = $1
         OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = $1)`,
      [userId]
    );

    const projectCount = await query(
      `SELECT COUNT(*) FROM projects p
       WHERE p.owner_id = $1
         OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1)`,
      [userId]
    );

    res.json({
      stats: {
        ...stats.rows[0],
        project_count: projectCount.rows[0].count,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTasks,
  createTask,
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getDashboardStats,
};
