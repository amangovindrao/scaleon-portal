import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

export default function AdminLogin() {
  const { loginAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear any stale session when landing on admin login
  useEffect(() => {
    logout();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAdmin(form.email, form.password);
      navigate('/admin/dashboard');
    } catch {
      setError('Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.svg" alt="ScaleOn" style={{ height: 44, marginBottom: 8 }} />
          <p>Admin Portal</p>
        </div>
        <h2 className="auth-title">Admin Login</h2>
        <p className="auth-subtitle">Sign in to manage candidates and assessments</p>

        {error && <div className="alert alert-error mb-16">{error}</div>}

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="admin@thescaleon.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
            <Lock size={16} />
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
