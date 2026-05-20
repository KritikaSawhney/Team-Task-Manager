import { useState, useEffect } from 'react';
import { getTasks } from '../api/tasks';
import TaskCard from '../components/TaskCard';
import { getProjects } from '../api/projects';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', project_id: '', overdue: '' });
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    getProjects().then(res => setProjects(res.data.projects));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.project_id) params.project_id = filters.project_id;
    if (filters.overdue) params.overdue = 'true';
    getTasks(params)
      .then(res => setTasks(res.data.tasks))
      .finally(() => setLoading(false));
  }, [filters]);

  function handleStatusChange(taskId, newStatus) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  }

  const set = (field) => (e) => setFilters(p => ({ ...p, [field]: e.target.value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">All Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''} found</p>
        </div>
      </div>

      <div className="filter-bar">
        <select className="filter-select" value={filters.status} onChange={set('status')}>
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select className="filter-select" value={filters.priority} onChange={set('priority')}>
          <option value="">All Priorities</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <select className="filter-select" value={filters.project_id} onChange={set('project_id')}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={filters.overdue === 'true'}
            onChange={e => setFilters(p => ({ ...p, overdue: e.target.checked ? 'true' : '' }))} />
          Overdue only
        </label>
        {(filters.status || filters.priority || filters.project_id || filters.overdue) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', priority: '', project_id: '', overdue: '' })}>
            ✕ Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : tasks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">✅</div>
          <div className="empty-title">No tasks found</div>
          <div className="empty-desc">Try adjusting your filters or create tasks from a project.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={setSelectedTask} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
