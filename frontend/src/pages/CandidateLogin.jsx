import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Key } from 'lucide-react';

export default function CandidateLogin() {
  const { loginCandidate, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', access_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { logout(); }, []);

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
          <img src="/logo.svg" alt="ScaleOn" style={{ height: 48, marginBottom: 10 }} />
          <p style={{ fontSize: 13 }}>ScaleOn Internship Program 2026</p>
          <p style={{ fontSize: 11, color: 'var(--white-30)', marginTop: 4 }}>Aptitude Assessment Portal</p>
        </div>

        <h2 className="auth-title" style={{ textAlign: 'center' }}>Welcome, Candidate</h2>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>Enter your credentials to begin the assessment</p>

        {error && <div className="alert alert-error mb-16">{error}</div>}

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <Mail size={12} style={{ display: 'inline', marginRight: 6 }} />
              Email Address
            </label>
            <input className="input" type="email" placeholder="you@email.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">
              <Key size={12} style={{ display: 'inline', marginRight: 6 }} />
              Access Code
            </label>
            <input className="input" type="text" placeholder="e.g. SC-2026-XXXX"
              value={form.access_code} onChange={e => setForm(f => ({ ...f, access_code: e.target.value }))} required />
          </div>
          <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
            <User size={16} />
            {loading ? 'Logging in…' : 'Enter Assessment'}
          </button>
        </form>

        <p className="text-xs text-muted mt-24" style={{ textAlign: 'center' }}>
          Need help? Mail us at <a href="mailto:help@thescaleon.com" className="text-gold">help@thescaleon.com</a>
        </p>
      </div>
    </div>
  );
}
