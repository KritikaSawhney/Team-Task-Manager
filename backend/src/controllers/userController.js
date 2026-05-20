const { query } = require('../config/db');

/**
 * GET /api/users
 * List all users (admin only)
 */
async function getUsers(req, res, next) {
  try {
    const result = await query(
      `SELECT id, name, email, role, avatar_color, created_at
       FROM users
       ORDER BY created_at ASC`
    );
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/search
 * Search users by name or email (for adding project members)
 */
async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters.' });
    }

    const result = await query(
      `SELECT id, name, email, role, avatar_color
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       LIMIT 10`,
      [`%${q.trim()}%`]
    );

    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:id
 */
async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, name, email, role, avatar_color, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/:id/role
 * Update user role (global admin only)
 */
async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or member.' });
    }

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, avatar_color',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User role updated.', user: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = { getUsers, searchUsers, getUser, updateUserRole };
