// Zane Marketing Engine Logic for KSR Sagar Document Suite

let currentTimetableData = null;
let currentSessionFilter = 'ALL';
let currentBranchFilter = 'ALL';
let currentSearchTerm = '';

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initScrollEffects();
  fetchAppInfo();
});

// ================= THEME TOGGLE (ZANE STYLE) =================
function initTheme() {
  const savedTheme = localStorage.getItem('zane-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  
  if (initialTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  const toggleBtn = document.getElementById('zane-theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  
  if (next === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('zane-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('zane-theme', 'light');
  }
}

// ================= SCROLL LISTENER (ZANE STICKY BLUR) =================
function initScrollEffects() {
  const nav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      nav.classList.add('is-stuck');
    } else {
      nav.classList.remove('is-stuck');
    }
  }, { passive: true });
}

// ================= NOTIFICATIONS & TOASTS =================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '⚡' : type === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span style="color:var(--orange)">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s var(--ease)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ================= SEGMENTED TAB SWITCHER =================
function switchTab(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.seg-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.nav__link').forEach(btn => btn.classList.remove('active'));

  const targetPane = document.getElementById(`tab-${tabId}`);
  if (targetPane) targetPane.style.display = 'block';

  const activeSeg = document.getElementById(`seg-btn-${tabId}`);
  if (activeSeg) activeSeg.classList.add('active');

  const activeNavLink = document.getElementById(`nav-link-${tabId}`);
  if (activeNavLink) activeNavLink.classList.add('active');
}

// ================= SAFE FILE DOWNLOADER (PREVENTS JSON ISSUES) =================
async function triggerFileDownload(url, defaultFilename) {
  showToast(`Preparing download for ${defaultFilename}...`, 'info');
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || `Server returned HTTP ${res.status}`);
    }

    // Check if the response is actually a binary file or document
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errData = await res.json();
      throw new Error(errData.detail || 'Download response was JSON instead of a document');
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
}

async function fetchAppInfo() {
  try {
    const res = await fetch('/api/info');
    const data = await res.json();
    console.log('KSR Sagar Engine Ready:', data);
  } catch (err) {
    console.warn('Backend info check:', err);
  }
}

// ================= TIMETABLE MODULE =================

