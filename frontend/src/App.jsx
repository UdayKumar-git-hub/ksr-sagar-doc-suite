import React, { useState, useEffect, useRef } from 'react';
import './style.css';

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('zane-theme');
      if (saved) return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [activeTab, setActiveTab] = useState('timetable');
  const [scheduleDate, setScheduleDate] = useState('10 October, 2026');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('LEVEL 1: Uploading PDF stream...');
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadBadge, setUploadBadge] = useState('PROCESSING');
  const [uploadFileInfo, setUploadFileInfo] = useState({ name: 'Day_Time_Table.pdf', size: 'Preparing stream...' });
  const [timetableData, setTimetableData] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fileInputRef = useRef(null);
  const downloadBannerRef = useRef(null);
  const dropzoneRef = useRef(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('zane-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('zane-theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const triggerDownload = async (url, defaultFilename) => {
    showToast(`Preparing download for ${defaultFilename}...`, 'info');
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      showToast(`Downloaded: ${defaultFilename}`, 'success');
    } catch (err) {
      showToast(`Download failed: ${err.message}`, 'error');
    }
  };

  const handleFile = async (file) => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setUploadPercent(8);
    setUploadStep(1);
    setUploadBadge('UPLOADING');
    setUploadStatus('LEVEL 1: Uploading PDF stream...');

    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const sizeKb = Math.round(file.size / 1024);
    setUploadFileInfo({
      name: file.name,
      size: sizeMb >= 1 ? `${sizeMb} MB • Institutional PDF` : `${sizeKb} KB • Institutional PDF`
    });

    if (dropzoneRef.current) {
      dropzoneRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    let progress = 8;
    const progressTimer = setInterval(() => {
      if (progress < 25) {
        progress += 2.5;
        setUploadPercent(progress);
        setUploadStatus('LEVEL 1: Uploading binary PDF stream...');
        setUploadStep(1);
      } else if (progress < 55) {
        progress += 1.8;
        setUploadPercent(progress);
        setUploadStatus('LEVEL 2: Extracting 142 classes & time grid...');
        setUploadStep(2);
        setUploadBadge('EXTRACTING');
      } else if (progress < 80) {
        progress += 1.2;
        setUploadPercent(progress);
        setUploadStatus('LEVEL 3: Segregating Theory & Lab sessions...');
        setUploadStep(3);
        setUploadBadge('PARSING');
      } else if (progress < 93) {
        progress += 0.8;
        setUploadPercent(progress);
        setUploadStatus('LEVEL 4: Formatting official Word .docx & .doc templates...');
        setUploadStep(4);
        setUploadBadge('FORMATTING');
      }
    }, 160);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('custom_date', scheduleDate || '10 October, 2026');

    showToast(`Parsing ${file.name}...`, 'info');

    try {
      const res = await fetch('/api/timetable/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload parsing failed');

      clearInterval(progressTimer);
      setUploadPercent(100);
      setUploadStep(4);
      setUploadBadge('SUCCESS');
      setUploadStatus('LEVEL 4 COMPLETE: Official Documents Ready!');
      setTimetableData(data);

      setTimeout(() => {
        showToast(`Successfully converted ${file.name}! Official Word documents ready.`, 'success');
        if (downloadBannerRef.current) {
          downloadBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setTimeout(() => {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }, 1500);
      }, 500);
    } catch (err) {
      clearInterval(progressTimer);
      setUploadBadge('FAILED');
      setUploadStatus(`ERROR: ${err.message}`);
      showToast(err.message, 'error');
      setTimeout(() => {
        setIsUploading(false);
      }, 3000);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const branches = timetableData ? Array.from(new Set(timetableData.classes.map(c => c.branch))).sort() : [];

  const filteredClasses = timetableData ? timetableData.classes.filter(c => {
    if (branchFilter !== 'ALL' && c.branch !== branchFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchClass = (c.class_name || '').toLowerCase().includes(q);
      const matchPeriod = Object.values(c.periods || {}).some(p =>
        p && (
          (p.faculty_name || '').toLowerCase().includes(q) ||
          (p.course_code || '').toLowerCase().includes(q) ||
          (p.course_name || '').toLowerCase().includes(q) ||
          (p.room_no || '').toLowerCase().includes(q)
        )
      );
      if (!matchClass && !matchPeriod) return false;
    }
    return true;
  }) : [];

  let totalTheory = 0;
  let totalLabs = 0;
  if (timetableData) {
    timetableData.classes.forEach(c => {
      Object.values(c.periods || {}).forEach(p => {
        if (p) {
          if (p.is_lab) totalLabs++;
          else totalTheory++;
        }
      });
    });
  }

  return (
    <>
      {/* Top Global Progress Bar */}
      <div className="global-progress-bar" style={{ display: isUploading ? 'block' : 'none' }}>
        <div className="global-progress-fill" style={{ width: `${uploadPercent}%` }}></div>
      </div>

      {/* Fixed Sticky Header Navigation */}
      <header className="nav" id="main-nav">
        <div className="nav__inner">
          <a className="brand" href="/" aria-label="KSR Sagar Home">
            <span className="brand__row">
              <span className="brand__mark">KSR SAGAR</span>
            </span>
            <span className="brand__est">CONVERTER SUITE. EST2026.</span>
          </a>

          <nav className="nav__links" aria-label="Primary Navigation">
            <button
              className={`nav__link ${activeTab === 'timetable' ? 'active' : ''}`}
              onClick={() => setActiveTab('timetable')}
            >
              01. Timetable to Word
            </button>
            <button
              className={`nav__link ${activeTab === 'slides' ? 'active' : ''}`}
              onClick={() => setActiveTab('slides')}
            >
              02. Slide Generator <span className="badge-soon">COMING SOON</span>
            </button>
          </nav>

          <div className="nav__right">
            <span className="nav__status">Engine Ready</span>
            <button
              className="nav__toggle"
              type="button"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2v2.4M12 19.6V22M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2 12h2.4M19.6 12H22M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <section className="crumb wrap">
        <nav className="crumb__path">
          <a href="/">KSR</a>
          <span className="sep">/</span>
          <span>Services</span>
          <span className="sep">/</span>
          <span className="here">Timetable &amp; Presentation Suite</span>
        </nav>
      </section>

      {/* Service Hero */}
      <section className="shero wrap">
        <div className="shero__top">
          <div className="shero__live">Live Conversion Engine v3.0</div>
          <span className="label">IARE Schedule Architecture</span>
        </div>

        <h1 className="shero__title">
          Timetable<span className="shero__br"><br /></span>Converter<span className="o">.</span>
        </h1>

        <div className="shero__grid">
          <p className="shero__lead">
            Institutional document conversion that parses Day Time Table PDFs{' '}
            <span className="muted">
              into official Microsoft Word (.docx &amp; .doc) formats with 100% table fidelity, separated into Theory and Laboratories timetables, plus AI lecture slides.
            </span>
          </p>

          <div className="shero__aside">
            <div className="shero__cta">
              <button
                className="btn btn--orange"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                Upload Day Time Table PDF <span className="btn__arrow">→</span>
              </button>
            </div>
            <p className="label" style={{ marginTop: 6 }}>Zero JSON latency • Direct Word &amp; PowerPoint exports</p>
          </div>
        </div>
      </section>

      {/* Showcase Infinite Marquee */}
      <section className="showcase" aria-label="Engine capabilities showcase">
        <div className="showcase__head wrap">
          <span className="label label--dot">Capabilities &amp; Core Output Formats</span>
        </div>
        <div className="showcase__viewport">
          <div className="showcase__track">
            <div className="showcase__chip"><span className="chip-dot"></span> B.Tech Theory Day Time Table (.docx &amp; .doc)</div>
            <div className="showcase__chip"><span className="chip-dot"></span> Laboratories Day Time Table (.docx &amp; .doc)</div>
            <div className="showcase__chip"><span className="chip-dot"></span> 142 Class Sections &amp; 546 Periods Parsed</div>
            <div className="showcase__chip"><span className="chip-dot"></span> 7-Slide Structured Faculty Lecture Decks (.pptx)</div>
            <div className="showcase__chip"><span className="chip-dot"></span> Genuine Binary Word 97-2003 COM Export</div>
            <div className="showcase__chip"><span className="chip-dot"></span> Dean PG &amp; Saturday Schedule Integration</div>
            {/* Duplicates for marquee */}
            <div className="showcase__chip"><span className="chip-dot"></span> B.Tech Theory Day Time Table (.docx &amp; .doc)</div>
            <div className="showcase__chip"><span className="chip-dot"></span> Laboratories Day Time Table (.docx &amp; .doc)</div>
            <div className="showcase__chip"><span className="chip-dot"></span> 142 Class Sections &amp; 546 Periods Parsed</div>
            <div className="showcase__chip"><span className="chip-dot"></span> 7-Slide Structured Faculty Lecture Decks (.pptx)</div>
            <div className="showcase__chip"><span className="chip-dot"></span> Genuine Binary Word 97-2003 COM Export</div>
            <div className="showcase__chip"><span className="chip-dot"></span> Dean PG &amp; Saturday Schedule Integration</div>
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="wrap zsection">
        {/* Segmented Nav Switcher */}
        <div className="segmented-nav">
          <button
            className={`seg-btn ${activeTab === 'timetable' ? 'active' : ''}`}
            onClick={() => setActiveTab('timetable')}
          >
            01. Timetable PDF to 2 Word Docs (Theory &amp; Labs)
          </button>
          <button
            className={`seg-btn ${activeTab === 'slides' ? 'active' : ''}`}
            onClick={() => setActiveTab('slides')}
          >
            02. Slide Generator <span className="badge-soon">COMING SOON</span>
          </button>
        </div>

        {/* TAB 1: TIMETABLE CONVERTER */}
        {activeTab === 'timetable' && (
          <div className="tab-pane">
            <div className="zcard">
              <div className="zcard__head">
                <div className="zcard__title">
                  <span className="o">⚡</span> Upload Day Time Table PDF
                </div>
                <div className="schedule-date-wrap">
                  <label className="zlabel">Schedule Date:</label>
                  <input
                    type="text"
                    className="zinput"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
              </div>

              <div
                className="zdropzone"
                ref={dropzoneRef}
                onClick={() => !isUploading && fileInputRef.current && fileInputRef.current.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                />

                {!isUploading ? (
                  <div className="zdropzone__content">
                    <div className="zdropzone__icon">📑</div>
                    <div className="zdropzone__title">Select or Drop Institutional PDF File</div>
                    <div className="zdropzone__desc">Automatic separation into Theory Day Time Table &amp; Laboratories Day Time Table</div>
                    <button type="button" className="btn btn--outline btn--sm">Browse File</button>
                  </div>
                ) : (
                  <div className="upload-level">
                    <div className="upload-level__filecard">
                      <div className="upload-spinner"></div>
                      <span className="upload-level__fileicon">📑</span>
                      <div className="upload-level__fileinfo">
                        <div className="upload-level__filename">{uploadFileInfo.name}</div>
                        <div className="upload-level__filesize">{uploadFileInfo.size}</div>
                      </div>
                      <div className="upload-level__badge">{uploadBadge}</div>
                    </div>

                    <div className="upload-level__equalizer">
                      <span className="eq-bar"></span>
                      <span className="eq-bar"></span>
                      <span className="eq-bar"></span>
                      <span className="eq-bar"></span>
                      <span className="eq-bar"></span>
                      <span className="eq-bar"></span>
                      <span className="eq-bar"></span>
                      <span className="eq-bar"></span>
                    </div>

                    <div className="upload-level__stats">
                      <div className="upload-level__status-text">{uploadStatus}</div>
                      <div className="upload-level__pct">{Math.round(uploadPercent)}%</div>
                    </div>

                    <div className="upload-level__meter">
                      <div className="upload-level__bar" style={{ width: `${uploadPercent}%` }}>
                        <div className="upload-level__shimmer"></div>
                      </div>
                    </div>

                    <div className="upload-level__steps">
                      <div className={`upload-level__step ${uploadStep === 1 ? 'active' : uploadStep > 1 ? 'done' : ''}`}>
                        <span className="step-num">1</span>
                        <span className="step-txt">Upload</span>
                      </div>
                      <div className={`upload-level__step ${uploadStep === 2 ? 'active' : uploadStep > 2 ? 'done' : ''}`}>
                        <span className="step-num">2</span>
                        <span className="step-txt">Extract</span>
                      </div>
                      <div className={`upload-level__step ${uploadStep === 3 ? 'active' : uploadStep > 3 ? 'done' : ''}`}>
                        <span className="step-num">3</span>
                        <span className="step-txt">Segregate</span>
                      </div>
                      <div className={`upload-level__step ${uploadStep === 4 ? 'active' : uploadStep > 4 ? 'done' : ''}`}>
                        <span className="step-num">4</span>
                        <span className="step-txt">Format Docs</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Converted Downloads Banner */}
            {timetableData && (
              <div ref={downloadBannerRef}>
                <div className="results-grid">
                  {/* Theory Card */}
                  <div className="result-card">
                    <div>
                      <div className="result-card__meta">
                        <span className="badge-pill badge--theory">OFFICIAL WORD TEMPLATE</span>
                      </div>
                      <div className="result-card__title">Theory Classes Day Time Table</div>
                      <p className="result-card__desc">
                        Formatted into official <strong>B.Tech Theory classes Day time table(Sat)</strong> template. Includes Period, Faculty ID, Faculty Name, Course Code, Course Name, Room No, and merged class section headers.
                      </p>
                    </div>

                    <div className="result-card__actions">
                      <button
                        className="btn btn--orange btn--sm"
                        onClick={() => triggerDownload(timetableData.theory_docx_url, 'B.Tech Theory classes Day time table(Sat).docx')}
                      >
                        Download .docx (Modern Word) <span className="btn__arrow">→</span>
                      </button>
                      <button
                        className="btn btn--outline btn--sm"
                        onClick={() => triggerDownload(timetableData.theory_doc_url, 'B.Tech Theory classes Day time table(Sat).doc')}
                      >
                        Download .doc (Word 97-2003) <span className="btn__arrow">→</span>
                      </button>
                    </div>
                  </div>

                  {/* Lab Card */}
                  <div className="result-card">
                    <div>
                      <div className="result-card__meta">
                        <span className="badge-pill badge--lab">OFFICIAL WORD TEMPLATE</span>
                      </div>
                      <div className="result-card__title">Laboratories Day Time Table</div>
                      <p className="result-card__desc">
                        Formatted into official <strong>B.Tech Laboratories Day time table (Sat)</strong> template. Includes laboratory period grouping, faculty pairs, lab rooms, and adjustment fields.
                      </p>
                    </div>

                    <div className="result-card__actions">
                      <button
                        className="btn btn--orange btn--sm"
                        onClick={() => triggerDownload(timetableData.lab_docx_url, 'B.Tech Laboratories Day time table (Sat).docx')}
                      >
                        Download .docx (Modern Word) <span className="btn__arrow">→</span>
                      </button>
                      <button
                        className="btn btn--outline btn--sm"
                        onClick={() => triggerDownload(timetableData.lab_doc_url, 'B.Tech Laboratories Day time table (Sat).doc')}
                      >
                        Download .doc (Word 97-2003) <span className="btn__arrow">→</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table Inspector */}
                <div className="zcard" style={{ marginTop: 24 }}>
                  <div className="zcard__head">
                    <div className="zcard__title">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="o">📋</span> Extracted Schedule Records
                      </div>
                      <div className="stat-badges-wrap">
                        <span className="badge-pill badge--theory">{timetableData.classes.length} Classes</span>
                        <span className="badge-pill badge--theory">{totalTheory} Theory</span>
                        <span className="badge-pill badge--lab">{totalLabs} Labs</span>
                      </div>
                    </div>

                    <div className="table-controls-mobile">
                      <select
                        className="zselect"
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                      >
                        <option value="ALL">All Branches</option>
                        {branches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>

                      <div className="filter-btn-group">
                        <button
                          className={`btn btn--sm ${sessionFilter === 'ALL' ? 'btn--orange' : 'btn--outline'}`}
                          onClick={() => setSessionFilter('ALL')}
                        >
                          All
                        </button>
                        <button
                          className={`btn btn--sm ${sessionFilter === 'THEORY' ? 'btn--orange' : 'btn--outline'}`}
                          onClick={() => setSessionFilter('THEORY')}
                        >
                          Theory
                        </button>
                        <button
                          className={`btn btn--sm ${sessionFilter === 'LAB' ? 'btn--orange' : 'btn--outline'}`}
                          onClick={() => setSessionFilter('LAB')}
                        >
                          Labs
                        </button>
                      </div>

                      <input
                        type="text"
                        className="zinput"
                        placeholder="Search class or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="ztable-wrap">
                    <div className="table-responsive">
                      <table className="ztable">
                        <thead>
                          <tr>
                            <th style={{ width: 60, textAlign: 'center' }}>Period</th>
                            <th style={{ width: 130 }}>Faculty Id</th>
                            <th style={{ width: 220 }}>Faculty Name</th>
                            <th style={{ width: 110 }}>Course Code</th>
                            <th>Course Name</th>
                            <th style={{ width: 110, textAlign: 'center' }}>Room No</th>
                            <th style={{ width: 90 }}>Type</th>
                            <th style={{ width: 130 }}>Adjustment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClasses.map((cls, ci) => {
                            const periodsToShow = Object.entries(cls.periods || {}).filter(([pNum, p]) => {
                              if (!p) return false;
                              if (sessionFilter === 'THEORY' && p.is_lab) return false;
                              if (sessionFilter === 'LAB' && !p.is_lab) return false;
                              return true;
                            });

                            if (periodsToShow.length === 0) return null;

                            return (
                              <React.Fragment key={ci}>
                                <tr className="section-group-row">
                                  <td colSpan={8} style={{ textAlign: 'center' }}>
                                    CLASS / SECTION: {cls.class_name} ({cls.branch})
                                  </td>
                                </tr>
                                {periodsToShow.map(([pNum, p], pi) => (
                                  <tr key={pi}>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{pNum}</td>
                                    <td><span className="mono">{p.faculty_id || '-'}</span></td>
                                    <td><strong>{p.faculty_name || '-'}</strong></td>
                                    <td><span className="mono">{p.course_code || '-'}</span></td>
                                    <td>{p.course_name || '-'}</td>
                                    <td style={{ textAlign: 'center' }}><span className="mono">{p.room_no || '-'}</span></td>
                                    <td>
                                      <span className={`badge-pill ${p.is_lab ? 'badge--lab' : 'badge--theory'}`}>
                                        {p.is_lab ? 'LAB' : 'THEORY'}
                                      </span>
                                    </td>
                                    <td><span className="mono" style={{ color: 'var(--grey)' }}>{p.adj || '-'}</span></td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SLIDE GENERATOR (COMING SOON) */}
        {activeTab === 'slides' && (
          <div className="tab-pane">
            <div className="zcard" style={{ textAlign: 'center', padding: 'clamp(36px, 6vw, 68px) 20px' }}>
              <div className="coming-soon-icon">📊</div>
              <div style={{ marginTop: 22 }}>
                <span className="badge-pill badge--lab" style={{ fontSize: 11, letterSpacing: '0.12em', padding: '5px 14px' }}>
                  UNDER ACTIVE INSTITUTIONAL CALIBRATION
                </span>
              </div>
              <h2 style={{ fontFamily: 'var(--sans-display)', fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800, margin: '18px 0 12px', color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                AI Slide Deck Generator v3.5
              </h2>
              <p style={{ maxWidth: 580, margin: '0 auto 28px', color: 'var(--grey)', fontSize: 'clamp(13.5px, 2vw, 15.5px)', lineHeight: 1.6 }}>
                This engine module is currently being fine-tuned to automatically ingest institutional Day Time Table schedules and output structured 7-slide Microsoft PowerPoint (<code style={{ color: 'var(--orange)' }}>.pptx</code>) lecture presentations complete with syllabus objectives, architecture diagrams, and speaker notes.
              </p>
              <div className="coming-soon-actions">
                <button className="btn btn--outline" disabled style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                  Feature Coming Soon <span className="btn__arrow">→</span>
                </button>
                <button className="btn btn--orange" onClick={() => setActiveTab('timetable')}>
                  Back to Timetable Converter <span className="btn__arrow">→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notifications */}
      <div id="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span style={{ color: 'var(--orange)' }}>
              {t.type === 'success' ? '⚡' : t.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
