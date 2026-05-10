/* ============================================================
   WELLABE STRATEGY SITE — main.js
   ============================================================ */

const $ = id => document.getElementById(id);
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ============================================================
   1. NAV — active state + hamburger menu
   ============================================================ */
(function initNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  qsa('.nav-link').forEach(a => {
    if (a.getAttribute('href') === page) a.classList.add('active');
  });

  // Hamburger toggle
  const burger = $('nav-hamburger');
  const links  = qs('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      links.classList.toggle('open');
    });
    // Close on link click
    qsa('.nav-link').forEach(a => {
      a.addEventListener('click', () => {
        burger.classList.remove('open');
        links.classList.remove('open');
      });
    });
  }
})();

/* ============================================================
   2. KPI RENDERING
   ============================================================ */
const ENABLER_LINKS = {
  growth:  'growth.html#kpis',
  digital: 'digital.html#kpis',
  capital: 'capital.html#kpis'
};

async function loadKPIs() {
  const summaryEl   = $('kpi-summary');
  const tableEl     = $('kpi-table-body');
  const quarterEls  = qsa('[id="kpi-quarter"]');
  const updatedEl   = $('kpi-updated');

  if (!summaryEl && !tableEl) return;

  let data;
  try {
    const res = await fetch('data/kpis.json');
    data = await res.json();
  } catch(e) {
    console.warn('Could not load kpis.json', e);
    return;
  }

  const section = document.body.dataset.section;

  // Quarter label — fill ALL elements with this id
  quarterEls.forEach(el => { el.textContent = data.quarter; });
  if (updatedEl) updatedEl.textContent = 'Updated ' + data.lastUpdated;

  // Summary bar
  if (summaryEl) {
    const sections = section === 'all' ? ['growth','digital','capital'] : [section].filter(Boolean);
    const labels = { growth:'Growth', digital:'Digital-First', capital:'Capital' };
    const isHome = document.body.dataset.section === 'all' && location.pathname.endsWith('index.html') || location.pathname.endsWith('/') || location.pathname === '';

    summaryEl.innerHTML = sections.map(s => {
      const d = data.summary[s];
      if (!d) return '';
      // On home page, make cards clickable links to enabler KPI sections
      const tag   = isHome ? 'a' : 'div';
      const href  = isHome ? `href="${ENABLER_LINKS[s]}"` : '';
      return `
        <${tag} class="kpi-summary-card" ${href}>
          <h4>${labels[s]}</h4>
          <div class="kpi-summary-pills">
            <div class="kpi-pill green"><span class="kpi-count">${d.green}</span> Green</div>
            ${d.yellow > 0 ? `<div class="kpi-pill yellow"><span class="kpi-count">${d.yellow}</span> Yellow</div>` : ''}
            ${d.red > 0    ? `<div class="kpi-pill red"><span class="kpi-count">${d.red}</span> Red</div>` : ''}
          </div>
          ${isHome ? `<div style="font-size:0.72rem;font-weight:700;color:var(--wb-yellow-dark);text-transform:uppercase;letter-spacing:0.06em;margin-top:auto;padding-top:0.5rem;">View KPIs →</div>` : ''}
        </${tag}>`;
    }).join('');
  }

  // KPI table
  if (tableEl) {
    const sections = section === 'all' ? ['growth','digital','capital'] : [section].filter(Boolean);
    let rows = [];
    sections.forEach(s => {
      (data[s] || []).forEach(kpi => {
        const dot      = `<span class="status-dot ${kpi.status}"></span>`;
        const chip     = `<span class="status-chip ${kpi.status}">${dot}${cap(kpi.status)}</span>`;
        const typeBadge= `<span class="kpi-type-badge">${kpi.type}</span>`;
        const dept     = kpi.department ? `<span class="kpi-dept">${kpi.department}</span>` : '';
        rows.push(`
          <tr>
            <td>
              <div class="kpi-objective">${kpi.objective}</div>
              <div class="kpi-owner">${kpi.owner}${dept ? ' · ' : ''}${dept}</div>
            </td>
            <td>${typeBadge}</td>
            <td>${chip}</td>
            <td class="kpi-narrative">${kpi.narrative}</td>
          </tr>`);
      });
    });
    tableEl.innerHTML = rows.join('');
  }
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ============================================================
   3. LEARNING & DECISIONS EDITOR
   ============================================================ */
const LD_KEY = 'wellabe_learning_decisions';

function getLDItems(def) {
  try { const r = localStorage.getItem(LD_KEY); if (r) return JSON.parse(r); } catch(e) {}
  return def || [];
}
function saveLDItems(items) { localStorage.setItem(LD_KEY, JSON.stringify(items)); }

const TYPE_LABELS  = { decision:'📋 Decision', assumption:'⚠️ Assumption Changed', risk:'🔴 Risk' };
const TYPE_CLASSES = { decision:'decision', assumption:'assumption', risk:'risk' };

function renderLDItems(items, container) {
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;color:var(--wb-muted);">
        <div style="font-size:2rem;margin-bottom:0.75rem;">📋</div>
        <p style="font-weight:600;">No entries yet.</p>
        <p style="font-size:0.85rem;margin-top:0.5rem;">Click "Add Entry" to record a decision, changed assumption, or risk.</p>
      </div>`;
    return;
  }
  container.innerHTML = items.map((item, idx) => {
    const descParas = escHtml(item.description)
      .split('\\n\\n')
      .map(p => `<p class="learning-item-body" style="margin-bottom:0.6rem">${p.replace(/\\n/g,'<br>')}</p>`)
      .join('');
    return `
    <div class="learning-item" data-idx="${idx}">
      <div class="learning-item-header">
        <div>
          <span class="learning-item-type ${TYPE_CLASSES[item.type]}">${TYPE_LABELS[item.type]}</span>
          <h4 style="margin-top:0.5rem">${escHtml(item.title)}</h4>
          <div class="learning-item-meta">Owner: ${escHtml(item.owner)} · ${escHtml(item.date)}</div>
        </div>
        <div class="learning-item-actions">
          <button class="btn btn-ghost ld-edit" data-idx="${idx}" style="font-size:0.78rem;padding:0.25rem 0.6rem">Edit</button>
          <button class="btn btn-danger ld-delete" data-idx="${idx}" style="font-size:0.78rem;padding:0.25rem 0.6rem">Delete</button>
        </div>
      </div>
      ${descParas}
      ${item.impact ? `<div class="learning-item-impact">Impact: ${escHtml(item.impact)}</div>` : ''}
    </div>`;
  }).join('');

  qsa('.ld-edit', container).forEach(btn => {
    btn.addEventListener('click', () => openLDModal(parseInt(btn.dataset.idx)));
  });
  qsa('.ld-delete', container).forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this entry?')) {
        const items = getLDItems([]);
        items.splice(parseInt(btn.dataset.idx), 1);
        saveLDItems(items);
        renderLDItems(items, container);
      }
    });
  });
}

function initLDEditor(defaultItems) {
  const container = $('ld-items');
  const addBtn    = $('ld-add-btn');
  const modal     = $('ld-modal');
  const form      = $('ld-form');
  const cancelBtn = $('ld-cancel');
  if (!container) return;

  const existingRaw = localStorage.getItem(LD_KEY);
  if (!existingRaw && defaultItems && defaultItems.length > 0) {
    const real = defaultItems.filter(i => i.title && !i.title.startsWith('['));
    if (real.length > 0) saveLDItems(real);
  }

  let items = getLDItems([]);
  renderLDItems(items, container);

  qsa('.ld-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.ld-filter').forEach(b => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      const filter = btn.dataset.filter;
      const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);
      renderLDItems(filtered, container);
    });
  });

  if (addBtn) addBtn.addEventListener('click', () => openLDModal(null));
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeLDModal());
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeLDModal(); });

  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const idx = parseInt($('ld-edit-idx').value);
    const entry = {
      id: 'ld_' + Date.now(),
      type: fd.get('type'), date: fd.get('date'),
      title: fd.get('title'), owner: fd.get('owner'),
      description: fd.get('description'), impact: fd.get('impact')
    };
    items = getLDItems([]);
    if (!isNaN(idx) && idx >= 0) { entry.id = items[idx].id; items[idx] = entry; }
    else { items.push(entry); }
    saveLDItems(items);
    renderLDItems(items, container);
    closeLDModal();
  });
}

function openLDModal(idx) {
  const modal = $('ld-modal');
  const title = $('ld-modal-title');
  const idxEl = $('ld-edit-idx');
  const form  = $('ld-form');
  if (!modal) return;
  if (idx !== null && idx >= 0) {
    const item = getLDItems([])[idx];
    title.textContent = 'Edit Entry';
    idxEl.value = idx;
    form['type'].value = item.type; form['date'].value = item.date;
    form['title'].value = item.title; form['owner'].value = item.owner;
    form['description'].value = item.description; form['impact'].value = item.impact || '';
  } else {
    title.textContent = 'Add Entry';
    idxEl.value = '-1';
    form.reset();
    form['date'].value = currentQuarter();
  }
  modal.classList.add('open');
}

function closeLDModal() {
  const modal = $('ld-modal');
  if (modal) modal.classList.remove('open');
}

function currentQuarter() {
  const d = new Date(); const q = Math.ceil((d.getMonth()+1)/3);
  return `Q${q} ${d.getFullYear()}`;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ============================================================
   4. QUARTERLY PAGE — quarter selector
   ============================================================ */
function initQuarterSelector() {
  const sel = $('quarter-selector');
  if (!sel) return;
  sel.addEventListener('change', () => {
    const q = sel.value;
    // Update the displayed quarter label everywhere
    qsa('[id="kpi-quarter"]').forEach(el => { el.textContent = q; });
    // Update page heading
    const h1 = $('memo-title');
    if (h1) h1.textContent = `${q} Management Memo`;
    // Swap memo blocks if we have data for the quarter
    // (currently only Q1 2026 has content — future quarters show placeholder)
    const memoSection = $('memo-section');
    const futureNotice = $('future-memo-notice');
    if (q === 'Q1 2026') {
      if (memoSection) memoSection.style.display = '';
      if (futureNotice) futureNotice.style.display = 'none';
    } else {
      if (memoSection) memoSection.style.display = 'none';
      if (futureNotice) {
        futureNotice.style.display = '';
        futureNotice.querySelector('strong').textContent = q;
      }
    }
    // Update page title
    document.title = `${q} Operating View — Wellabe`;
  });
}

/* ============================================================
   5. FEEDBACK / QUESTIONS FORM
   ============================================================ */
function initFeedbackForm() {
  const form = $('feedback-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name    = form['feedback-name'].value.trim();
    const type    = form['feedback-type'].value;
    const message = form['feedback-message'].value.trim();
    if (!message) return;
    const subject = encodeURIComponent(`Wellabe Strategy Site — ${type}: ${message.slice(0,60)}`);
    const body    = encodeURIComponent(`From: ${name || 'Anonymous'}\nType: ${type}\n\n${message}`);
    window.location.href = `mailto:mjohnson@wellabe.com?subject=${subject}&body=${body}`;
    // Show confirmation
    const conf = $('feedback-confirm');
    if (conf) { conf.style.display = 'block'; form.reset(); }
  });
}

/* ============================================================
   6. BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadKPIs();
  initQuarterSelector();
  initFeedbackForm();

  if ($('ld-items')) {
    let defaults = [];
    try {
      const res = await fetch('data/kpis.json');
      const d = await res.json();
      defaults = d.learningAndDecisions || [];
    } catch(e) {}
    initLDEditor(defaults);
  }
});
