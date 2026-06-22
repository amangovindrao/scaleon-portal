import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Shield, Camera, Volume2 } from 'lucide-react';
import api from '../api/client';

const SECTIONS = ['aptitude'];
const SECTION_LABELS = { aptitude: 'Aptitude' };
const OPTION_LETTERS = ['a', 'b', 'c', 'd'];
const FRAME_INTERVAL_MS = 30000; // lighter: every 30s
const COOLDOWN_SECONDS = 3; // 3 sec wait per new question

function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = 'square'; gain.gain.value = 0.25;
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 250);
  } catch {}
}

export default function TestExam() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [skippedQuestions, setSkippedQuestions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [candidateName, setCandidateName] = useState('');

  // Cooldown
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [canAnswer, setCanAnswer] = useState(false);
  const cooldownRef = useRef(null);
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));

  // Proctoring
  const [warnings, setWarnings] = useState(0);
  const [warningMsg, setWarningMsg] = useState('');
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [autoEnded, setAutoEnded] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [deadlineAlert, setDeadlineAlert] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const warningLockRef = useRef(false);
  const photoTaken27 = useRef(false);

  // Deadline: 5:20 PM IST June 22 2026
  const DEADLINE = new Date('2026-06-22T17:20:00+05:30').getTime();

  useEffect(() => {
    const iv = setInterval(() => {
      const now = Date.now();
      if (now >= DEADLINE) {
        clearInterval(iv);
        setDeadlineAlert('⏰ Time up! Submitting...');
        playAlertBeep();
        setTimeout(() => handleFinish(), 1500);
      } else if (DEADLINE - now <= 5 * 60000 && !deadlineAlert.includes('5 min')) {
        setDeadlineAlert('⚠️ Only 5 minutes left! Test auto-submits at 5:20 PM.');
        playAlertBeep();
      } else if (DEADLINE - now <= 20 * 60000 && !deadlineAlert) {
        const mins = Math.ceil((DEADLINE - now) / 60000);
        setDeadlineAlert(`⏰ ${mins} min remaining. Test closes at 5:20 PM.`);
        playAlertBeep();
      }
    }, 10000);
    return () => clearInterval(iv);
  }, [deadlineAlert]);

  useEffect(() => {
    if (Date.now() >= DEADLINE) { navigate('/test/result'); return; }
    enterFullscreen();
    initCam();
    loadSession();
    return () => cleanup();
  }, []);

  // Cooldown per question
  useEffect(() => {
    if (!questions.length) return;
    setVisitedQuestions(prev => new Set([...prev, currentQuestionIdx]));
    if (visitedQuestions.has(currentQuestionIdx)) {
      setCanAnswer(true); setCooldown(0); return;
    }
    setCanAnswer(false); setCooldown(COOLDOWN_SECONDS);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(p => {
        if (p <= 1) { clearInterval(cooldownRef.current); setCanAnswer(true); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [currentQuestionIdx, questions]);

  // Take photo at 27 minutes (33 min remaining from 60)
  useEffect(() => {
    if (timeLeft === 33 * 60 && !photoTaken27.current) {
      photoTaken27.current = true;
      capturePhoto('27min_checkpoint');
    }
  }, [timeLeft]);

  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  useEffect(() => {
    const fn = () => {
      if (!document.fullscreenElement && !autoEnded) handleViolation('fullscreen_exit', 'Exited fullscreen');
    };
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, [autoEnded]);

  useEffect(() => {
    const prevent = e => e.preventDefault();
    document.addEventListener('copy', prevent);
    document.addEventListener('cut', prevent);
    document.addEventListener('contextmenu', prevent);
    return () => { document.removeEventListener('copy', prevent); document.removeEventListener('cut', prevent); document.removeEventListener('contextmenu', prevent); };
  }, []);

  async function initCam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }
      setCamReady(true);
      // Take start photo after 2 sec (camera warm up)
      setTimeout(() => capturePhoto('test_start'), 2000);
      startFrameCapture();
    } catch {
      setCamReady(false);
    }
  }

  async function loadSession() {
    try {
      const { data } = await api.get('/proctor/status');
      setWarnings(data.warning_count);
      if (['submitted', 'auto_submitted_warnings', 'expired'].includes(data.status)) { navigate('/test/result'); return; }
      // Get candidate name
      try { const me = await api.get('/auth/me'); setCandidateName(me.data.name || ''); } catch {}
      await loadSection();
    } catch { navigate('/'); }
    finally { setLoading(false); }
  }

  async function loadSection() {
    try {
      const { data } = await api.get('/test/section/aptitude');
      setQuestions(data.questions);
      setAnswers({});
      setCurrentQuestionIdx(0);
      setSkippedQuestions(new Set());
      setVisitedQuestions(new Set([0]));
      setTimeLeft(data.time_limit_seconds);
      startCountdown(data.time_limit_seconds);
    } catch (err) { console.error(err); }
  }

  function startCountdown(seconds) {
    clearInterval(countdownRef.current);
    let rem = seconds;
    countdownRef.current = setInterval(async () => {
      rem -= 1; setTimeLeft(rem);
      if (rem <= 0) { clearInterval(countdownRef.current); await handleFinish(); }
    }, 1000);
  }

  function startFrameCapture() {
    clearInterval(frameTimerRef.current);
    frameTimerRef.current = setInterval(() => {
      // Just keep camera alive, no upload needed for performance
    }, FRAME_INTERVAL_MS);
  }

  // Capture and upload a photo at key moments
  async function capturePhoto(reason) {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 160; canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 160, 120);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const form = new FormData();
      form.append('file', blob, `${reason}.jpg`);
      form.append('reason', reason);
      try { await api.post('/proctor/frame', form, { headers: { 'Content-Type': 'multipart/form-data' } }); } catch {}
    }, 'image/jpeg', 0.4);
  }

  // Proctoring
  useEffect(() => {
    const onVis = () => { if (document.hidden) { playAlertBeep(); handleViolation('tab_switch', 'Tab switched'); } };
    const onBlur = () => { playAlertBeep(); handleViolation('window_blur', 'Window lost focus'); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onBlur); };
  }, []);

  async function handleViolation(type, detail) {
    if (warningLockRef.current || autoEnded) return;
    warningLockRef.current = true;
    setTimeout(() => { warningLockRef.current = false; }, 3000);
    capturePhoto(`warning_${type}`);
    await logProctorEvent(type, detail);
  }

  async function logProctorEvent(type, detail) {
    try {
      const { data } = await api.post('/proctor/event', { event_type: type, detail });
      setWarnings(data.warning_count);
      setWarningMsg(data.message);
      setShowWarningBanner(true);
      setTimeout(() => setShowWarningBanner(false), 6000);
      if (data.auto_submitted) { setAutoEnded(true); cleanup(); navigate('/test/result'); }
    } catch {}
  }

  async function selectAnswer(qId, opt) {
    if (!canAnswer) return;
    setAnswers(p => ({ ...p, [qId]: opt }));
    setSkippedQuestions(p => { const n = new Set(p); n.delete(currentQuestionIdx); return n; });
    try { await api.post('/test/answer', { question_id: qId, selected_option: opt }); } catch {}
  }

  function goToQuestion(idx) {
    if (idx === currentQuestionIdx) return;
    const q = questions[currentQuestionIdx];
    if (q && !answers[q.id]) setSkippedQuestions(p => new Set([...p, currentQuestionIdx]));
    setCurrentQuestionIdx(idx);
  }
  function handleNext() {
    const q = questions[currentQuestionIdx];
    if (q && !answers[q.id]) setSkippedQuestions(p => new Set([...p, currentQuestionIdx]));
    if (currentQuestionIdx < questions.length - 1) setCurrentQuestionIdx(p => p + 1);
  }
  function handlePrev() { if (currentQuestionIdx > 0) setCurrentQuestionIdx(p => p - 1); }

  async function handleFinish() {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(countdownRef.current); clearInterval(cooldownRef.current);
    capturePhoto('test_submit');
    try {
      await api.post('/test/finish');
      cleanup();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      navigate('/test/result');
    } catch { setSubmitting(false); }
  }

  function cleanup() {
    clearInterval(frameTimerRef.current); clearInterval(countdownRef.current); clearInterval(cooldownRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  function formatTime(s) {
    if (s == null) return '--:--';
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  }

  function getQStatus(idx) {
    const q = questions[idx];
    if (!q) return 'not-attempted';
    if (answers[q.id]) return 'answered';
    if (skippedQuestions.has(idx)) return 'skipped';
    return 'not-attempted';
  }

  const isUrgent = timeLeft != null && timeLeft < 120;
  const answeredCount = Object.keys(answers).length;
  const currentQ = questions[currentQuestionIdx];

  if (loading) return (
    <div className="exam-loading"><div className="glass-card" style={{padding:40,textAlign:'center'}}><div className="spinner"></div><p className="text-muted">Loading…</p></div></div>
  );

  return (
    <div className="exam-container" style={{ userSelect: 'none' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {showWarningBanner && (
        <div className="warning-banner">
          <div className="flex gap-8 items-center"><AlertTriangle size={16} />{warningMsg}</div>
          <button onClick={() => setShowWarningBanner(false)} className="warning-close">×</button>
        </div>
      )}

      {deadlineAlert && (
        <div className="gaze-alert-overlay">
          <div className="gaze-alert-box" style={{ background: 'rgba(245,158,11,0.95)' }}>
            <Clock size={18} /><span>{deadlineAlert}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="exam-header glass-header">
        <div className="exam-brand">
          <img src="/logo.svg" alt="ScaleOn" className="exam-logo" />
          <div className="exam-title-block">
            <h1 className="exam-title">ScaleOn Aptitude Round</h1>
            <span className="exam-subtitle">ScaleOn Internship Program 2026</span>
          </div>
        </div>
        <div className="exam-header-right">
          <div className="exam-timer-pill glass-pill">
            <Clock size={14} />
            <span className={`timer-text ${isUrgent ? 'urgent' : ''}`}>{formatTime(timeLeft)}</span>
          </div>
          <div className="exam-warning-pill glass-pill">
            <Shield size={14} /><span>{warnings}/3</span>
          </div>
        </div>
      </header>

      <div className="exam-body-split">
        {/* LEFT 80% */}
        <main className="exam-left">
          <div className="cooldown-bar-wrap">
            <div className="cooldown-bar">
              <div className={`cooldown-fill ${canAnswer ? 'ready' : ''}`} style={{ width: `${((COOLDOWN_SECONDS - cooldown) / COOLDOWN_SECONDS) * 100}%` }}></div>
            </div>
            <div className="cooldown-text">
              {canAnswer ? <span className="text-success">✓ You can answer now</span> : <span>Read the question… <strong className="cooldown-countdown">{cooldown}s</strong></span>}
            </div>
          </div>

          {currentQ && (
            <div className="question-display glass-card">
              <div className="question-header">
                <span className="question-badge">Q{currentQuestionIdx + 1} of {questions.length}</span>
                <span className="section-badge">Aptitude</span>
              </div>
              <div className="question-text">{currentQ.prompt}</div>
              <div className="options-grid">
                {OPTION_LETTERS.map(opt => (
                  <button key={opt} className={`exam-option ${answers[currentQ.id] === opt ? 'selected' : ''} ${!canAnswer ? 'disabled' : ''}`}
                    onClick={() => selectAnswer(currentQ.id, opt)} disabled={!canAnswer}>
                    <div className="option-marker">{opt.toUpperCase()}</div>
                    <span className="option-text">{currentQ[`option_${opt}`]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="exam-actions">
            <button className="btn btn-ghost" onClick={handlePrev} disabled={currentQuestionIdx === 0}>← Previous</button>
            {currentQuestionIdx < questions.length - 1
              ? <button className="btn btn-primary" onClick={handleNext}>Next →</button>
              : <button className="btn btn-primary btn-lg" onClick={handleFinish} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Test'}</button>
            }
          </div>
        </main>

        {/* RIGHT 20% */}
        <aside className="exam-right">
          {/* Candidate name */}
          {candidateName && (
            <div className="sidebar-section" style={{ textAlign: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{candidateName}</span>
            </div>
          )}

          {/* Camera */}
          <div className="sidebar-section">
            <div className="sidebar-section-title"><Camera size={12} /> Camera</div>
            <div className="webcam-preview">
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', display: 'block', borderRadius: 8 }} />
              {camReady && <div className="webcam-status"><div className="cam-dot active" />Live</div>}
            </div>
          </div>

          {/* Questions grid */}
          <div className="sidebar-section q-grid-box">
            <div className="sidebar-section-title">Questions</div>
            <div className="question-grid-scroll">
              {questions.map((q, idx) => (
                <button key={q.id} className={`q-num-btn ${getQStatus(idx)} ${idx === currentQuestionIdx ? 'active' : ''}`} onClick={() => goToQuestion(idx)}>{idx + 1}</button>
              ))}
            </div>
            <div className="q-legend">
              <div className="legend-item"><span className="legend-dot answered"></span>Answered</div>
              <div className="legend-item"><span className="legend-dot skipped"></span>Skipped</div>
              <div className="legend-item"><span className="legend-dot not-attempted"></span>Remaining</div>
            </div>
          </div>

          {/* Warnings */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Warnings</div>
            <div className="warning-pills">
              {[1,2,3].map(n => <div key={n} className={`warning-pill ${warnings >= n ? (n===3 ? 'fatal' : 'used') : ''}`}>{n}</div>)}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
