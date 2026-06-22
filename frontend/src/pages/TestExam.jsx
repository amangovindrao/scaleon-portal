import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Shield, Camera, Volume2 } from 'lucide-react';
import api from '../api/client';

const SECTIONS = ['aptitude', 'coding', 'case_study'];
const SECTION_LABELS = { aptitude: 'Aptitude', coding: 'Coding MCQ', case_study: 'Case Study' };
const OPTION_LETTERS = ['a', 'b', 'c', 'd'];
const FRAME_INTERVAL_MS = 15000; // capture every 15s (lightweight)
const COOLDOWN_SECONDS = 5;

// Alert beep sound using Web Audio API
function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'square';
    gainNode.gain.value = 0.3;
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, 300);
    // Second beep after short pause
    setTimeout(() => {
      const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
      const osc2 = ctx2.createOscillator();
      const gain2 = ctx2.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx2.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'square';
      gain2.gain.value = 0.3;
      osc2.start();
      setTimeout(() => { osc2.stop(); ctx2.close(); }, 200);
    }, 400);
  } catch {}
}

export default function TestExam() {
  const navigate = useNavigate();

  // Session / test state
  const [session, setSession] = useState(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [skippedQuestions, setSkippedQuestions] = useState(new Set());
  const [sectionDone, setSectionDone] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cooldown
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [canAnswer, setCanAnswer] = useState(false);
  const cooldownRef = useRef(null);
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));

  // Face/gaze detection
  const [showFaceWarning, setShowFaceWarning] = useState(false);
  const [gazeAlert, setGazeAlert] = useState('');
  const gazeAlertCooldown = useRef(false);

  // Proctoring state
  const [warnings, setWarnings] = useState(0);
  const [warningMsg, setWarningMsg] = useState('');
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [autoEnded, setAutoEnded] = useState(false);
  const [camReady, setCamReady] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const warningLockRef = useRef(false);

  // Init
  useEffect(() => {
    enterFullscreen();
    initCam();
    loadSession();
    return () => cleanup();
  }, []);

  // Cooldown - skip for visited questions
  useEffect(() => {
    if (questions.length === 0) return;
    setVisitedQuestions(prev => new Set([...prev, currentQuestionIdx]));
    if (visitedQuestions.has(currentQuestionIdx)) {
      setCanAnswer(true);
      setCooldown(0);
      clearInterval(cooldownRef.current);
      return;
    }
    setCanAnswer(false);
    setCooldown(COOLDOWN_SECONDS);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          setCanAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [currentQuestionIdx, questions]);

  // Fullscreen
  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
    setIsFullscreen(true);
  }

  useEffect(() => {
    function onFullscreenChange() {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && !autoEnded) {
        handleViolation('fullscreen_exit', 'Exited fullscreen mode');
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [autoEnded]);

  // Disable copy/paste/right-click
  useEffect(() => {
    function preventCopy(e) { e.preventDefault(); }
    function preventContext(e) { e.preventDefault(); }
    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('contextmenu', preventContext);
    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('contextmenu', preventContext);
    };
  }, []);

  async function initCam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setCamReady(true);
      startFrameCapture();
    } catch {
      logProctorEvent('camera_blocked', 'Camera access was denied or revoked');
    }
  }

  async function loadSession() {
    try {
      const { data } = await api.get('/proctor/status');
      setSession(data);
      setWarnings(data.warning_count);
      if (['submitted', 'auto_submitted_warnings', 'expired'].includes(data.status)) {
        navigate('/test/result');
        return;
      }
      const idx = SECTIONS.indexOf(data.current_section);
      const resumeIdx = idx >= 0 ? idx : 0;
      setCurrentSectionIdx(resumeIdx);
      setSectionDone(SECTIONS.slice(0, resumeIdx));
      await loadSection(resumeIdx);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function loadSection(idx) {
    const section = SECTIONS[idx];
    try {
      const { data } = await api.get(`/test/section/${section}`);
      setQuestions(data.questions);
      setAnswers({});
      setCurrentQuestionIdx(0);
      setSkippedQuestions(new Set());
      setVisitedQuestions(new Set([0]));
      setTimeLeft(data.time_limit_seconds);
      startCountdown(data.time_limit_seconds, idx);
    } catch (err) {
      console.error('Failed to load section', err);
    }
  }

  function startCountdown(seconds, sectionIdx) {
    clearInterval(countdownRef.current);
    let remaining = seconds;
    countdownRef.current = setInterval(async () => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        // Time's up — auto submit
        await handleFinish();
      }
    }, 1000);
  }

  function startFrameCapture() {
    clearInterval(frameTimerRef.current);
    frameTimerRef.current = setInterval(captureAndUploadFrame, FRAME_INTERVAL_MS);
  }

  async function captureAndUploadFrame() {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 320, 240);

    // Only warn if camera is fully blocked (completely dark/covered)
    const imageData = ctx.getImageData(0, 0, 320, 240).data;
    let totalBrightness = 0;
    const sampleStep = 40; // sample every 40th pixel for performance
    let sampleCount = 0;
    for (let i = 0; i < imageData.length; i += sampleStep * 4) {
      totalBrightness += (imageData[i] + imageData[i+1] + imageData[i+2]) / 3;
      sampleCount++;
    }
    const avgBrightness = totalBrightness / sampleCount;

    // Only show warning if camera is covered/blocked (very dark)
    if (avgBrightness < 10 && !gazeAlertCooldown.current) {
      setShowFaceWarning(true);
      triggerGazeAlert('⚠️ Camera appears blocked. Please stay visible.');
    } else if (avgBrightness >= 10) {
      setShowFaceWarning(false);
    }

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const form = new FormData();
      form.append('file', blob, 'frame.jpg');
      try {
        await api.post('/proctor/frame', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch {}
    }, 'image/jpeg', 0.5);
  }

  function triggerGazeAlert(message) {
    gazeAlertCooldown.current = true;
    setGazeAlert(message);
    playAlertBeep();
    setTimeout(() => {
      setGazeAlert('');
      gazeAlertCooldown.current = false;
    }, 8000); // 8 second cooldown between alerts
  }

  // Proctoring: tab-switch / blur detection with beep
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        playAlertBeep();
        handleViolation('tab_switch', 'Candidate switched tabs or minimized window');
      }
    }
    function onBlur() {
      playAlertBeep();
      handleViolation('window_blur', 'Browser window lost focus');
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Detect phone usage (device orientation change on mobile)
  useEffect(() => {
    function onOrientationChange() {
      playAlertBeep();
      triggerGazeAlert('📱 Phone usage detected! Stay focused on screen.');
    }
    window.addEventListener('orientationchange', onOrientationChange);
    return () => window.removeEventListener('orientationchange', onOrientationChange);
  }, []);

  async function handleViolation(eventType, detail) {
    if (warningLockRef.current || autoEnded) return;
    warningLockRef.current = true;
    setTimeout(() => { warningLockRef.current = false; }, 3000);
    await logProctorEvent(eventType, detail);
  }

  async function logProctorEvent(eventType, detail) {
    try {
      const { data } = await api.post('/proctor/event', { event_type: eventType, detail });
      setWarnings(data.warning_count);
      setWarningMsg(data.message);
      setShowWarningBanner(true);
      setTimeout(() => setShowWarningBanner(false), 6000);
      if (data.auto_submitted) {
        setAutoEnded(true);
        cleanup();
        navigate('/test/result');
      }
    } catch {}
  }

  // Answer selection
  async function selectAnswer(questionId, option) {
    if (!canAnswer) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    setSkippedQuestions(prev => {
      const next = new Set(prev);
      next.delete(currentQuestionIdx);
      return next;
    });
    try {
      await api.post('/test/answer', { question_id: questionId, selected_option: option });
    } catch {}
  }

  // Navigation
  function goToQuestion(idx) {
    if (idx === currentQuestionIdx) return;
    const currentQ = questions[currentQuestionIdx];
    if (currentQ && !answers[currentQ.id]) {
      setSkippedQuestions(prev => new Set([...prev, currentQuestionIdx]));
    }
    setCurrentQuestionIdx(idx);
  }

  function handleNext() {
    const currentQ = questions[currentQuestionIdx];
    if (currentQ && !answers[currentQ.id]) {
      setSkippedQuestions(prev => new Set([...prev, currentQuestionIdx]));
    }
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    }
  }

  function handlePrev() {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(prev => prev - 1);
    }
  }

  // Section advancement
  async function advanceSection(idx) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/test/advance-section');
      if (['submitted', 'auto_submitted_warnings'].includes(data.status)) {
        cleanup();
        navigate('/test/result');
        return;
      }
      const nextIdx = SECTIONS.indexOf(data.current_section);
      setSectionDone(prev => [...prev, SECTIONS[idx]]);
      setCurrentSectionIdx(nextIdx);
      await loadSection(nextIdx);
    } catch (err) {
      console.error('Failed to advance section', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish() {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(countdownRef.current);
    clearInterval(cooldownRef.current);
    try {
      await api.post('/test/finish');
      cleanup();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      navigate('/test/result');
    } catch {
      setSubmitting(false);
    }
  }

  function cleanup() {
    clearInterval(frameTimerRef.current);
    clearInterval(countdownRef.current);
    clearInterval(cooldownRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }

  function formatTime(secs) {
    if (secs == null) return '--:--';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function getQuestionStatus(idx) {
    const q = questions[idx];
    if (!q) return 'not-attempted';
    if (answers[q.id]) return 'answered';
    if (skippedQuestions.has(idx)) return 'skipped';
    return 'not-attempted';
  }

  const isUrgent = timeLeft != null && timeLeft < 120;
  const currentSection = SECTIONS[currentSectionIdx];
  const answeredCount = Object.keys(answers).length;
  const isLastSection = currentSectionIdx === SECTIONS.length - 1;
  const currentQ = questions[currentQuestionIdx];

  if (loading) {
    return (
      <div className="exam-loading">
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="spinner"></div>
          <p className="text-muted">Loading your assessment…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-container" style={{ userSelect: 'none' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Gaze/Face alert overlay */}
      {gazeAlert && (
        <div className="gaze-alert-overlay">
          <div className="gaze-alert-box">
            <Volume2 size={20} />
            <span>{gazeAlert}</span>
          </div>
        </div>
      )}

      {/* Warning banner */}
      {showWarningBanner && (
        <div className="warning-banner">
          <div className="flex gap-8 items-center">
            <AlertTriangle size={16} />
            {warningMsg}
          </div>
          <button onClick={() => setShowWarningBanner(false)} className="warning-close">×</button>
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
            <Shield size={14} />
            <span>{warnings}/3</span>
          </div>
        </div>
      </header>

      <div className="exam-body-split">
        {/* LEFT: 57% - Question area */}
        <main className="exam-left">
          {/* Cooldown bar */}
          <div className="cooldown-bar-wrap">
            <div className="cooldown-bar">
              <div
                className={`cooldown-fill ${canAnswer ? 'ready' : ''}`}
                style={{ width: `${((COOLDOWN_SECONDS - cooldown) / COOLDOWN_SECONDS) * 100}%` }}
              ></div>
            </div>
            <div className="cooldown-text">
              {canAnswer ? (
                <span className="text-success">✓ You can answer now</span>
              ) : (
                <span>Please read the question… <strong className="cooldown-countdown">{cooldown}s</strong></span>
              )}
            </div>
          </div>

          {currentQ && (
            <div className="question-display glass-card">
              <div className="question-header">
                <span className="question-badge">Question {currentQuestionIdx + 1} of {questions.length}</span>
                <span className="section-badge">{SECTION_LABELS[currentSection]}</span>
              </div>
              <div className="question-text">{currentQ.prompt}</div>
              <div className="options-grid">
                {OPTION_LETTERS.map(opt => (
                  <button
                    key={opt}
                    className={`exam-option ${answers[currentQ.id] === opt ? 'selected' : ''} ${!canAnswer ? 'disabled' : ''}`}
                    onClick={() => selectAnswer(currentQ.id, opt)}
                    disabled={!canAnswer}
                  >
                    <div className="option-marker">{opt.toUpperCase()}</div>
                    <span className="option-text">{currentQ[`option_${opt}`]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="exam-actions">
            <button className="btn btn-ghost" onClick={handlePrev} disabled={currentQuestionIdx === 0}>
              ← Previous
            </button>
            {currentQuestionIdx < questions.length - 1 ? (
              <button className="btn btn-primary" onClick={handleNext}>Next →</button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={handleFinish} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Test'}
              </button>
            )}
          </div>
        </main>

        {/* RIGHT: 43% - Sidebar with question grid, camera, warnings */}
        <aside className="exam-right">
          {/* Question numbers in scrollable box */}
          <div className="sidebar-section q-grid-box">
            <div className="sidebar-section-title">Questions</div>
            <div className="question-grid-scroll">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  className={`q-num-btn ${getQuestionStatus(idx)} ${idx === currentQuestionIdx ? 'active' : ''}`}
                  onClick={() => goToQuestion(idx)}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="q-legend">
              <div className="legend-item"><span className="legend-dot answered"></span> Answered</div>
              <div className="legend-item"><span className="legend-dot skipped"></span> Skipped</div>
              <div className="legend-item"><span className="legend-dot not-attempted"></span> Not Attempted</div>
            </div>
            <div className="q-stats-line">
              <span className="text-success">{answeredCount} answered</span>
              <span className="text-muted">·</span>
              <span>{questions.length - answeredCount} remaining</span>
            </div>
          </div>

          {/* Live webcam */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <Camera size={12} /> Live Camera
            </div>
            <div className="webcam-preview">
              <video ref={videoRef} autoPlay muted playsInline />
              <div className="webcam-status">
                <div className={`cam-dot ${camReady ? 'active' : ''}`} />
                {camReady ? 'Recording' : 'No camera'}
              </div>
            </div>
            {showFaceWarning && (
              <div className="face-warning">
                <AlertTriangle size={12} />
                <span>Please stay in the camera frame</span>
              </div>
            )}
          </div>

          {/* Warning counter */}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Warnings</div>
            <div className="warning-pills">
              {[1, 2, 3].map(n => (
                <div key={n} className={`warning-pill ${warnings >= n ? (n === 3 ? 'fatal' : 'used') : ''}`}>
                  {n}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted" style={{ marginTop: 8 }}>
              {warnings === 0 && 'No violations yet. Stay focused.'}
              {warnings === 1 && '1 warning. 2 remaining.'}
              {warnings === 2 && '⚠️ Final warning! Next ends your test.'}
              {warnings >= 3 && '🔴 Test ended.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
