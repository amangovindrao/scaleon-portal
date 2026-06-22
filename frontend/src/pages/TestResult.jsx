import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, LogOut } from 'lucide-react';
import api from '../api/client';

export default function TestResult() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStatus(); }, []);
  async function fetchStatus() {
    try { const { data } = await api.get('/proctor/status'); setStatus(data.status); }
    catch { setTimeout(fetchStatus, 1500); }
    finally { setLoading(false); }
  }

  function handleExit() {
    window.open('', '_self'); window.close();
    window.location.href = 'about:blank';
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner"></div></div>
  );

  const autoEnded = status === 'auto_submitted_warnings';

  return (
    <div className="results-page">
      <div className="results-card">
        <div className="auth-logo" style={{ marginBottom: 28 }}>
          <img src="/logo.svg" alt="ScaleOn" style={{ height: 40 }} />
        </div>

        {autoEnded ? (
          <>
            <div className="alert alert-warning mb-16">
              <AlertTriangle size={16} />
              Your test was auto-submitted due to proctoring violations. We will still consider your answers.
            </div>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Test Submitted</h1>
          </>
        ) : (
          <>
            <div className="flex gap-8 items-center justify-center mb-16" style={{ color: 'var(--success)' }}>
              <CheckCircle size={20} />
              <span style={{ fontWeight: 600 }}>Assessment Submitted Successfully</span>
            </div>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Thank You!</h1>
          </>
        )}

        <p className="text-muted text-sm" style={{ marginBottom: 4 }}>
          Your test is ended. You can now close this window.
        </p>
        <p className="text-muted text-sm">
          You will receive an email with further updates. Please wait for our mail.
        </p>

        {/* LinkedIn Follow */}
        <a
          href="https://www.linkedin.com/company/thescaleon/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline w-full mt-24"
          style={{ gap: 10 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          Follow ScaleOn on LinkedIn
        </a>

        <button className="btn btn-primary btn-lg w-full mt-16" onClick={handleExit}>
          <LogOut size={16} /> Exit Tab
        </button>

        <p className="text-xs text-muted mt-20" style={{ textAlign: 'center' }}>
          For queries, mail us at <a href="mailto:help@thescaleon.com" className="text-gold">help@thescaleon.com</a>
        </p>
      </div>
    </div>
  );
}
