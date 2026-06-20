import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User } from 'lucide-react';

export default function CandidateLogin() {
  const { loginCandidate, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', access_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear any stale session
  useEffect(() => {
    logout();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginCandidate(form.email, form.access_code);
      navigate('/test/ready');
    } catch {
      setError('Incorrect email or access code. Contact the ScaleOn team if you need help.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.svg" alt="ScaleOn" style={{ height: 44, marginBottom: 8 }} />
          <p>ScaleOn Internship Program 2026</p>
        </div>
        <h2 className="auth-title">Candidate Login</h2>
        <p className="auth-subtitle">Enter your email and the access code shared by the ScaleOn team</p>

        {error && <div className="alert alert-error mb-16">{error}</div>}

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="input" type="email" placeholder="you@email.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Access Code</label>
            <input className="input" type="text" placeholder="e.g. SC-2024-XXXX"
              value={form.access_code} onChange={e => setForm(f => ({ ...f, access_code: e.target.value }))} required />
          </div>
          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
            <User size={16} />
            {loading ? 'Logging in…' : 'Enter Portal'}
          </button>
        </form>

      </div>
    </div>
  );
}
