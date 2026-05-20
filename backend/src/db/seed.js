require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { initializeDatabase } = require('./migrate');

async function seed() {
  await initializeDatabase();
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding database...');

    // Create demo users
    const adminHash = await bcrypt.hash('admin123', 12);
    const memberHash = await bcrypt.hash('member123', 12);

    const adminRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, avatar_color)
       VALUES ('Admin User', 'admin@taskflow.com', $1, 'admin', '#6366f1')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [adminHash]
    );

    const memberRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, avatar_color)
       VALUES ('Jane Member', 'member@taskflow.com', $1, 'member', '#10b981')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [memberHash]
    );

    const adminId = adminRes.rows[0].id;
    const memberId = memberRes.rows[0].id;

    // Create demo project
    const projRes = await client.query(
      `INSERT INTO projects (name, description, color, owner_id)
       VALUES ('Website Redesign', 'Redesigning the company website with modern UX', '#6366f1', $1)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [adminId]
    );

    if (projRes.rows.length > 0) {
      const projectId = projRes.rows[0].id;

      // Add both as members
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'admin'), ($1, $3, 'member')
         ON CONFLICT DO NOTHING`,
        [projectId, adminId, memberId]
      );

      // Create demo tasks
      const taskData = [
        ['Design new homepage', 'Create wireframes and mockups', 'todo', 'high', memberId],
        ['Set up CI/CD pipeline', 'Configure GitHub Actions', 'in_progress', 'medium', adminId],
        ['Write API documentation', 'Document all REST endpoints', 'done', 'low', memberId],
        ['Fix login bug', 'Users report 403 on mobile', 'todo', 'high', memberId],
        ['Add dark mode', 'Implement theme toggle', 'in_progress', 'medium', memberId],
      ];

      for (const [title, desc, status, priority, assigneeId] of taskData) {
        await client.query(
          `INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
          [title, desc, status, priority, projectId, assigneeId, adminId]
        );
      }
    }

    console.log('✅ Seed complete!');
    console.log('   Admin: admin@taskflow.com / admin123');
    console.log('   Member: member@taskflow.com / member123');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
