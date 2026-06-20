import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Monitor, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import api from '../api/client';

export default function TestReady() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [camOk, setCamOk] = useState(false);
  const [camError, setCamError] = useState('');
  const [stream, setStream] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    requestCam();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  async function requestCam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setCamOk(true);
    } catch {
      setCamError('Camera permission denied. You must allow camera access to take this test.');
    }
  }

  async function startTest() {
    if (!camOk) { setError('Please allow camera access first.'); return; }
    setStarting(true);
    try {
      await api.post('/test/start');
      // stop preview stream here — TestPage will acquire its own
      stream?.getTracks().forEach(t => t.stop());
      navigate('/test/exam');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start test.');
      setStarting(false);
    }
  }

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div className="auth-logo" style={{ textAlign: 'left', marginBottom: 24 }}>
          <img src="/logo.svg" alt="ScaleOn" style={{ height: 40 }} />
          <p style={{ marginTop: 6, fontSize: 13, color: 'var(--white-50)' }}>ScaleOn Internship Program 2026</p>
        </div>

        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Before You Begin</h1>
        <p className="text-muted mb-24">Read the instructions carefully before starting the ScaleOn Aptitude Round.</p>

        {/* Instructions */}
        <div className="card mb-20">
          <h3 style={{ fontSize: 15, marginBottom: 16, color: 'var(--gold)' }}>Assessment Structure</h3>
          <div className="flex flex-col gap-12">
            {[
              { label: 'Round 1 — Aptitude', desc: '4 questions · 20 minutes · Logical reasoning & quantitative' },
              { label: 'Round 2 — Coding MCQ', desc: '5 questions · 30 minutes · Role-specific technical knowledge' },
              { label: 'Round 3 — Case Study', desc: '3 questions · 25 minutes · Scenario-based problem solving' },
            ].map((r, i) => (
              <div key={i} className="flex gap-12 items-center">
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gold-muted)', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.label}</div>
                  <div className="text-xs text-muted">{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card mb-20">
          <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--gold)' }}>Proctoring Rules</h3>
          <div className="flex flex-col gap-10">
            {[
              { icon: Camera, text: 'Your webcam will be active throughout. Ensure your face is clearly visible.' },
              { icon: Monitor, text: 'The test runs in fullscreen mode. Do not exit fullscreen, switch tabs, or minimize the window.' },
              { icon: AlertTriangle, text: 'After 3 warnings, your test is auto-submitted with answers saved up to that point.' },
              { icon: Monitor, text: 'Each question has a 5-second timer. Answer quickly!' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex gap-10 items-center">
                <Icon size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--white-80)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Camera check */}
        <div className="card mb-24">
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>Camera Check</h3>
          {camError ? (
            <div className="alert alert-error">{camError}</div>
          ) : (
            <div className="webcam-preview" style={{ maxWidth: 280 }}>
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', borderRadius: 10 }} />
              <div className="webcam-status">
                <div className={`cam-dot ${camOk ? 'active' : ''}`} />
                {camOk ? 'Camera active' : 'Connecting…'}
              </div>
            </div>
          )}
          {camOk && (
            <div className="flex gap-8 items-center mt-12">
              <CheckCircle size={15} style={{ color: 'var(--success)' }} />
              <span className="text-sm text-success">Camera is working. You're ready.</span>
            </div>
          )}
        </div>

        {error && <div className="alert alert-error mb-16">{error}</div>}

        <button
          className="btn btn-primary btn-lg w-full"
          onClick={startTest}
          disabled={!camOk || starting}
        >
          {starting ? 'Starting…' : 'Start Assessment'}
          <ChevronRight size={16} />
        </button>

        <p className="text-xs text-muted mt-16" style={{ textAlign: 'center' }}>
          By starting, you agree to the proctoring terms above. This session will be recorded.
        </p>
      </div>
    </div>
  );
}
