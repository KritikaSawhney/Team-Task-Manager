/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('[Error]', err.stack || err.message);

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource does not exist.' });
  }

  // PostgreSQL not null violation
  if (err.code === '23502') {
    return res.status(400).json({ error: `Field '${err.column}' is required.` });
  }

  // Default
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? statusCode === 500 ? 'Internal server error.' : err.message
    : err.message || 'Internal server error.';

  res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
