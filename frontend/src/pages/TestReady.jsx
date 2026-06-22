import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Monitor, AlertTriangle, CheckCircle, ChevronRight, Clock, Shield, BookOpen } from 'lucide-react';
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
    // Check deadline
    const DEADLINE = new Date('2026-06-22T17:20:00+05:30').getTime();
    if (Date.now() >= DEADLINE) {
      setError('The test window has closed (5:20 PM deadline passed). You can no longer start the test.');
      return;
    }
    if (!camOk) { setError('Please allow camera access first.'); return; }
    setStarting(true);
    try {
      await api.post('/test/start');
      stream?.getTracks().forEach(t => t.stop());
      navigate('/test/exam');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start test.');
      setStarting(false);
    }
  }

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 48 }}>
      <div style={{ width: '100%', maxWidth: 620 }}>
        <div className="auth-logo" style={{ textAlign: 'left', marginBottom: 24 }}>
          <img src="/logo.svg" alt="ScaleOn" style={{ height: 40 }} />
          <p style={{ marginTop: 6, fontSize: 13, color: 'var(--white-50)' }}>ScaleOn Internship Program 2026</p>
        </div>

        <h1 style={{ fontSize: 26, marginBottom: 8 }}>Assessment Instructions</h1>
        <p className="text-muted mb-24">Read carefully before starting. You cannot pause once the test begins.</p>

        {/* Test Overview */}
        <div className="card mb-16">
          <h3 style={{ fontSize: 15, marginBottom: 16, color: 'var(--gold)' }}>
            <BookOpen size={14} style={{ display: 'inline', marginRight: 8 }} />
            Test Overview
          </h3>
          <div className="flex flex-col gap-12">
            <div className="flex gap-12 items-center">
              <Clock size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Duration: 60 Minutes</div>
                <div className="text-xs text-muted">Timer starts when you click "Start Assessment"</div>
              </div>
            </div>
            <div className="flex gap-12 items-center">
              <BookOpen size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>50 MCQ Questions</div>
                <div className="text-xs text-muted">Aptitude based — Percentage, Ratio, Profit/Loss, Probability, Speed, Reasoning</div>
              </div>
            </div>
            <div className="flex gap-12 items-center">
              <Shield size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>AI Proctored</div>
                <div className="text-xs text-muted">Camera monitored, tab-switch detection, fullscreen required</div>
              </div>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="card mb-16">
          <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--gold)' }}>Rules & Guidelines</h3>
          <div className="flex flex-col gap-10">
            {[
              { icon: Camera, text: 'Keep your webcam ON throughout. Your face must be clearly visible.' },
              { icon: Monitor, text: 'Test runs in fullscreen. Do not exit fullscreen, switch tabs, or open other apps.' },
              { icon: AlertTriangle, text: '3 warnings = test auto-submitted. Tab switch, minimizing, or covering camera counts as a warning.' },
              { icon: Clock, text: 'Each question has a 5-second reading period before you can answer.' },
              { icon: Shield, text: 'You can navigate between questions freely. Unanswered questions remain available until submission.' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex gap-10 items-center">
                <Icon size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--white-80)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Camera check */}
        <div className="card mb-20">
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>Camera Check</h3>
          {camError ? (
            <div className="alert alert-error">{camError}</div>
          ) : (
            <div className="webcam-preview" style={{ maxWidth: 260 }}>
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
              <span className="text-sm text-success">Camera is working. You're ready to begin.</span>
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
          By clicking Start, you agree to the proctoring rules. This session will be recorded.
        </p>
      </div>
    </div>
  );
}
