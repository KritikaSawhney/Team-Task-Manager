import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, deleteProject, addMember, removeMember } from '../api/projects';
import { getTasks, createTask, deleteTask } from '../api/tasks';
import { searchUsers } from '../api/users';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import TaskCard from '../components/TaskCard';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--text-secondary)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--info)' },
  { key: 'done', label: 'Done', color: 'var(--success)' },
];

const EMPTY_TASK = { title: '', description: '', priority: 'medium', status: 'todo', due_date: '', assignee_id: '' };

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('board');
  const searchRef = useRef(null);

  useEffect(() => {
    Promise.all([getProject(id), getTasks({ project_id: id })])
      .then(([pRes, tRes]) => {
        setProject(pRes.data.project);
        setMembers(pRes.data.members);
        setTasks(tRes.data.tasks);
      })
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id]);

  const isProjectAdmin = project?.owner_id === user?.id || project?.user_role === 'admin' || isAdmin;

  async function handleCreateTask(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...taskForm, project_id: id, assignee_id: taskForm.assignee_id || null, due_date: taskForm.due_date || null };
      const res = await createTask(payload);
      setTasks(p => [res.data.task, ...p]);
      setShowTaskModal(false);
      setTaskForm(EMPTY_TASK);
      toast.success('Task created!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(taskId);
      setTasks(p => p.filter(t => t.id !== taskId));
      setSelectedTask(null);
      toast.success('Task deleted');
    } catch { toast.error('Failed to delete task'); }
  }

  async function handleDeleteProject() {
    if (!window.confirm(`Delete project "${project.name}"? This is permanent.`)) return;
    try {
      await deleteProject(id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch { toast.error('Failed to delete project'); }
  }

  async function handleMemberSearch(q) {
    setMemberSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await searchUsers(q);
      const memberIds = members.map(m => m.id);
      setSearchResults(res.data.users.filter(u => !memberIds.includes(u.id)));
    } catch { setSearchResults([]); }
  }

  async function handleAddMember(u) {
    try {
      await addMember(id, { userId: u.id, role: 'member' });
      setMembers(p => [...p, { ...u, role: 'member' }]);
      setMemberSearch('');
      setSearchResults([]);
      setShowAddMember(false);
      toast.success(`${u.name} added to project`);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add member'); }
  }

  async function handleRemoveMember(memberId) {
    if (!window.confirm('Remove this member?')) return;
    try {
      await removeMember(id, memberId);
      setMembers(p => p.filter(m => m.id !== memberId));
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  }

  function handleStatusChange(taskId, newStatus) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!project) return null;

  const tasksByStatus = (status) => tasks.filter(t => t.status === status);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
          <div>
            <h1 className="page-title">{project.name}</h1>
            <p className="page-subtitle">{project.description || 'No description'} · {tasks.length} tasks · {members.length} members</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isProjectAdmin && <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>+ Add Task</button>}
          {isProjectAdmin && <button className="btn btn-secondary" onClick={() => setShowAddMember(true)}>👥 Add Member</button>}
          {isProjectAdmin && project.owner_id === user?.id && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>🗑</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 1 }}>
        {[['board', '📋 Board'], ['members', '👥 Members']].map(([key, label]) => (
          <button key={key} className={`btn btn-ghost btn-sm`}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === key ? 'var(--accent-light)' : 'var(--text-secondary)' }}
            onClick={() => setActiveTab(key)}>{label}
          </button>
        ))}
      </div>

      {activeTab === 'board' && (
        <div className="kanban-board">
          {COLUMNS.map(col => (
            <div className="kanban-column" key={col.key}>
              <div className="kanban-column-header">
                <span className="kanban-column-title" style={{ color: col.color }}>{col.label}</span>
                <span className="kanban-count">{tasksByStatus(col.key).length}</span>
              </div>
              <div className="kanban-tasks">
                {tasksByStatus(col.key).length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>No tasks</div>
                ) : tasksByStatus(col.key).map(task => (
                  <TaskCard key={task.id} task={task} onClick={setSelectedTask} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'members' && (
        <div style={{ maxWidth: 600 }}>
          <div className="members-list">
            {members.map(m => (
              <div className="member-item" key={m.id}>
                <div className="avatar" style={{ backgroundColor: m.avatar_color || '#6366f1' }}>
                  {getInitials(m.name)}
                </div>
                <div className="member-info">
                  <div className="member-name">{m.name} {m.id === project.owner_id ? '👑' : ''}</div>
                  <div className="member-email">{m.email}</div>
                </div>
                <div className="member-actions">
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                  {isProjectAdmin && m.id !== project.owner_id && m.id !== user?.id && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveMember(m.id)} style={{ color: 'var(--danger)' }}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title="Task Details"
        footer={
          isProjectAdmin && (
            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(selectedTask?.id)}>Delete Task</button>
          )
        }>
        {selectedTask && (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{selectedTask.title}</h3>
            {selectedTask.description && <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>{selectedTask.description}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <span className={`badge badge-${selectedTask.status}`}>{selectedTask.status.replace('_', ' ')}</span>
              <span className={`badge badge-${selectedTask.priority}`}>{selectedTask.priority} priority</span>
              {selectedTask.due_date && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>📅 {new Date(selectedTask.due_date).toLocaleDateString()}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div>👤 Assignee: <strong>{selectedTask.assignee_name || 'Unassigned'}</strong></div>
              <div>✏️ Created by: <strong>{selectedTask.created_by_name}</strong></div>
              <div>📁 Project: <strong>{selectedTask.project_name}</strong></div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Task Modal */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="Create Task"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateTask} disabled={saving}>
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </>
        }>
        <form onSubmit={handleCreateTask}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input placeholder="What needs to be done?" value={taskForm.title}
              onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea rows={3} placeholder="Add more context…" value={taskForm.description}
              onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select value={taskForm.assignee_id} onChange={e => setTaskForm(p => ({ ...p, assignee_id: e.target.value }))}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={showAddMember} onClose={() => { setShowAddMember(false); setMemberSearch(''); setSearchResults([]); }} title="Add Team Member">
        <div style={{ position: 'relative' }} ref={searchRef}>
          <input placeholder="Search by name or email…" value={memberSearch}
            onChange={e => handleMemberSearch(e.target.value)} autoFocus />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(u => (
                <div className="search-result-item" key={u.id} onClick={() => handleAddMember(u)}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, backgroundColor: u.avatar_color || '#6366f1' }}>
                    {getInitials(u.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                  <span className={`badge badge-${u.role}`} style={{ marginLeft: 'auto' }}>{u.role}</span>
                </div>
              ))}
            </div>
          )}
          {memberSearch.length >= 2 && searchResults.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>No users found</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
