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

  // Slide Maker States
  const [pptTopic, setPptTopic] = useState('Reduce Risk And Confidently Accelerate Your Business In The Cloud');
  const [pptCourse, setPptCourse] = useState('CLOUD APPLICATION DEVELOPMENT');
  const [pptSlidesCount, setPptSlidesCount] = useState(10);
  const [pptFacultyName, setPptFacultyName] = useState('KS R Sagar');
  const [pptFacultyId, setPptFacultyId] = useState('IARE11024');
  const [pptDepartment, setPptDepartment] = useState('IT');
  const [pptLectureNum, setPptLectureNum] = useState('56');
  const [pptFlowcharts, setPptFlowcharts] = useState(true);
  const [pptDiagrams, setPptDiagrams] = useState(true);
  const [pptTables, setPptTables] = useState(true);
  const [pptNotes, setPptNotes] = useState(true);
  const [pptCustomSubtopics, setPptCustomSubtopics] = useState('');

  const [isPptGenerating, setIsPptGenerating] = useState(false);
  const [pptProgressPct, setPptProgressPct] = useState(15);
  const [pptProgressBadge, setPptProgressBadge] = useState('INITIALIZING');
  const [pptProgressStatus, setPptProgressStatus] = useState('Formulating technical domain queries...');
  const [pptProgressStep, setPptProgressStep] = useState(1);
  const [pptResult, setPptResult] = useState(null);

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

  const handleGeneratePpt = async (e) => {
    e.preventDefault();
    if (!pptTopic.trim()) {
      showToast('Please enter a presentation topic title.', 'error');
      return;
    }
    setIsPptGenerating(true);
    setPptProgressPct(15);
    setPptProgressBadge('WEB RESEARCH');
    setPptProgressStatus(`Deep researching "${pptTopic}" via Wikipedia & technical sources...`);
    setPptProgressStep(1);

    const progressTimer = setInterval(() => {
      setPptProgressPct(prev => {
        if (prev < 40) {
          setPptProgressBadge('FACT EXTRACTION');
          setPptProgressStatus('Extracting verified architectural principles, mechanisms & protocols...');
          setPptProgressStep(2);
          return prev + 12;
        } else if (prev < 70) {
          setPptProgressBadge('VECTOR DIAGRAMS');
          setPptProgressStatus('Synthesizing vector flowcharts, system tier diagrams & benchmark tables...');
          setPptProgressStep(3);
          return prev + 10;
        } else if (prev < 90) {
          setPptProgressBadge('COMPILING PPTX');
          setPptProgressStatus('Compiling IARE slide masters, typography, logos & gradient bars...');
          setPptProgressStep(4);
          return prev + 5;
        }
        return prev;
      });
    }, 1000);

    const payload = {
      topic: pptTopic,
      course_name: pptCourse,
      slides_count: parseInt(pptSlidesCount) || 10,
      faculty_name: pptFacultyName,
      faculty_id: pptFacultyId,
      department: pptDepartment,
      lecture_number: pptLectureNum,
      include_flowcharts: pptFlowcharts,
      include_diagrams: pptDiagrams,
      include_tables: pptTables,
      speaker_notes: pptNotes,
      custom_subtopics: pptCustomSubtopics
    };

    try {
      const res = await fetch('/api/presentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Presentation generation failed');

      clearInterval(progressTimer);
      setPptProgressPct(100);
      setPptProgressBadge('COMPLETE');
      setPptProgressStatus(`Successfully compiled ${data.slides_count} slides strictly adhering to IARE format!`);

      setTimeout(() => {
        setIsPptGenerating(false);
        setPptResult(data);
        showToast(`Presentation "${data.topic}" generated! Download starting...`, 'success');
        const a = document.createElement('a');
        a.href = data.download_url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, 600);

    } catch (err) {
      clearInterval(progressTimer);
      setIsPptGenerating(false);
      showToast(err.message, 'error');
    }
  };

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
              02. Slide Maker
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
          <span className="here">{activeTab === 'slides' ? 'Slide Maker' : 'Timetable & Presentation Suite'}</span>
        </nav>
      </section>

      {/* Service Hero */}
      <section className="shero wrap">
        <div className="shero__top">
          <div className="shero__live">
            {activeTab === 'slides' ? 'Live Slide Maker v3.0' : 'Live Conversion Engine v3.0'}
          </div>
          <span className="label">
            {activeTab === 'slides' ? 'IARE Academic Lecture Standards' : 'IARE Schedule Architecture'}
          </span>
        </div>

        <h1 className="shero__title">
          {activeTab === 'slides' ? (
            <>Slide<span className="shero__br"><br /></span>Maker<span className="o">.</span></>
          ) : (
            <>Timetable<span className="shero__br"><br /></span>Converter<span className="o">.</span></>
          )}
        </h1>

        <div className="shero__grid">
          <p className="shero__lead">
            {activeTab === 'slides' ? (
              <>
                Official Microsoft PowerPoint (.pptx) lecture generator tailored strictly to institutional curriculum standards,{' '}
                <span className="muted">
                  complete with deep live internet research, vector flowcharts, system architectures, benchmark tables, and Bloom's taxonomy review assessments.
                </span>
              </>
            ) : (
              <>
                Institutional document conversion that parses Day Time Table PDFs{' '}
                <span className="muted">
                  into official Microsoft Word (.docx &amp; .doc) formats with 100% table fidelity, separated into Theory and Laboratories timetables, plus AI lecture slides.
                </span>
              </>
            )}
          </p>

          <div className="shero__aside">
            <div className="shero__cta">
              {activeTab === 'slides' ? (
                <button
                  className="btn btn--orange"
                  onClick={() => {
                    const el = document.getElementById('slide-maker-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Create Presentation Deck <span className="btn__arrow">→</span>
                </button>
              ) : (
                <button
                  className="btn btn--orange"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  Upload Day Time Table PDF <span className="btn__arrow">→</span>
                </button>
              )}
            </div>
            <p className="label" style={{ marginTop: 6 }}>
              {activeTab === 'slides' ? 'Zero mock data • Direct PowerPoint (.pptx) exports' : 'Zero JSON latency • Direct Word & PowerPoint exports'}
            </p>
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
            <div className="showcase__chip"><span className="chip-dot"></span> Structured Faculty Lecture Decks (.pptx)</div>
            <div className="showcase__chip"><span className="chip-dot"></span> Genuine Binary Word 97-2003 COM Export</div>
            <div className="showcase__chip"><span className="chip-dot"></span> Dean PG &amp; Saturday Schedule Integration</div>
            {/* Duplicates for marquee */}
            <div className="showcase__chip"><span className="chip-dot"></span> B.Tech Theory Day Time Table (.docx &amp; .doc)</div>
            <div className="showcase__chip"><span className="chip-dot"></span> Laboratories Day Time Table (.docx &amp; .doc)</div>
            <div className="showcase__chip"><span className="chip-dot"></span> 142 Class Sections &amp; 546 Periods Parsed</div>
            <div className="showcase__chip"><span className="chip-dot"></span> Structured Faculty Lecture Decks (.pptx)</div>
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
            02. Slide Maker
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

        {/* TAB 2: SLIDE MAKER */}
        {activeTab === 'slides' && (
          <div className="tab-pane" id="slide-maker-section">
            <div className="zcard">
              <div className="zcard__head">
                <div>
                  <h2 style={{ fontFamily: 'var(--sans-display)', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, margin: '0 0 6px', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                    Slide Maker
                  </h2>
                  <p style={{ color: 'var(--grey)', fontSize: 14, maxWidth: 820, lineHeight: 1.5, margin: 0 }}>
                    Generate authentic, institution-calibrated Microsoft PowerPoint (<code style={{ color: 'var(--orange)' }}>.pptx</code>) lecture presentations with vector flowcharts, system architecture tiers, comparative benchmark tables, and Bloom's taxonomy review assessments.
                  </p>
                </div>
              </div>

              <form onSubmit={handleGeneratePpt} style={{ marginTop: 24 }}>
                {/* 1. Topic Title */}
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', display: 'block', marginBottom: 8 }}>
                    1. Presentation Topic Title (Exact Lecture Focus) *
                  </label>
                  <input
                    type="text"
                    className="zinput"
                    style={{ width: '100%', fontSize: 15, padding: '12px 16px' }}
                    placeholder="e.g. Reduce Risk And Confidently Accelerate Your Business In The Cloud"
                    value={pptTopic}
                    onChange={(e) => setPptTopic(e.target.value)}
                    required
                  />
                </div>

                {/* 2. Course Name & 3. Slide Count Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', display: 'block', marginBottom: 8 }}>
                      2. Course / Subject Name (Title Slide Header Banner)
                    </label>
                    <input
                      type="text"
                      className="zinput"
                      style={{ width: '100%', fontSize: 14, padding: '10px 14px' }}
                      placeholder="e.g. CLOUD APPLICATION DEVELOPMENT"
                      value={pptCourse}
                      onChange={(e) => setPptCourse(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', margin: 0 }}>
                        3. Total Number of Slides (5 to 50)
                      </label>
                      <span className="badge-pill badge--theory" style={{ fontSize: 12, padding: '2px 10px' }}>
                        {pptSlidesCount} Slides
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={pptSlidesCount}
                        style={{ flex: 1, accentColor: 'var(--orange)', cursor: 'pointer' }}
                        onChange={(e) => setPptSlidesCount(parseInt(e.target.value) || 10)}
                      />
                      <input
                        type="number"
                        min="5"
                        max="50"
                        className="zinput"
                        style={{ width: 72, textAlign: 'center', fontWeight: 700 }}
                        value={pptSlidesCount}
                        onChange={(e) => setPptSlidesCount(Math.max(5, Math.min(50, parseInt(e.target.value) || 10)))}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {[7, 10, 15, 22, 30, 50].map((num) => (
                        <button
                          key={num}
                          type="button"
                          className={`btn-pill-opt ${pptSlidesCount === num ? 'active' : ''}`}
                          onClick={() => setPptSlidesCount(num)}
                        >
                          {num} Slides
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Presenter Credentials Grid */}
                <div style={{ background: 'var(--ink-12)', padding: '16px 18px', borderRadius: 12, marginBottom: 20, border: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginBottom: 12 }}>
                    4. Faculty &amp; Institutional Credentials
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--grey)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Presenter's Name</label>
                      <input
                        type="text"
                        className="zinput"
                        style={{ width: '100%', fontSize: 13.5 }}
                        value={pptFacultyName}
                        onChange={(e) => setPptFacultyName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--grey)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Presenter's ID</label>
                      <input
                        type="text"
                        className="zinput"
                        style={{ width: '100%', fontSize: 13.5 }}
                        value={pptFacultyId}
                        onChange={(e) => setPptFacultyId(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--grey)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Department</label>
                      <input
                        type="text"
                        className="zinput"
                        style={{ width: '100%', fontSize: 13.5 }}
                        value={pptDepartment}
                        onChange={(e) => setPptDepartment(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--grey)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Lecture Number</label>
                      <input
                        type="text"
                        className="zinput"
                        style={{ width: '100%', fontSize: 13.5 }}
                        value={pptLectureNum}
                        onChange={(e) => setPptLectureNum(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Extra Options Toggles */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginBottom: 10 }}>
                    5. Slide Content &amp; Visual Component Inclusions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <label className="toggle-card">
                      <input
                        type="checkbox"
                        checked={pptFlowcharts}
                        onChange={(e) => setPptFlowcharts(e.target.checked)}
                      />
                      <div className="toggle-card__body">
                        <span className="toggle-card__title">🔀 Flowcharts &amp; Pipelines</span>
                        <span className="toggle-card__sub">Multi-stage vector process diagrams</span>
                      </div>
                    </label>

                    <label className="toggle-card">
                      <input
                        type="checkbox"
                        checked={pptDiagrams}
                        onChange={(e) => setPptDiagrams(e.target.checked)}
                      />
                      <div className="toggle-card__body">
                        <span className="toggle-card__title">🏛️ Architecture Tiers</span>
                        <span className="toggle-card__sub">Multi-tier modular framework blocks</span>
                      </div>
                    </label>

                    <label className="toggle-card">
                      <input
                        type="checkbox"
                        checked={pptTables}
                        onChange={(e) => setPptTables(e.target.checked)}
                      />
                      <div className="toggle-card__body">
                        <span className="toggle-card__title">📊 Benchmark Tables</span>
                        <span className="toggle-card__sub">Comparative quantitative metrics</span>
                      </div>
                    </label>

                    <label className="toggle-card">
                      <input
                        type="checkbox"
                        checked={pptNotes}
                        onChange={(e) => setPptNotes(e.target.checked)}
                      />
                      <div className="toggle-card__body">
                        <span className="toggle-card__title">🎙️ Speaker Notes</span>
                        <span className="toggle-card__sub">Pedagogical notes on every slide</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 6. Custom Subtopics / Outline (Optional) */}
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                    6. Custom Specific Subtopics / Outline Focus (Optional)
                  </label>
                  <textarea
                    className="zinput"
                    style={{ width: '100%', minHeight: 60, fontSize: 13.5, padding: '10px 14px', resize: 'vertical' }}
                    placeholder="e.g. Cloud Identity Management, Microservices Security, Resilience Testing (Optional: will be researched and integrated directly into slides)"
                    value={pptCustomSubtopics}
                    onChange={(e) => setPptCustomSubtopics(e.target.value)}
                  />
                </div>

                {/* Submit Action */}
                <div>
                  <button
                    type="submit"
                    className="btn btn--orange"
                    disabled={isPptGenerating}
                    style={{ padding: '14px 28px', fontSize: 15, fontWeight: 700, width: '100%', maxWidth: 360 }}
                  >
                    {isPptGenerating ? (
                      <><span className="spinner"></span> Generating Presentation Deck...</>
                    ) : (
                      <>⚡ Generate Presentation (.pptx) <span className="btn__arrow">→</span></>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Real-Time Progress Tracker */}
            {isPptGenerating && (
              <div className="upload-level" style={{ marginTop: 24 }}>
                <div className="upload-level__head">
                  <div className="upload-level__title">
                    <span className="upload-level__icon">⚡</span>
                    <span>SLIDE MAKER ENGINE</span>
                  </div>
                  <div className="upload-level__badge">{pptProgressBadge}</div>
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
                  <div className="upload-level__status-text">{pptProgressStatus}</div>
                  <div className="upload-level__pct">{pptProgressPct}%</div>
                </div>

                <div className="upload-level__meter">
                  <div className="upload-level__bar" style={{ width: `${pptProgressPct}%` }}>
                    <div className="upload-level__shimmer"></div>
                  </div>
                </div>

                <div className="upload-level__steps">
                  <div className={`upload-level__step ${pptProgressStep >= 1 ? 'active' : ''}`}>
                    <span className="step-num">1</span>
                    <span className="step-txt">Web Research</span>
                  </div>
                  <div className={`upload-level__step ${pptProgressStep >= 2 ? 'active' : ''}`}>
                    <span className="step-num">2</span>
                    <span className="step-txt">Synthesize</span>
                  </div>
                  <div className={`upload-level__step ${pptProgressStep >= 3 ? 'active' : ''}`}>
                    <span className="step-num">3</span>
                    <span className="step-txt">Vector Diagrams</span>
                  </div>
                  <div className={`upload-level__step ${pptProgressStep >= 4 ? 'active' : ''}`}>
                    <span className="step-num">4</span>
                    <span className="step-txt">Compile PPTX</span>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Results Banner & Slide Browser */}
            {pptResult && (
              <div style={{ marginTop: 28 }}>
                <div className="result-card" style={{ border: '2px solid var(--orange)', background: 'var(--white)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                    <div>
                      <div className="result-card__meta">
                        <span className="badge-pill badge--theory">OFFICIAL PPT FORMAT</span>
                        <span className="badge-pill badge--lab" style={{ marginLeft: 6 }}>{pptResult.slides_count} Slides</span>
                      </div>
                      <div className="result-card__title" style={{ marginTop: 10, fontSize: 20 }}>
                        {pptResult.topic}
                      </div>
                      <p className="result-card__desc" style={{ maxWidth: 760, marginTop: 8 }}>
                        Course: {pptResult.course_name} • Presenter: {pptResult.faculty_name} ({pptResult.department}) • Lecture: #{pptResult.lecture_number}. Format contains official slide master, vector diagrams, and Bloom's taxonomy review questions.
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', width: '100%', maxWidth: 300 }}>
                      <a
                        href={pptResult.download_url}
                        download={pptResult.filename}
                        className="btn btn--orange"
                        style={{ padding: '14px 24px', fontSize: 14, fontWeight: 700, width: '100%', textAlign: 'center' }}
                      >
                        Download .pptx Presentation <span className="btn__arrow">↓</span>
                      </a>
                      <span style={{ fontSize: 12, color: 'var(--grey)', fontFamily: 'var(--mono)' }}>
                        {pptResult.filename}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Slide Deck Grid */}
                <div className="zcard" style={{ marginTop: 24 }}>
                  <div className="zcard__head">
                    <div className="zcard__title">
                      <span className="o">📑</span> Generated Slide Deck Structure ({pptResult.slides_count} Slides)
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 18 }}>
                    {(pptResult.slides || []).map((slide) => {
                      let layoutTag = 'Standard Content';
                      let badgeClass = 'badge--theory';
                      const titleLow = (slide.title || '').toLowerCase();
                      if ((slide.layout || '').includes('Title')) {
                        layoutTag = 'Title Slide';
                        badgeClass = 'badge--lab';
                      } else if ((slide.layout || '').includes('Closing')) {
                        layoutTag = 'Closing Slide';
                        badgeClass = 'badge--lab';
                      } else if (titleLow.includes('architecture')) {
                        layoutTag = 'Architecture Tiers';
                      } else if (titleLow.includes('pipeline') || titleLow.includes('flowchart')) {
                        layoutTag = 'Vector Flowchart';
                      } else if (titleLow.includes('comparative') || titleLow.includes('table')) {
                        layoutTag = 'Benchmark Table';
                      } else if (titleLow.includes('trade-off')) {
                        layoutTag = '2-Column Trade-offs';
                      } else if (titleLow.includes('review')) {
                        layoutTag = "Bloom's Review Questions";
                      }

                      return (
                        <div key={slide.slide_number} className="slide-deck-card">
                          <div className="slide-deck-card__head">
                            <span className="slide-deck-card__num">Slide {slide.slide_number}</span>
                            <span className={`badge-pill ${badgeClass}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                              {layoutTag}
                            </span>
                          </div>
                          <div className="slide-deck-card__title">
                            {slide.title || 'Untitled Slide'}
                          </div>
                          <div className="slide-deck-card__snippet">
                            {slide.content_snippet && slide.content_snippet.length ? (
                              slide.content_snippet.map((pt, pti) => (
                                <div key={pti} style={{ marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  • {pt}
                                </div>
                              ))
                            ) : (
                              <div style={{ color: 'var(--grey)', fontStyle: 'italic' }}>Title &amp; Faculty Banner Credentials</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
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
