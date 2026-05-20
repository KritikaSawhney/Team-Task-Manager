import { format, isPast, isToday } from 'date-fns';
import { updateTaskStatus } from '../api/tasks';
import toast from 'react-hot-toast';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const PRIORITY_DOT = { high: '🔴', medium: '🟡', low: '🟢' };

export default function TaskCard({ task, onClick, onStatusChange }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  async function handleStatusCycle(e) {
    e.stopPropagation();
    const cycle = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    const next = cycle[task.status];
    try {
      await updateTaskStatus(task.id, next);
      onStatusChange?.(task.id, next);
      toast.success(`Status → ${STATUS_LABELS[next]}`);
    } catch {
      toast.error('Failed to update status');
    }
  }

  return (
    <div className="task-card" onClick={() => onClick?.(task)}>
      <div className="task-card-header">
        <div className="task-card-title">{task.title}</div>
        <span title="Click to cycle status" onClick={handleStatusCycle} style={{ cursor: 'pointer', fontSize: 16 }}>
          {task.status === 'todo' ? '⬜' : task.status === 'in_progress' ? '🔄' : '✅'}
        </span>
      </div>

      {task.description && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {task.description}
        </p>
      )}

      <div className="task-card-meta">
        <span title={`Priority: ${task.priority}`}>{PRIORITY_DOT[task.priority]}</span>
        <span className={`badge badge-${task.status}`} style={{ fontSize: 10 }}>
          {STATUS_LABELS[task.status]}
        </span>

        {task.due_date && (
          <span className={`task-due ${isOverdue ? 'overdue' : ''}`}>
            📅 {isOverdue ? '⚠ ' : isDueToday ? '⏰ ' : ''}
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}

        {task.assignee_name && (
          <div className="task-assignee" style={{ marginLeft: 'auto' }}>
            <div
              className="avatar"
              style={{ width: 22, height: 22, fontSize: 9, backgroundColor: task.assignee_avatar_color || '#6366f1' }}
              title={task.assignee_name}
            >
              {getInitials(task.assignee_name)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
