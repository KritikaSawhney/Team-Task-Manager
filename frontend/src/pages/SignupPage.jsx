import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const res = await signup(form);
      loginUser(res.data.token, res.data.user);
      toast.success(`Account created! Welcome, ${res.data.user.name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.errors) {
        const errs = {};
        err.response.data.errors.forEach(e => { errs[e.path] = e.msg; });
        setErrors(errs);
      } else {
        setErrors({ general: err.response?.data?.error || 'Signup failed.' });
      }
    } finally {
      setLoading(false);
    }
  }

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-logo">⚡ TaskFlow</div>
          <div className="auth-brand-tagline">Create your free account and start managing projects in minutes.</div>
        </div>
        <div className="auth-features">
          {[
            ['🚀', 'Get started in under 2 minutes'],
            ['🔒', 'Choose Admin or Member role'],
            ['🤝', 'Invite your team instantly'],
            ['📈', 'Track progress visually'],
          ].map(([icon, text]) => (
            <div className="auth-feature" key={text}>
              <span className="auth-feature-icon">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join TaskFlow and boost your team's productivity</p>

          {errors.general && (
            <div style={{ background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20,
              color: 'var(--danger)', fontSize: 14 }}>
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input id="signup-name" type="text" placeholder="Jane Smith" value={form.name} onChange={set('name')} required />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input id="signup-email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input id="signup-password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select id="signup-role" value={form.role} onChange={set('role')}>
                <option value="member">👤 Member — Join & manage assigned tasks</option>
                <option value="admin">👑 Admin — Create projects, assign tasks, manage team</option>
              </select>
              {errors.role && <div className="form-error">{errors.role}</div>}
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}>
              {loading ? <><span className="spinner spinner-sm" /> Creating account…</> : 'Create Account →'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
