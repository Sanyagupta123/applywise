import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const STATUSES = [
  "Saved",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
];

const STATUS_COLORS = {
  Saved: "slate",
  Applied: "blue",
  Assessment: "violet",
  Interview: "amber",
  Offer: "green",
  Rejected: "red",
};

const INITIAL_FORM = {
  company: "",
  role: "",
  job_url: "",
  status: "Saved",
  deadline: "",
};

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.2L22 17l-1.9.8L19 20l-1.1-2.2L16 17l1.9-.8L19 14Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    pulse: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return <svg {...common}>{paths[name] || paths.spark}</svg>;
}

function formatDate(value) {
  if (!value) return "No deadline";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function App() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeView, setActiveView] = useState("Overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const loadApplications = useCallback(async () => {
    setPageError("");
    try {
      setApplications(await api.listApplications());
    } catch (error) {
      setPageError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(() => {
    const active = applications.filter((item) =>
      ["Applied", "Assessment", "Interview"].includes(item.status),
    );
    return {
      total: applications.length,
      active: active.length,
      interviews: applications.filter((item) => item.status === "Interview").length,
      offers: applications.filter((item) => item.status === "Offer").length,
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((item) => {
      const matchesSearch =
        !query ||
        item.company.toLowerCase().includes(query) ||
        item.role.toLowerCase().includes(query);
      return (
        matchesSearch &&
        (statusFilter === "All statuses" || item.status === statusFilter)
      );
    });
  }, [applications, search, statusFilter]);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setPageError("");
    try {
      await api.createApplication({
        ...form,
        job_url: form.job_url || null,
        deadline: form.deadline || null,
      });
      setForm(INITIAL_FORM);
      setModalOpen(false);
      setNotice("Application added to your tracker.");
      await loadApplications();
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id, nextStatus) {
    setPageError("");
    try {
      const updated = await api.updateStatus(id, nextStatus);
      setApplications((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      setNotice("Application status updated.");
    } catch (error) {
      setPageError(error.message);
    }
  }

  async function handleDelete(application) {
    if (!window.confirm(`Remove your ${application.role} application at ${application.company}?`)) {
      return;
    }
    setPageError("");
    try {
      await api.deleteApplication(application.id);
      setApplications((current) =>
        current.filter((item) => item.id !== application.id),
      );
      setNotice("Application removed.");
    } catch (error) {
      setPageError(error.message);
    }
  }

  async function handleAnalyze(event) {
    event.preventDefault();
    setAnalysisError("");
    setAnalysis(null);
    setAnalyzing(true);
    try {
      setAnalysis(await api.analyze(jobDescription));
    } catch (error) {
      setAnalysisError(error.message);
    } finally {
      setAnalyzing(false);
    }
  }

  const navigation = [
    { label: "Overview", icon: "grid" },
    { label: "Applications", icon: "briefcase" },
    { label: "Skill analyzer", icon: "spark" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActiveView("Overview")}>
          <span className="brand-mark"><Icon name="pulse" size={21} /></span>
          <span>applywise<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${activeView === item.label ? "active" : ""}`}
              onClick={() => setActiveView(item.label)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.label === "Applications" && (
                <span className="nav-count">{applications.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="tip-card">
            <span className="tip-icon"><Icon name="spark" size={17} /></span>
            <strong>Small steps add up.</strong>
            <p>Every application is a step closer to your next opportunity.</p>
          </div>
          <div className="profile">
            <div className="profile-avatar">A</div>
            <div className="profile-copy"><strong>Your workspace</strong><span>Career dashboard</span></div>
            <span className="profile-dot" aria-label="Workspace active" />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeView}</strong></div>
          <div className="topbar-right">
            <span className="today-label"><Icon name="calendar" size={15} /> Your internship season</span>
            <button className="button button-primary button-small" onClick={() => setModalOpen(true)}>
              <Icon name="plus" size={16} /> Add application
            </button>
          </div>
        </header>

        <div className="page-wrap">
          {pageError && (
            <div className="alert alert-error" role="alert">
              <span>{pageError}</span>
              <button onClick={() => setPageError("")} aria-label="Dismiss error"><Icon name="close" size={16} /></button>
            </div>
          )}

          {activeView === "Skill analyzer" ? (
            <AnalyzerView
              description={jobDescription}
              setDescription={setJobDescription}
              analysis={analysis}
              error={analysisError}
              analyzing={analyzing}
              onSubmit={handleAnalyze}
            />
          ) : (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> YOUR NEXT CHAPTER STARTS HERE</div>
                  <h1>{activeView === "Applications" ? "Your applications" : "Make your next move."}</h1>
                  <p className="welcome-subtitle">
                    {activeView === "Applications"
                      ? "Every opportunity, organized in one place."
                      : "A little progress today goes a long way."}
                  </p>
                </div>
                <button className="button button-primary add-main" onClick={() => setModalOpen(true)}>
                  <Icon name="plus" size={17} /> New application
                </button>
              </section>

              {activeView === "Overview" && (
                <>
                  <section className="stats-grid" aria-label="Application statistics">
                    <StatCard label="Total applications" value={stats.total} icon="briefcase" tone="blue" caption="Opportunities in your list" />
                    <StatCard label="In progress" value={stats.active} icon="pulse" tone="violet" caption="Moving through the process" />
                    <StatCard label="Interviews" value={stats.interviews} icon="calendar" tone="amber" caption="Conversations to look forward to" />
                    <StatCard label="Offers" value={stats.offers} icon="check" tone="green" caption="Doors opening for you" />
                  </section>

                  <section className="content-grid">
                    <div className="panel applications-panel">
                      <div className="panel-heading">
                        <div><h2>Recent applications</h2><p>Your latest opportunities at a glance.</p></div>
                        <button className="text-button" onClick={() => setActiveView("Applications")}>View all <Icon name="arrow" size={15} /></button>
                      </div>
                      <ApplicationTable
                        applications={applications.slice(0, 5)}
                        loading={loading}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        emptyTitle="Your story starts here"
                        emptyText="Add your first application to keep every opportunity in sight."
                        onAdd={() => setModalOpen(true)}
                      />
                    </div>
                    <div className="side-column">
                      <div className="focus-card">
                        <div className="focus-top"><span className="focus-symbol"><Icon name="spark" size={19} /></span><span className="focus-kicker">A LITTLE FOCUS</span></div>
                        <h2>Know what to learn next.</h2>
                        <p>Compare your skills with a job description and find the areas to grow.</p>
                        <button className="focus-link" onClick={() => setActiveView("Skill analyzer")}>Try the skill analyzer <Icon name="arrow" size={16} /></button>
                        <div className="focus-orbit orbit-one" /><div className="focus-orbit orbit-two" />
                      </div>
                      <div className="quick-note">
                        <div className="quick-note-icon"><Icon name="clock" size={17} /></div>
                        <div><strong>Keep the momentum</strong><p>Follow up on an application that has been quiet for a while.</p></div>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {activeView === "Applications" && (
                <section className="panel all-applications-panel">
                  <div className="panel-heading applications-heading">
                    <div><h2>All applications <span className="heading-count">{applications.length}</span></h2><p>Stay on top of every step in your search.</p></div>
                    <div className="table-filters">
                      <label className="search-box"><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company or role" /></label>
                      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
                        <option>All statuses</option>
                        {STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </div>
                  </div>
                  <ApplicationTable
                    applications={filteredApplications}
                    loading={loading}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    emptyTitle={applications.length ? "No matching applications" : "A fresh start"}
                    emptyText={applications.length ? "Try a different search or status filter." : "Add an internship application to start building your list."}
                    onAdd={() => setModalOpen(true)}
                    showAddEmpty={!applications.length}
                  />
                </section>
              )}
            </>
          )}
          <footer className="page-footer"><span>Made for the next step in your story.</span><span>APPLYWISE <span className="footer-dot">●</span> KEEP MOVING FORWARD</span></footer>
        </div>
      </main>

      {notice && <div className="toast" role="status"><span className="toast-check"><Icon name="check" size={15} /></span>{notice}</div>}

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div><span className="modal-kicker">A NEW OPPORTUNITY</span><h2 id="modal-title">Add an application</h2><p>Keep the details here. You can update them anytime.</p></div>
              <button className="icon-button modal-close" onClick={() => setModalOpen(false)} aria-label="Close dialog"><Icon name="close" /></button>
            </div>
            <form className="application-form" onSubmit={handleCreate}>
              <label>Company <span className="required">*</span><input required maxLength={120} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="e.g. Linear" /></label>
              <label>Role <span className="required">*</span><input required maxLength={160} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="e.g. Product Design Intern" /></label>
              <label>Job posting URL <span className="optional">OPTIONAL</span><input type="url" value={form.job_url} onChange={(event) => setForm({ ...form, job_url: event.target.value })} placeholder="https://" /></label>
              <div className="form-row">
                <label>Current status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label>Application deadline <span className="optional">OPTIONAL</span><input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label>
              </div>
              <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setModalOpen(false)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Saving..." : <><Icon name="plus" size={16} /> Save application</>}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, tone, caption }) {
  return (
    <article className="stat-card">
      <div className="stat-top"><span className={`stat-icon ${tone}`}><Icon name={icon} size={18} /></span><span className="stat-period">ALL TIME</span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-caption">{caption}</div>
    </article>
  );
}

function ApplicationTable({
  applications,
  loading,
  onStatusChange,
  onDelete,
  emptyTitle,
  emptyText,
  onAdd,
  showAddEmpty = true,
}) {
  if (loading) {
    return <div className="table-state"><span className="spinner" /> Loading your applications...</div>;
  }
  if (!applications.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon"><Icon name="briefcase" size={22} /></span>
        <h3>{emptyTitle}</h3><p>{emptyText}</p>
        {showAddEmpty && <button className="button button-secondary" onClick={onAdd}><Icon name="plus" size={16} /> Add your first application</button>}
      </div>
    );
  }
  return (
    <div className="table-scroll">
      <table className="application-table">
        <thead><tr><th>COMPANY &amp; ROLE</th><th>STATUS</th><th>DEADLINE</th><th aria-label="Actions" /></tr></thead>
        <tbody>
          {applications.map((application) => (
            <tr key={application.id}>
              <td>
                <div className="company-cell">
                  <div className={`company-avatar avatar-${(application.company.charCodeAt(0) || 0) % 6}`}>{application.company.charAt(0).toUpperCase()}</div>
                  <div className="company-info"><strong>{application.company}</strong><span>{application.role}</span></div>
                  {application.job_url && <a className="company-link" href={application.job_url} target="_blank" rel="noreferrer" aria-label={`Open ${application.company} job posting`}><Icon name="arrow" size={13} /></a>}
                </div>
              </td>
              <td><label className={`status-pill ${STATUS_COLORS[application.status]}`}><span className="status-dot" /><select value={application.status} onChange={(event) => onStatusChange(application.id, event.target.value)} aria-label={`Status for ${application.company}`}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label></td>
              <td><span className={`deadline ${application.deadline && new Date(`${application.deadline}T00:00:00`) < new Date(new Date().toDateString()) ? "deadline-past" : ""}`}><Icon name="calendar" size={14} />{formatDate(application.deadline)}</span></td>
              <td><button className="icon-button delete-button" onClick={() => onDelete(application)} aria-label={`Delete ${application.company} application`}><Icon name="trash" size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyzerView({ description, setDescription, analysis, error, analyzing, onSubmit }) {
  return (
    <section className="analyzer-page">
      <div className="welcome-row analyzer-welcome">
        <div><div className="eyebrow"><span className="eyebrow-line" /> YOUR NEXT SKILL, MADE CLEAR</div><h1>Find your growth edge.</h1><p className="welcome-subtitle">See how your skills line up with the role you want.</p></div>
        <span className="analyzer-illustration"><Icon name="spark" size={28} /></span>
      </div>
      <div className="analyzer-layout">
        <form className="panel analyzer-form" onSubmit={onSubmit}>
          <div className="panel-heading"><div><h2>Paste a job description</h2><p>We’ll look for the skills in the role and show what’s there.</p></div></div>
          <label className="description-label" htmlFor="job-description">JOB DESCRIPTION</label>
          <textarea id="job-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Paste the role requirements here...&#10;&#10;For example: We're looking for a curious intern with Python, SQL, and React experience." maxLength={30000} required />
          <div className="analyzer-form-footer"><span>{description.length.toLocaleString()} / 30,000 characters</span><button className="button button-primary" disabled={analyzing || !description.trim()}>{analyzing ? <><span className="button-spinner" /> Analyzing...</> : <><Icon name="spark" size={16} /> Analyze skills</>}</button></div>
          {error && <div className="alert alert-error analyzer-error" role="alert">{error}</div>}
        </form>
        <div className="analysis-column">
          {!analysis ? (
            <div className="analysis-placeholder"><div className="placeholder-art"><span /><span /><span /><Icon name="spark" size={18} /></div><h2>Your next step, revealed.</h2><p>Run an analysis to see what you already bring to the table and where you could grow.</p><div className="placeholder-metrics"><span><i className="legend-dot matched" />Skills you have</span><span><i className="legend-dot missing" />Skills to explore</span></div></div>
          ) : (
            <div className="panel analysis-result">
              <div className="result-header"><div><span className="result-kicker">YOUR SKILL SNAPSHOT</span><h2>A strong place to start.</h2></div><span className="result-spark"><Icon name="spark" size={18} /></span></div>
              <div className="match-score"><div className="score-ring" style={{ "--score": `${analysis.match_percentage}%` }}><div><strong>{analysis.match_percentage}%</strong><span>match</span></div></div><div><strong>{analysis.matched_skills.length} of 8 skills found</strong><p>Keep building on what you know.</p></div></div>
              <div className="skill-group"><div className="skill-group-heading"><span><i className="legend-dot matched" /> Matched skills</span><b>{analysis.matched_skills.length}</b></div><div className="skill-chips">{analysis.matched_skills.length ? analysis.matched_skills.map((skill) => <span className="skill-chip skill-found" key={skill}><Icon name="check" size={13} />{skill}</span>) : <p className="no-skills">No matches yet — every expert started somewhere.</p>}</div></div>
              <div className="skill-group"><div className="skill-group-heading"><span><i className="legend-dot missing" /> Skills to explore</span><b>{analysis.missing_skills.length}</b></div><div className="skill-chips">{analysis.missing_skills.map((skill) => <span className="skill-chip skill-next" key={skill}>{skill}</span>)}</div></div>
              <p className="result-footnote">A simple keyword check—not a measure of your potential.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default App;
