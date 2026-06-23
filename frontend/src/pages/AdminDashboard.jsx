import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Users, BookOpen, BarChart2, LogOut, Plus, Trash2, Eye, ChevronDown, Settings } from 'lucide-react';

const SECTIONS = ['aptitude', 'coding', 'case_study'];
const SECTION_LABELS = { aptitude: 'Aptitude', coding: 'Coding MCQ', case_study: 'Case Study' };
const STATUS_BADGE = {
  not_started: 'badge-neutral',
  in_progress: 'badge-warning',
  submitted: 'badge-success',
  auto_submitted_warnings: 'badge-danger',
  expired: 'badge-danger',
};
const STATUS_LABEL = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  auto_submitted_warnings: 'Auto-Ended',
  expired: 'Expired',
};

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [tab, setTab] = useState('candidates');
  const [roles, setRoles] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filterRole, setFilterRole] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [newCandidate, setNewCandidate] = useState({ name: '', email: '', access_code: '', role_id: '' });
  const [newQ, setNewQ] = useState({ role_id: '', section: 'aptitude', prompt: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', points: 1, order_index: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewSession, setViewSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [proctorEvents, setProctorEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [testStart, setTestStart] = useState('');
  const [testEnd, setTestEnd] = useState('');

  useEffect(() => { fetchAll(); fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      const { data } = await api.get('/admin/settings');
      // Convert ISO to local datetime-local format for input
      setTestStart(toLocalInput(data.test_start));
      setTestEnd(toLocalInput(data.test_end));
    } catch {}
  }

  function toLocalInput(isoStr) {
    // Convert ISO string to 'YYYY-MM-DDTHH:mm' for datetime-local input (IST)
    const d = new Date(isoStr);
    const ist = new Date(d.getTime() + (5.5 * 60 * 60 * 1000 - d.getTimezoneOffset() * 60 * 1000));
    return ist.toISOString().slice(0, 16);
  }

  async function saveSettings() {
    // Convert local input to IST ISO string
    const startISO = testStart + ':00+05:30';
    const endISO = testEnd + ':00+05:30';
    try {
      await api.post('/admin/settings', { test_start: startISO, test_end: endISO });
      flash('Test window updated!');
    } catch { flash('Failed to save settings', true); }
  }

  async function fetchAll() {
    const [r, c, q] = await Promise.all([
      api.get('/admin/roles'),
      api.get('/admin/candidates'),
      api.get('/admin/questions'),
    ]);
    setRoles(r.data);
    setCandidates(c.data);
    setQuestions(q.data);
  }

  function flash(msg, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
  }

  async function addCandidate(e) {
    e.preventDefault();
    const names = newCandidate.name.split(',').map(n => n.trim()).filter(Boolean);
    const emails = newCandidate.email.split(',').map(n => n.trim()).filter(Boolean);
    const prefix = newCandidate.access_code.trim();
    const roleId = Number(newCandidate.role_id);

    if (names.length !== emails.length) {
      flash('Number of names and emails must match', true);
      return;
    }

    let added = 0;
    for (let i = 0; i < names.length; i++) {
      const code = `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      try {
        await api.post('/admin/candidates', { name: names[i], email: emails[i], access_code: code, role_id: roleId });
        added++;
      } catch (err) {
        flash(`Failed: ${emails[i]} — ${err.response?.data?.detail || 'Error'}`, true);
      }
    }
    if (added > 0) flash(`${added} candidate(s) added successfully`);
    setNewCandidate({ name: '', email: '', access_code: '', role_id: '' });
    fetchAll();
  }

  async function deleteCandidate(id) {
    if (!confirm('Remove this candidate?')) return;
    await api.delete(`/admin/candidates/${id}`);
    flash('Candidate removed');
    fetchAll();
  }

  async function addQuestion(e) {
    e.preventDefault();
    try {
      await api.post('/admin/questions', { ...newQ, role_id: Number(newQ.role_id), points: Number(newQ.points), order_index: Number(newQ.order_index) });
      setNewQ({ role_id: '', section: 'aptitude', prompt: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', points: 1, order_index: 0 });
      flash('Question added');
      fetchAll();
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to add question', true);
    }
  }

  async function deleteQuestion(id) {
    if (!confirm('Delete this question?')) return;
    await api.delete(`/admin/questions/${id}`);
    flash('Question deleted');
    fetchAll();
  }

  async function openSession(sessionId) {
    setLoadingEvents(true);
    setViewSession(sessionId);
    setSessionDetail(null);
    try {
      const { data } = await api.get(`/admin/sessions/${sessionId}`);
      setSessionDetail(data);
      setProctorEvents(data.proctor_events || []);
    } catch {
      setSessionDetail(null);
      setProctorEvents([]);
    }
    setLoadingEvents(false);
  }

  const filteredQ = questions.filter(q =>
    (!filterRole || q.role_id === Number(filterRole)) &&
    (!filterSection || q.section === filterSection)
  );

  const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));

  const stats = {
    total: candidates.length,
    done: candidates.filter(c => ['submitted', 'auto_submitted_warnings'].includes(c.session_status)).length,
    flagged: candidates.filter(c => c.warning_count >= 2).length,
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/logo.svg" alt="ScaleOn" style={{ height: 28 }} />
          <div className="tagline">Admin Panel</div>
        </div>
        <nav>
          {[
            { id: 'candidates', label: 'Candidates', icon: Users },
            { id: 'questions', label: 'Questions', icon: BookOpen },
            { id: 'results', label: 'Results', icon: BarChart2 },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '0 12px 12px' }}>
          <button className="nav-item" onClick={logout}><LogOut size={16} />Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {error && <div className="alert alert-error" style={{ margin: '16px 40px 0' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ margin: '16px 40px 0' }}>{success}</div>}

        {/* ── Candidates Tab ── */}
        {tab === 'candidates' && (
          <>
            <div className="page-header">
              <h1>Candidates</h1>
              <p>Add and manage internship applicants</p>
              <div className="flex gap-12 mt-8">
                <button className="btn btn-outline btn-sm" onClick={async () => {
                  const token = localStorage.getItem('token');
                  const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/admin/export/csv', {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'scaleon_candidates.csv'; a.click();
                }}>⬇ Download Results (CSV)</button>
                <button className="btn btn-outline btn-sm" onClick={() => {
                  const rows = [['Name', 'Email', 'Access Code', 'Role']];
                  candidates.forEach(c => rows.push([c.name, c.email, c.access_code || '', c.role_name || '']));
                  const csv = rows.map(r => r.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'scaleon_credentials.csv'; a.click();
                }}>⬇ Download Credentials</button>
                <button className="btn btn-outline btn-sm" onClick={async () => {
                  const token = localStorage.getItem('token');
                  const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/admin/photos/download', {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (!res.ok) { alert('No photos found yet'); return; }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'scaleon_photos.zip'; a.click();
                }}>📷 Download Photos (ZIP)</button>
              </div>
            </div>
            <div className="page-body">
              <div className="stats-row">
                <div className="stat-card stat-gold"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Candidates</div></div>
                <div className="stat-card"><div className="stat-value text-success">{stats.done}</div><div className="stat-label">Completed</div></div>
                <div className="stat-card"><div className="stat-value text-danger">{stats.flagged}</div><div className="stat-label">Flagged (2+ Warnings)</div></div>
              </div>

              {/* Add form */}
              <div className="card mb-24">
                <h3 className="mb-16" style={{ fontSize: '15px' }}>Add Candidates</h3>
                <form onSubmit={addCandidate}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Full Name (comma-separated for bulk)</label>
                      <input className="input" placeholder="Riya Sharma, Aman Singh, Priya Patel" value={newCandidate.name}
                        onChange={e => setNewCandidate(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email (comma-separated for bulk)</label>
                      <input className="input" type="text" placeholder="riya@email.com, aman@email.com" value={newCandidate.email}
                        onChange={e => setNewCandidate(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Code Prefix (auto-generates unique codes)</label>
                      <input className="input" placeholder="e.g. SC-2026" value={newCandidate.access_code}
                        onChange={e => setNewCandidate(f => ({ ...f, access_code: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="input" value={newCandidate.role_id}
                        onChange={e => setNewCandidate(f => ({ ...f, role_id: e.target.value }))} required>
                        <option value="">Select role…</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-8">For bulk: enter multiple names and emails separated by commas. Each gets a unique access code (prefix + random).</p>
                  <button className="btn btn-primary mt-16" type="submit"><Plus size={15} />Add Candidate(s)</button>
                </form>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th><th>Email</th><th>Access Code</th><th>Role</th><th>Status</th>
                        <th>Score</th><th>Warnings</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--white-50)', padding: '32px' }}>No candidates yet. Add one above.</td></tr>
                      )}
                      {candidates.map(c => (
                        <tr key={c.id}>
                          <td className="font-semibold">{c.name}</td>
                          <td className="text-muted text-sm">{c.email}</td>
                          <td><code style={{ fontSize: 11, background: 'var(--white-08)', padding: '2px 6px', borderRadius: 4 }}>{c.access_code || '—'}</code></td>
                          <td><span className="badge badge-gold">{c.role_name || '—'}</span></td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[c.session_status] || 'badge-neutral'}`}>
                              {STATUS_LABEL[c.session_status] || 'Not Started'}
                            </span>
                          </td>
                          <td>
                            {c.total_score != null
                              ? <span className="text-gold font-semibold">{c.total_score}/{c.max_score}</span>
                              : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            {c.warning_count != null ? (
                              <span className={`badge ${c.warning_count >= 3 ? 'badge-danger' : c.warning_count >= 1 ? 'badge-warning' : 'badge-neutral'}`}>
                                {c.warning_count}/3
                              </span>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            <div className="flex gap-8">
                              {c.session_id && (
                                <button className="btn btn-ghost btn-sm" onClick={() => openSession(c.session_id)}>
                                  <Eye size={13} />Review
                                </button>
                              )}
                              <button className="btn btn-danger btn-sm" onClick={() => deleteCandidate(c.id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Questions Tab ── */}
        {tab === 'questions' && (
          <>
            <div className="page-header">
              <h1>Question Bank</h1>
              <p>Manage MCQ questions per role and section</p>
            </div>
            <div className="page-body">
              {/* Add form */}
              <div className="card mb-24">
                <h3 className="mb-16" style={{ fontSize: '15px' }}>Add New Question</h3>
                <form onSubmit={addQuestion}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="input" value={newQ.role_id}
                        onChange={e => setNewQ(f => ({ ...f, role_id: e.target.value }))} required>
                        <option value="">Select role…</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section</label>
                      <select className="input" value={newQ.section}
                        onChange={e => setNewQ(f => ({ ...f, section: e.target.value }))}>
                        {SECTIONS.map(s => <option key={s} value={s}>{SECTION_LABELS[s]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group mt-16">
                    <label className="form-label">Question Prompt</label>
                    <textarea className="input" rows={3} placeholder="Enter the question here…"
                      value={newQ.prompt} onChange={e => setNewQ(f => ({ ...f, prompt: e.target.value }))} required
                      style={{ resize: 'vertical' }} />
                  </div>
                  <div className="grid-2 mt-16">
                    {['a', 'b', 'c', 'd'].map(opt => (
                      <div className="form-group" key={opt}>
                        <label className="form-label">Option {opt.toUpperCase()}</label>
                        <input className="input" placeholder={`Option ${opt.toUpperCase()}`}
                          value={newQ[`option_${opt}`]}
                          onChange={e => setNewQ(f => ({ ...f, [`option_${opt}`]: e.target.value }))} required />
                      </div>
                    ))}
                  </div>
                  <div className="grid-2 mt-16">
                    <div className="form-group">
                      <label className="form-label">Correct Answer</label>
                      <select className="input" value={newQ.correct_option}
                        onChange={e => setNewQ(f => ({ ...f, correct_option: e.target.value }))}>
                        {['a', 'b', 'c', 'd'].map(o => <option key={o} value={o}>Option {o.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Points</label>
                      <input className="input" type="number" min={1} value={newQ.points}
                        onChange={e => setNewQ(f => ({ ...f, points: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn btn-primary mt-16" type="submit"><Plus size={15} />Add Question</button>
                </form>
              </div>

              {/* Filters */}
              <div className="flex gap-12 mb-16">
                <select className="input" style={{ maxWidth: 200 }} value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}>
                  <option value="">All Roles</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select className="input" style={{ maxWidth: 180 }} value={filterSection}
                  onChange={e => setFilterSection(e.target.value)}>
                  <option value="">All Sections</option>
                  {SECTIONS.map(s => <option key={s} value={s}>{SECTION_LABELS[s]}</option>)}
                </select>
              </div>

              <div className="card" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Role</th><th>Section</th><th>Question</th><th>Pts</th><th></th></tr>
                    </thead>
                    <tbody>
                      {filteredQ.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--white-50)', padding: '32px' }}>No questions match this filter.</td></tr>
                      )}
                      {filteredQ.map((q, i) => (
                        <tr key={q.id}>
                          <td className="text-muted text-sm">{i + 1}</td>
                          <td><span className="badge badge-gold">{roleMap[q.role_id]}</span></td>
                          <td><span className="badge badge-neutral">{SECTION_LABELS[q.section]}</span></td>
                          <td style={{ maxWidth: 340 }}>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>{q.prompt}</div>
                            <div className="text-xs text-muted">A: {q.option_a} · B: {q.option_b} · C: {q.option_c} · D: {q.option_d}</div>
                            <div className="text-xs text-gold mt-4">✓ {q[`option_${q.correct_option}`]}</div>
                          </td>
                          <td>{q.points}</td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteQuestion(q.id)}><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Results Tab ── */}
        {tab === 'results' && (
          <>
            <div className="page-header">
              <h1>Results & Proctoring</h1>
              <p>Review scores and suspicious activity logs</p>
            </div>
            <div className="page-body">
              <div className="card" style={{ padding: 0 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Role</th><th>Status</th><th>Score</th><th>Warnings</th><th>Proctor Log</th></tr>
                    </thead>
                    <tbody>
                      {candidates.filter(c => c.session_id).map(c => (
                        <tr key={c.id}>
                          <td className="font-semibold">{c.name}</td>
                          <td><span className="badge badge-gold">{c.role_name}</span></td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[c.session_status] || 'badge-neutral'}`}>
                              {STATUS_LABEL[c.session_status]}
                            </span>
                          </td>
                          <td>
                            {c.total_score != null
                              ? <span className="font-semibold text-gold">{c.total_score}/{c.max_score}</span>
                              : '—'}
                          </td>
                          <td>
                            <span className={`badge ${c.warning_count >= 3 ? 'badge-danger' : c.warning_count >= 1 ? 'badge-warning' : 'badge-success'}`}>
                              {c.warning_count ?? 0}/3
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => openSession(c.session_id)}>
                              <Eye size={13} />View Log
                            </button>
                          </td>
                        </tr>
                      ))}
                      {candidates.filter(c => c.session_id).length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--white-50)', padding: '32px' }}>No completed sessions yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Settings Tab ── */}
        {tab === 'settings' && (
          <>
            <div className="page-header">
              <h1>Test Settings</h1>
              <p>Manage test window timing (IST - India Standard Time)</p>
            </div>
            <div className="page-body">
              <div className="card" style={{ maxWidth: 500 }}>
                <h3 className="mb-16" style={{ fontSize: '15px', color: 'var(--gold)' }}>Test Window (IST)</h3>
                <div className="form-stack">
                  <div className="form-group">
                    <label className="form-label">Test Start Time (IST)</label>
                    <input className="input" type="datetime-local" value={testStart}
                      onChange={e => setTestStart(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Test End Time (IST)</label>
                    <input className="input" type="datetime-local" value={testEnd}
                      onChange={e => setTestEnd(e.target.value)} />
                  </div>
                  <p className="text-xs text-muted">
                    Candidates cannot start the test before start time. All ongoing tests auto-submit at end time. Alerts shown 20 min and 5 min before end.
                  </p>
                  <button className="btn btn-primary" onClick={saveSettings}>Save Settings</button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Session detail modal */}
      {viewSession && (
        <div className="modal-overlay" onClick={() => setViewSession(null)}>
          <div className="modal" style={{ maxWidth: 820, maxHeight: '90vh', overflowY: 'auto', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-16">
              <h2 style={{ fontSize: '18px' }}>Session Detail — #{viewSession}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewSession(null)}>✕</button>
            </div>

            {loadingEvents ? (
              <p className="text-muted">Loading…</p>
            ) : !sessionDetail ? (
              <div className="alert alert-error">Failed to load session details.</div>
            ) : (
              <>
                {/* Candidate info & scores */}
                <div className="card mb-16" style={{ background: 'var(--bg-card, #1a1a2e)' }}>
                  <div className="grid-2" style={{ gap: 12 }}>
                    <div><span className="text-muted text-sm">Candidate:</span> <span className="font-semibold">{sessionDetail.candidate_name}</span></div>
                    <div><span className="text-muted text-sm">Email:</span> <span className="text-sm">{sessionDetail.candidate_email}</span></div>
                    <div><span className="text-muted text-sm">Role:</span> <span className="badge badge-gold">{sessionDetail.role_name}</span></div>
                    <div><span className="text-muted text-sm">Status:</span> <span className={`badge ${STATUS_BADGE[sessionDetail.status] || 'badge-neutral'}`}>{STATUS_LABEL[sessionDetail.status]}</span></div>
                    <div><span className="text-muted text-sm">Score:</span> <span className="font-semibold text-gold">{sessionDetail.total_score}/{sessionDetail.max_score}</span></div>
                    <div><span className="text-muted text-sm">Warnings:</span> <span className={`badge ${sessionDetail.warning_count >= 3 ? 'badge-danger' : sessionDetail.warning_count >= 1 ? 'badge-warning' : 'badge-success'}`}>{sessionDetail.warning_count}/3</span></div>
                    {sessionDetail.started_at && <div><span className="text-muted text-sm">Started:</span> <span className="text-sm">{new Date(sessionDetail.started_at).toLocaleString()}</span></div>}
                    {sessionDetail.submitted_at && <div><span className="text-muted text-sm">Submitted:</span> <span className="text-sm">{new Date(sessionDetail.submitted_at).toLocaleString()}</span></div>}
                  </div>
                </div>

                {/* Answers section */}
                <h3 style={{ fontSize: '15px', marginBottom: 12 }}>Answers ({sessionDetail.answers.length})</h3>
                {sessionDetail.answers.length === 0 ? (
                  <div className="alert alert-success mb-16">No answers recorded.</div>
                ) : (
                  <div className="mb-16" style={{ maxHeight: 360, overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 32 }}>#</th>
                          <th>Question</th>
                          <th style={{ width: 80 }}>Selected</th>
                          <th style={{ width: 80 }}>Correct</th>
                          <th style={{ width: 60 }}>Result</th>
                          <th style={{ width: 130 }}>Answered At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionDetail.answers.map((ans, i) => (
                          <tr key={ans.question_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td className="text-muted">{i + 1}</td>
                            <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ans.question_prompt}>{ans.question_prompt}</td>
                            <td className="font-semibold">{ans.selected_option ? ans.selected_option.toUpperCase() : '—'}</td>
                            <td className="font-semibold">{ans.correct_option ? ans.correct_option.toUpperCase() : '—'}</td>
                            <td>
                              <span style={{ color: ans.is_correct ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                                {ans.is_correct ? '✓ Correct' : '✗ Wrong'}
                              </span>
                            </td>
                            <td className="text-muted text-xs">{ans.answered_at ? new Date(ans.answered_at).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Proctor events section */}
                <h3 style={{ fontSize: '15px', marginBottom: 12 }}>Proctoring Events ({proctorEvents.length})</h3>
                {proctorEvents.length === 0 ? (
                  <div className="alert alert-success">No suspicious events recorded for this session.</div>
                ) : (
                  <div className="flex flex-col gap-8">
                    {proctorEvents.map((ev, i) => (
                      <div key={i} className="card-sm flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-sm" style={{ textTransform: 'capitalize' }}>
                            {ev.event_type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-muted">{ev.detail || 'No detail'} · {new Date(ev.created_at).toLocaleString()}</div>
                        </div>
                        <span className={`badge ${ev.warning_number >= 3 ? 'badge-danger' : 'badge-warning'}`}>
                          Warning {ev.warning_number}/3
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
