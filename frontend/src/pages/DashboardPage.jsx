import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../api/tasks';
import { getTasks } from '../api/tasks';
import { getProjects } from '../api/projects';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getTasks({ assignee_id: user?.id }), getProjects()])
      .then(([s, t, p]) => {
        setStats(s.data.stats);
        setTasks(t.data.tasks.slice(0, 6));
        setProjects(p.data.projects.slice(0, 4));
      })
      .finally(() => setLoading(false));
  }, [user]);

  function handleStatusChange(taskId, newStatus) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const statItems = [
    { icon: '📁', label: 'My Projects', value: stats?.project_count || 0, color: 'var(--accent)' },
    { icon: '✅', label: 'My Tasks', value: stats?.my_tasks || 0, color: 'var(--info)' },
    { icon: '🔄', label: 'In Progress', value: stats?.in_progress_count || 0, color: 'var(--warning)' },
    { icon: '✔️', label: 'Completed', value: stats?.done_count || 0, color: 'var(--success)' },
    { icon: '⚠️', label: 'Overdue', value: stats?.overdue_count || 0, color: 'var(--danger)' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">Here's what's happening with your projects today.</p>
        </div>
        <Link to="/projects" className="btn btn-primary">+ New Project</Link>
      </div>

      {/* Stats */}
      <div className="stat-cards" style={{ marginBottom: 32 }}>
        {statItems.map(({ icon, label, value, color }) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon">{icon}</div>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Recent Tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>My Tasks</h2>
            <Link to="/tasks" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          {tasks.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon">✅</div>
              <div className="empty-title">No tasks assigned to you</div>
              <div className="empty-desc">Tasks assigned to you will appear here.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map(task => (
                <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Projects */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Projects</h2>
            <Link to="/projects" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.length === 0 ? (
              <div className="card card-sm" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                No projects yet
              </div>
            ) : projects.map(p => (
              <Link to={`/projects/${p.id}`} key={p.id} style={{ display: 'block' }}>
                <div className="card card-sm" style={{ cursor: 'pointer', '--project-color': p.color, borderLeft: `3px solid ${p.color}` }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                    <span>👥 {p.member_count}</span>
                    <span>✅ {p.task_count} tasks</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