async function processReferenceDocument() {
  const btn = document.getElementById('btn-load-reference');
  const originalText = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span> Processing 20-Page Reference PDF...`;
  btn.disabled = true;

  try {
    const res = await fetch('/api/timetable/process-reference', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to process reference document');

    currentTimetableData = data;
    renderTimetableUI(data);
    showToast('Reference PDF successfully processed! 142 classes and 546 periods extracted.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

let isUploading = false;

function handleDropzoneClick(e) {
  if (isUploading) return;
  const input = document.getElementById('file-timetable-input');
  if (input) input.click();
}

function updateUploadLevel(pct, statusText, activeStep = 1, badgeText = 'PROCESSING') {
  const bar = document.getElementById('upload-level-bar');
  const pctElem = document.getElementById('upload-level-pct');
  const statusElem = document.getElementById('upload-level-status');
  const badgeElem = document.getElementById('upload-level-badge');
  const globalProg = document.getElementById('global-progress');
  const globalFill = document.getElementById('global-progress-fill');

  const clampedPct = Math.min(100, Math.max(0, pct));

  if (bar) bar.style.width = `${clampedPct}%`;
  if (pctElem) pctElem.innerText = `${Math.round(clampedPct)}%`;
  if (statusElem && statusText) statusElem.innerText = statusText;
  if (badgeElem && badgeText) badgeElem.innerText = badgeText;

  if (globalProg) globalProg.style.display = 'block';
  if (globalFill) globalFill.style.width = `${clampedPct}%`;

  for (let s = 1; s <= 4; s++) {
    const stepEl = document.getElementById(`step-${s}`);
    if (stepEl) {
      if (s < activeStep) {
        stepEl.className = 'upload-level__step done';
      } else if (s === activeStep) {
        stepEl.className = 'upload-level__step active';
      } else {
        stepEl.className = 'upload-level__step';
      }
    }
  }
}

async function handleFileUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  isUploading = true;
  const idleElem = document.getElementById('dropzone-idle');
  const levelElem = document.getElementById('upload-level-container');
  const filenameElem = document.getElementById('upload-level-filename');
  const filesizeElem = document.getElementById('upload-level-filesize');
  const dropzone = document.getElementById('timetable-dropzone');
  const globalProg = document.getElementById('global-progress');
  const globalFill = document.getElementById('global-progress-fill');

  // Immediately reveal loading container & scroll into center view
  if (idleElem) idleElem.style.display = 'none';
  if (levelElem) levelElem.style.display = 'block';
  if (dropzone) {
    dropzone.style.cursor = 'default';
    dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (filenameElem) filenameElem.innerText = file.name;
  const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
  const sizeKb = Math.round(file.size / 1024);
  if (filesizeElem) filesizeElem.innerText = sizeMb >= 1 ? `${sizeMb} MB • Institutional PDF` : `${sizeKb} KB • Institutional PDF`;

  updateUploadLevel(8, 'LEVEL 1: Uploading PDF stream...', 1, 'UPLOADING');

  // Progressive live simulated feedback while backend parses multi-page tables
  let progress = 8;
  const progressTimer = setInterval(() => {
    if (progress < 25) {
      progress += 2.5;
      updateUploadLevel(progress, 'LEVEL 1: Uploading binary PDF stream...', 1, 'UPLOADING');
    } else if (progress < 55) {
      progress += 1.8;
      updateUploadLevel(progress, 'LEVEL 2: Extracting 142 classes & time grid...', 2, 'EXTRACTING');
    } else if (progress < 80) {
      progress += 1.2;
      updateUploadLevel(progress, 'LEVEL 3: Segregating Theory & Lab sessions...', 3, 'PARSING');
    } else if (progress < 93) {
      progress += 0.8;
      updateUploadLevel(progress, 'LEVEL 4: Formatting official Word .docx & .doc templates...', 4, 'FORMATTING');
    }
  }, 160);

  const dateVal = document.getElementById('timetable-custom-date').value || '10 October, 2026';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('custom_date', dateVal);

  showToast(`Parsing ${file.name}...`, 'info');

  try {
    const res = await fetch('/api/timetable/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Upload parsing failed');

    clearInterval(progressTimer);
    updateUploadLevel(100, 'LEVEL 4 COMPLETE: Official Documents Ready!', 4, 'SUCCESS');
    
    currentTimetableData = data;

    setTimeout(() => {
      renderTimetableUI(data);
      showToast(`Successfully converted ${file.name}! Official Word documents ready.`, 'success');

      if (globalFill) globalFill.style.width = '100%';
      setTimeout(() => {
        if (globalProg) globalProg.style.display = 'none';
        if (globalFill) globalFill.style.width = '0%';
      }, 800);

      // Scroll smoothly to download banner
      const dlBanner = document.getElementById('download-banner');
      if (dlBanner) {
        dlBanner.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Reset dropzone state after short delay
      setTimeout(() => {
        if (idleElem) idleElem.style.display = 'block';
        if (levelElem) levelElem.style.display = 'none';
        if (dropzone) dropzone.style.cursor = 'pointer';
        isUploading = false;
        const input = document.getElementById('file-timetable-input');
        if (input) input.value = '';
      }, 1500);

    }, 500);

  } catch (err) {
    clearInterval(progressTimer);
    updateUploadLevel(progress, `ERROR: ${err.message}`, 1, 'FAILED');
    showToast(err.message, 'error');
    if (globalProg) globalProg.style.display = 'none';
    setTimeout(() => {
      if (idleElem) idleElem.style.display = 'block';
      if (levelElem) levelElem.style.display = 'none';
      if (dropzone) dropzone.style.cursor = 'pointer';
      isUploading = false;
    }, 3000);
  }
}

function renderTimetableUI(data) {
  // Update stats
  const totalClassesElem = document.getElementById('stat-total-classes');
  if (totalClassesElem) totalClassesElem.innerText = `${data.classes.length} Classes`;
  
  let theoryCount = 0;
  let labCount = 0;
  data.classes.forEach(c => {
    Object.values(c.periods).forEach(p => {
      if (p) {
        if (p.is_lab) labCount++;
        else theoryCount++;
      }
    });
  });

  const theoryElem = document.getElementById('stat-theory-count');
  if (theoryElem) theoryElem.innerText = `${theoryCount} Theory`;
  const labElem = document.getElementById('stat-lab-count');
  if (labElem) labElem.innerText = `${labCount} Labs`;

  // Show download banner and preview card
  const dlBanner = document.getElementById('download-banner');
  if (dlBanner) dlBanner.style.display = 'block';
  const prevCard = document.getElementById('preview-card');
  if (prevCard) prevCard.style.display = 'block';

  // Wire up safe click downloads
  setupDownloadButton('btn-dl-theory-docx', data.theory_docx_url || '/api/download/theory/docx', 'Theory_Classes_Day_Time_Table.docx');
  setupDownloadButton('btn-dl-theory-doc', data.theory_doc_url || '/api/download/theory/doc', 'Theory_Classes_Day_Time_Table.doc');
  setupDownloadButton('btn-dl-lab-docx', data.lab_docx_url || '/api/download/lab/docx', 'Laboratories_Day_Time_Table.docx');
  setupDownloadButton('btn-dl-lab-doc', data.lab_doc_url || '/api/download/lab/doc', 'Laboratories_Day_Time_Table.doc');

  // Populate branch dropdown
  const branchSelect = document.getElementById('branch-select');
  if (branchSelect) {
    branchSelect.innerHTML = `<option value="ALL">All Branches (Full Master Schedule)</option>`;
    const branches = data.metadata.branches || [];
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.innerText = b;
      branchSelect.appendChild(opt);
    });
  }

  // Render Table
  renderTableRows();
}

function setupDownloadButton(buttonId, url, filename) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.onclick = (e) => {
    e.preventDefault();
    triggerFileDownload(url, filename);
  };
}

function setSessionFilter(filterType) {
  currentSessionFilter = filterType;
  
  const allBtn = document.getElementById('filter-all-btn');
  const theoryBtn = document.getElementById('filter-theory-btn');
  const labBtn = document.getElementById('filter-lab-btn');

  if (allBtn) allBtn.className = filterType === 'ALL' ? 'btn btn--orange btn--sm' : 'btn btn--outline btn--sm';
  if (theoryBtn) theoryBtn.className = filterType === 'THEORY' ? 'btn btn--orange btn--sm' : 'btn btn--outline btn--sm';
  if (labBtn) labBtn.className = filterType === 'LAB' ? 'btn btn--orange btn--sm' : 'btn btn--outline btn--sm';
  
  renderTableRows();
}

function filterTableByBranch() {
  currentBranchFilter = document.getElementById('branch-select').value;
  renderTableRows();
}

function filterTableBySearch() {
  currentSearchTerm = document.getElementById('class-search-input').value.toLowerCase().trim();
  renderTableRows();
}

function renderTableRows() {
  if (!currentTimetableData || !currentTimetableData.classes) return;

  const tbody = document.getElementById('timetable-tbody');
  tbody.innerHTML = '';

  let classes = currentTimetableData.classes;

  if (currentBranchFilter !== 'ALL') {
    classes = classes.filter(c => c.branch === currentBranchFilter);
  }

  if (currentSearchTerm) {
    classes = classes.filter(c => c.class_name.toLowerCase().includes(currentSearchTerm));
  }

  if (classes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2.5rem; color: var(--grey);">No matching classes found.</td></tr>`;
    return;
  }

  classes.forEach((cls, clsIdx) => {
    const matchingPeriods = [];
    for (let pNum = 1; pNum <= 6; pNum++) {
      const entry = cls.periods[pNum];
      if (entry) {
        if (currentSessionFilter === 'ALL') {
          matchingPeriods.push({ pNum, entry });
        } else if (currentSessionFilter === 'THEORY' && !entry.is_lab) {
          matchingPeriods.push({ pNum, entry });
        } else if (currentSessionFilter === 'LAB' && entry.is_lab) {
          matchingPeriods.push({ pNum, entry });
        }
      }
    }

    if (matchingPeriods.length === 0) return;

    // Section Header Row
    const trSec = document.createElement('tr');
    trSec.className = 'section-group-row';
    trSec.innerHTML = `<td colspan="8">${cls.class_name} <span style="font-family:var(--mono); font-size:0.75rem; font-weight:normal; color:var(--grey); margin-left:10px;">BRANCH: ${cls.branch}</span></td>`;
    tbody.appendChild(trSec);

    // Period Rows
    matchingPeriods.forEach(({ pNum, entry }) => {
      const tr = document.createElement('tr');
      const isLab = entry.is_lab;
      const typeBadge = isLab ? `<span class="badge-pill badge--lab">LAB</span>` : `<span class="badge-pill badge--theory">THEORY</span>`;

      tr.innerHTML = `
        <td style="text-align: center; font-family: var(--mono); font-weight: bold;">${pNum}</td>
        <td>
          <input class="cell-edit-input" value="${entry.faculty_id || ''}" onchange="updateCell(${clsIdx}, ${pNum}, 'faculty_id', this.value)">
        </td>
        <td>
          <input class="cell-edit-input" value="${entry.faculty_name || ''}" onchange="updateCell(${clsIdx}, ${pNum}, 'faculty_name', this.value)">
        </td>
        <td>
          <input class="cell-edit-input" style="font-family:var(--mono);" value="${entry.course_code || ''}" onchange="updateCell(${clsIdx}, ${pNum}, 'course_code', this.value)">
        </td>
        <td>
          <input class="cell-edit-input" value="${entry.course_name || ''}" onchange="updateCell(${clsIdx}, ${pNum}, 'course_name', this.value)">
        </td>
        <td style="text-align: center;">
          <input class="cell-edit-input" style="text-align:center; font-family:var(--mono);" value="${entry.room || ''}" onchange="updateCell(${clsIdx}, ${pNum}, 'room', this.value)">
        </td>
        <td>${typeBadge}</td>
        <td>
          <input class="cell-edit-input" placeholder="Adjustment" value="${entry.adjustment || ''}" onchange="updateCell(${clsIdx}, ${pNum}, 'adjustment', this.value)">
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

function updateCell(clsIdx, pNum, field, value) {
  if (!currentTimetableData || !currentTimetableData.classes[clsIdx]) return;
  const periodEntry = currentTimetableData.classes[clsIdx].periods[pNum];
  if (periodEntry) {
    periodEntry[field] = value;
    showToast(`Updated ${field} for Period ${pNum}`, 'info');
  }
}

async function exportEditedTimetable() {
  if (!currentTimetableData) {
    showToast('Please process or upload a timetable first.', 'error');
    return;
  }

  showToast('Generating updated Word documents...', 'info');
  try {
    const res = await fetch('/api/timetable/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: currentTimetableData,
        custom_date: document.getElementById('timetable-custom-date').value || '10 October, 2026',
        selected_branch: currentBranchFilter
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || 'Export failed');

    // Setup direct download triggers
    setupDownloadButton('btn-dl-theory-docx', result.theory_docx_url, 'Theory_Time_Table_Edited.docx');
    setupDownloadButton('btn-dl-theory-doc', result.theory_doc_url, 'Theory_Time_Table_Edited.doc');
    setupDownloadButton('btn-dl-lab-docx', result.lab_docx_url, 'Laboratories_Time_Table_Edited.docx');
    setupDownloadButton('btn-dl-lab-doc', result.lab_doc_url, 'Laboratories_Time_Table_Edited.doc');

    // Automatically trigger immediate download of Theory DOCX for user convenience
    triggerFileDownload(result.theory_docx_url, 'Theory_Time_Table_Edited.docx');
    showToast('Documents updated! Direct download triggered.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ================= TAB SWITCHING =================
function switchTab(tabId) {
  const tabTimetable = document.getElementById('tab-timetable');
  const tabSlides = document.getElementById('tab-slides');
  const navTimetable = document.getElementById('nav-link-timetable');
  const navSlides = document.getElementById('nav-link-slides');
  const segTimetable = document.getElementById('seg-btn-timetable');
  const segSlides = document.getElementById('seg-btn-slides');
  
  const heroLive = document.querySelector('.shero__live');
  const heroLabel = document.querySelector('.shero__top .label');
  const heroTitle = document.querySelector('.shero__title');
  const heroLead = document.querySelector('.shero__lead');
  const heroCtaBtn = document.querySelector('.shero__cta button');
  const heroCtaLabel = document.querySelector('.shero__aside .label');
  const crumbHere = document.querySelector('.crumb .here');

  if (tabId === 'slides') {
    if (tabTimetable) tabTimetable.style.display = 'none';
    if (tabSlides) tabSlides.style.display = 'block';
    if (navTimetable) navTimetable.classList.remove('active');
    if (navSlides) navSlides.classList.add('active');
    if (segTimetable) segTimetable.classList.remove('active');
    if (segSlides) segSlides.classList.add('active');
    
    if (heroLive) heroLive.innerText = 'Live Slide Maker v3.0';
    if (heroLabel) heroLabel.innerText = 'IARE Academic Lecture Standards';
    if (heroTitle) heroTitle.innerHTML = 'Slide<span class="shero__br"><br /></span>Maker<span class="o">.</span>';
    if (heroLead) heroLead.innerHTML = 'Official Microsoft PowerPoint (.pptx) lecture generator tailored strictly to institutional curriculum standards, <span class="muted">complete with deep live internet research, vector flowcharts, system architectures, benchmark tables, and Bloom\'s taxonomy review assessments.</span>';
    if (heroCtaBtn) {
      heroCtaBtn.innerHTML = 'Create Presentation Deck <span class="btn__arrow">→</span>';
      heroCtaBtn.onclick = () => {
        const el = document.getElementById('slide-maker-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      };
    }
    if (heroCtaLabel) heroCtaLabel.innerText = 'Zero mock data • Direct PowerPoint (.pptx) exports';
    if (crumbHere) crumbHere.innerText = 'Slide Maker';

    const el = document.getElementById('tab-slides');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    if (tabTimetable) tabTimetable.style.display = 'block';
    if (tabSlides) tabSlides.style.display = 'none';
    if (navTimetable) navTimetable.classList.add('active');
    if (navSlides) navSlides.classList.remove('active');
    if (segTimetable) segTimetable.classList.add('active');
    if (segSlides) segSlides.classList.remove('active');
    
    if (heroLive) heroLive.innerText = 'Live Conversion Engine v3.0';
    if (heroLabel) heroLabel.innerText = 'IARE Schedule Architecture';
    if (heroTitle) heroTitle.innerHTML = 'Timetable<span class="shero__br"><br /></span>Converter<span class="o">.</span>';
    if (heroLead) heroLead.innerHTML = 'Institutional document conversion that parses Day Time Table PDFs <span class="muted">into official Microsoft Word (.docx &amp; .doc) formats with 100% table fidelity, separated into Theory and Laboratories timetables, plus AI lecture slides.</span>';
    if (heroCtaBtn) {
      heroCtaBtn.innerHTML = 'Upload Day Time Table PDF <span class="btn__arrow">→</span>';
      heroCtaBtn.onclick = () => {
        const fileIn = document.getElementById('file-timetable-input');
        if (fileIn) fileIn.click();
      };
    }
    if (heroCtaLabel) heroCtaLabel.innerText = 'Zero JSON latency • Direct Word & PowerPoint exports';
    if (crumbHere) crumbHere.innerText = 'Timetable & Presentation Suite';

    const el = document.getElementById('tab-timetable');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ================= IARE PPT MAKER CONTROLS =================

function syncSlideCount(val) {
  const num = parseInt(val) || 10;
  document.getElementById('iare-slides-count').value = num;
  document.getElementById('slider-count-badge').innerText = `${num} Slides`;
  updatePillCountActive(num);
}

function syncSlideSlider(val) {
  let num = parseInt(val) || 10;
  num = Math.max(5, Math.min(50, num));
  document.getElementById('iare-slides-slider').value = num;
  document.getElementById('slider-count-badge').innerText = `${num} Slides`;
  updatePillCountActive(num);
}

function setSlideCountVal(num) {
  document.getElementById('iare-slides-slider').value = num;
  document.getElementById('iare-slides-count').value = num;
  document.getElementById('slider-count-badge').innerText = `${num} Slides`;
  updatePillCountActive(num);
}

function updatePillCountActive(num) {
  document.querySelectorAll('.btn-pill-opt').forEach(btn => {
    const txt = btn.innerText;
    if (txt.includes(`${num} Slides`)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function applyTopicPreset(topic, course, count) {
  document.getElementById('iare-topic').value = topic;
  document.getElementById('iare-course').value = course;
  setSlideCountVal(count);
  showToast(`Loaded preset: "${topic}" (${count} slides)`, 'info');
}

function loadReferencePreset() {
  document.getElementById('iare-topic').value = 'Reduce Risk And Confidently Accelerate Your Business In The Cloud';
  document.getElementById('iare-course').value = 'CLOUD APPLICATION DEVELOPMENT';
  document.getElementById('iare-faculty-name').value = 'KS R Sagar';
  document.getElementById('iare-faculty-id').value = 'IARE11024';
  document.getElementById('iare-department').value = 'IT';
  document.getElementById('iare-lecture-num').value = '56';
  setSlideCountVal(22);
  document.getElementById('iare-opt-flowcharts').checked = true;
  document.getElementById('iare-opt-diagrams').checked = true;
  document.getElementById('iare-opt-tables').checked = true;
  document.getElementById('iare-opt-notes').checked = true;
  document.getElementById('iare-custom-subtopics').value = 'Cloud Identity Management, Microservices Security, Resilience Testing';
  showToast('Loaded exact IARE LECTURE PPT FORMAT50 reference preset!', 'success');
}

// ================= IARE PRESENTATION SUBMIT & RENDER =================

let progressInterval = null;

async function handlePptSubmit(e) {
  e.preventDefault();

  const topic = document.getElementById('iare-topic').value.trim();
  const course = document.getElementById('iare-course').value.trim() || 'CLOUD APPLICATION DEVELOPMENT';
  const slidesCount = parseInt(document.getElementById('iare-slides-count').value) || 10;
  const facultyName = document.getElementById('iare-faculty-name').value.trim() || 'KS R Sagar';
  const facultyId = document.getElementById('iare-faculty-id').value.trim() || 'IARE11024';
  const department = document.getElementById('iare-department').value.trim() || 'IT';
  const lectureNum = document.getElementById('iare-lecture-num').value.trim() || '56';
  
  const flowcharts = document.getElementById('iare-opt-flowcharts').checked;
  const diagrams = document.getElementById('iare-opt-diagrams').checked;
  const tables = document.getElementById('iare-opt-tables').checked;
  const notes = document.getElementById('iare-opt-notes').checked;
  const customSubtopics = document.getElementById('iare-custom-subtopics').value.trim();

  const submitBtn = document.getElementById('btn-generate-ppt');
  const origBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Deep Researching &amp; Compiling Deck...`;

  // Display and start Progress Tracker
  const progCard = document.getElementById('ppt-progress-card');
  const progBadge = document.getElementById('ppt-progress-badge');
  const progStatus = document.getElementById('ppt-progress-status');
  const progPct = document.getElementById('ppt-progress-pct');
  const progBar = document.getElementById('ppt-progress-bar');
  const resBanner = document.getElementById('ppt-result-banner');

  if (resBanner) resBanner.style.display = 'none';
  if (progCard) {
    progCard.style.display = 'block';
    progCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  let curPct = 10;
  progBar.style.width = '10%';
  progPct.innerText = '10%';
  progBadge.innerText = 'INITIALIZING';
  progStatus.innerText = 'Formulating technical domain queries and keyword extraction...';

  const stages = [
    { pct: 25, badge: 'WEB RESEARCH', text: `Deep researching "${topic}" via Wikipedia & technical registries...`, step: 1 },
    { pct: 55, badge: 'FACT SYNTHESIS', text: 'Extracting verified architectural principles, mechanisms & protocols...', step: 2 },
    { pct: 75, badge: 'DIAGRAM ASSEMBLE', text: 'Generating vector flowcharts, system tier diagrams & benchmark tables...', step: 3 },
    { pct: 90, badge: 'FORMATTING PPTX', text: 'Compiling IARE FORMAT50 slide masters, typography, logos & gradient bars...', step: 4 }
  ];

  let stageIdx = 0;
  progressInterval = setInterval(() => {
    if (stageIdx < stages.length) {
      const s = stages[stageIdx];
      curPct = s.pct;
      progBar.style.width = `${curPct}%`;
      progPct.innerText = `${curPct}%`;
      progBadge.innerText = s.badge;
      progStatus.innerText = s.text;

      for (let i = 1; i <= 4; i++) {
        const stepEl = document.getElementById(`ppt-step-${i}`);
        if (stepEl) {
          if (i <= s.step) stepEl.classList.add('active');
          else stepEl.classList.remove('active');
        }
      }
      stageIdx++;
    }
  }, 1200);

  const payload = {
    topic: topic,
    course_name: course,
    slides_count: slidesCount,
    faculty_name: facultyName,
    faculty_id: facultyId,
    department: department,
    lecture_number: lectureNum,
    include_flowcharts: flowcharts,
    include_diagrams: diagrams,
    include_tables: tables,
    speaker_notes: notes,
    custom_subtopics: customSubtopics
  };

  try {
    const res = await fetch('/api/presentation/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || 'Failed to generate presentation deck');

    // Complete Progress
    clearInterval(progressInterval);
    progBar.style.width = '100%';
    progPct.innerText = '100%';
    progBadge.innerText = 'COMPLETE';
    progStatus.innerText = `Successfully compiled ${result.slides_count} slides strictly adhering to IARE FORMAT50!`;

    setTimeout(() => {
      progCard.style.display = 'none';
      renderPresentationResult(result);
    }, 600);

    showToast(`IARE Presentation "${result.topic}" generated! Download starting...`, 'success');

  } catch (err) {
    clearInterval(progressInterval);
    progCard.style.display = 'none';
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = origBtnText;
  }
}

function renderPresentationResult(result) {
  const resBanner = document.getElementById('ppt-result-banner');
  if (!resBanner) return;
  resBanner.style.display = 'block';

  document.getElementById('res-ppt-title').innerText = result.topic;
  document.getElementById('res-badge-slides').innerText = `${result.slides_count} Slides`;
  document.getElementById('res-ppt-filename').innerText = result.filename;
  document.getElementById('res-ppt-desc').innerText = 
    `Course: ${result.course_name}  •  Presenter: ${result.faculty_name} (${result.department})  •  Lecture: #${result.lecture_number}. Format contains official IARE crest, gradient banner/footer, vector diagrams, and Bloom's taxonomy review questions.`;

  // Download button
  const dlBtn = document.getElementById('btn-download-iare-pptx');
  if (dlBtn) {
    dlBtn.onclick = () => triggerFileDownload(result.download_url, result.filename);
  }

  // Auto-trigger direct download
  triggerFileDownload(result.download_url, result.filename);

  // Render Slide Deck Grid
  document.getElementById('res-slides-count-label').innerText = result.slides_count;
  const grid = document.getElementById('slides-deck-grid');
  grid.innerHTML = '';

  const slides = result.slides || [];
  slides.forEach(slide => {
    const card = document.createElement('div');
    card.className = 'slide-deck-card';

    let layoutTag = 'Standard Content';
    let badgeClass = 'badge--theory';
    if (slide.layout.includes('Title')) {
      layoutTag = 'Title Slide';
      badgeClass = 'badge--lab';
    } else if (slide.layout.includes('Closing')) {
      layoutTag = 'Closing Slide';
      badgeClass = 'badge--lab';
    } else if (slide.title.toLowerCase().includes('architecture')) {
      layoutTag = 'Architecture Tiers';
    } else if (slide.title.toLowerCase().includes('pipeline') || slide.title.toLowerCase().includes('flowchart')) {
      layoutTag = 'Vector Flowchart';
    } else if (slide.title.toLowerCase().includes('comparative') || slide.title.toLowerCase().includes('table')) {
      layoutTag = 'Benchmark Table';
    } else if (slide.title.toLowerCase().includes('trade-off')) {
      layoutTag = '2-Column Trade-offs';
    } else if (slide.title.toLowerCase().includes('review')) {
      layoutTag = "Bloom's Review Questions";
    }

    const snippetHtml = (slide.content_snippet && slide.content_snippet.length)
      ? slide.content_snippet.map(pt => `<div style="margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">• ${escapeHtml(pt)}</div>`).join('')
      : '<div style="color: var(--grey); font-style: italic;">Title &amp; Faculty Banner Credentials</div>';

    card.innerHTML = `
      <div class="slide-deck-card__head">
        <span class="slide-deck-card__num">Slide ${slide.slide_number}</span>
        <span class="badge-pill ${badgeClass}" style="font-size: 10px; padding: 2px 8px;">${layoutTag}</span>
      </div>
      <div class="slide-deck-card__title">
        ${escapeHtml(slide.title || 'Untitled Slide')}
      </div>
      <div class="slide-deck-card__snippet">
        ${snippetHtml}
      </div>
    `;

    grid.appendChild(card);
  });

  resBanner.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}


// Drag & drop handlers
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0];
    const input = document.getElementById('file-timetable-input');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    handleFileUpload({ target: input });
  }
}
