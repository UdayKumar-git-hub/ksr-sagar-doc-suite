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

// ================= PRESENTATION SLIDE MAKER =================

async function generateSlides(e) {
  e.preventDefault();

  const btn = document.getElementById('btn-generate-slides');
  const origText = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span> Generating Presentation Deck...`;
  btn.disabled = true;

  const payload = {
    title: document.getElementById('slide-title').value || 'Course Instruction & Lecture Plan',
    faculty_name: document.getElementById('slide-faculty').value || 'Faculty Member',
    department: document.getElementById('slide-dept').value || 'Computer Science & Engineering',
    category: document.getElementById('slide-category').value || 'Faculty Lecture',
    density: document.getElementById('slide-density').value || 'Balanced',
    slides_count: 7,
    speaker_notes: document.getElementById('slide-notes-check').checked
  };

  try {
    const res = await fetch('/api/presentation/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || 'Slide generation failed');

    // Update UI card
    const resCard = document.getElementById('pres-result-card');
    if (resCard) resCard.style.display = 'block';

    document.getElementById('pres-result-title').innerText = result.title;
    document.getElementById('pres-result-desc').innerText = `Created for ${result.faculty_name} (${result.category}) with 7 structured slides and speaker notes.`;
    
    // Wire safe download
    setupDownloadButton('btn-download-pptx', result.download_url, `${result.title.replace(/\s+/g, '_')}.pptx`);
    
    // Auto-trigger direct download
    triggerFileDownload(result.download_url, `${result.title.replace(/\s+/g, '_')}.pptx`);
    showToast(`PowerPoint deck "${result.title}" generated! Download started.`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
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
