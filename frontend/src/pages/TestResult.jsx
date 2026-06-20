import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, LogOut } from 'lucide-react';
import api from '../api/client';

export default function TestResult() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    try {
      const { data: session } = await api.get('/proctor/status');
      setStatus(session.status);
    } catch {
      setTimeout(fetchStatus, 1500);
    } finally {
      setLoading(false);
    }
  }

  function handleExit() {
    // window.close() only works if the tab was opened by script
    // Fallback: navigate to a blank page then close
    window.open('', '_self');
    window.close();
    // If still open (browser blocked it), show about:blank
    window.location.href = 'about:blank';
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const autoEnded = status === 'auto_submitted_warnings';

  return (
    <div className="results-page">
      <div className="results-card">
        <div className="auth-logo" style={{ marginBottom: 28 }}>
          <img src="/logo.svg" alt="ScaleOn" style={{ height: 40 }} />
        </div>

        {autoEnded ? (
          <div className="alert alert-error mb-24">
            <AlertTriangle size={16} />
            Your test was ended automatically after 3 proctoring violations.
            Your answers up to that point have been saved.
          </div>
        ) : (
          <div className="flex gap-8 items-center justify-center mb-20"
            style={{ color: 'var(--success)' }}>
            <CheckCircle size={20} />
            <span style={{ fontWeight: 600 }}>Assessment Submitted Successfully</span>
          </div>
        )}

        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Thank You!</h1>
        <p className="text-muted text-sm" style={{ marginBottom: 4 }}>
          Your test is ended. You can now close this window.
        </p>
        <p className="text-muted text-sm">
          You will receive an email with further updates. Please wait for our mail.
        </p>

        {/* Exit button */}
        <button
          className="btn btn-primary btn-lg w-full mt-24"
          onClick={handleExit}
        >
          <LogOut size={16} />
          Exit Tab
        </button>

        <p className="text-xs text-muted mt-24" style={{ textAlign: 'center' }}>
          For any queries or issues related to the test, mail us at{' '}
          <a href="mailto:help@thescaleon.com" className="text-gold"
            style={{ fontWeight: 600 }}>help@thescaleon.com</a>
        </p>

        <p className="text-xs text-muted mt-8" style={{ textAlign: 'center' }}>
          Thank you for being a part of ScaleOn Internship Program 2026!
        </p>
      </div>
    </div>
  );
}
