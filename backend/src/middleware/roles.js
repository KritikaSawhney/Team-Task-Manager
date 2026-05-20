/**
 * Role-Based Access Control Middleware
 */

/**
 * Require global admin role
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied. Admin role required.',
    });
  }
  next();
}

/**
 * Require project-level admin (owner or project admin member)
 * Must be used after authenticate and after loading project into req.project
 */
function requireProjectAdmin(req, res, next) {
  const project = req.project;
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }
  // Owner is always admin
  if (project.owner_id === req.user.id) {
    return next();
  }
  // Global admins can manage any project
  if (req.user.role === 'admin') {
    return next();
  }
  // Check project-level role
  if (req.projectMemberRole === 'admin') {
    return next();
  }
  return res.status(403).json({
    error: 'Access denied. Project admin role required.',
  });
}

module.exports = { requireAdmin, requireProjectAdmin };
