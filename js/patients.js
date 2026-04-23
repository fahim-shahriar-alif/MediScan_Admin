/**
 * patients.js — Patient records page logic.
 * Requirements: 4.1–4.6
 */

import { requireAdminAuth } from './admin-auth.js';
import { initNav } from './admin-nav.js';
import { getAllPatients, getPatientCounts } from './admin-db.js';

/** All loaded patients (used for client-side filtering). */
let allPatients = [];

// ─── Rendering ───────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

/**
 * Renders a single patient table row.
 * @param {Patient} patient
 * @returns {string} HTML string
 */
export function renderPatientRow(patient) {
  const displayName = patient.displayName || patient.email || 'Unknown';
  const counts = patient.counts || { appointments: 0, analyses: 0, symptoms: 0 };
  return `
    <tr>
      <td>${escapeHtml(displayName)}</td>
      <td>${escapeHtml(patient.email)}</td>
      <td>${formatDate(patient.createdAt)}</td>
      <td>${counts.appointments}</td>
      <td>${counts.analyses}</td>
      <td>${counts.symptoms}</td>
    </tr>`;
}

function renderSkeletonRows(count = 6) {
  return Array.from({ length: count }, () => `
    <tr class="skeleton-row">
      ${Array.from({ length: 6 }, () => `<td><div class="skeleton skeleton-cell" style="width:${60 + (Math.random() * 80 | 0)}px"></div></td>`).join('')}
    </tr>`).join('');
}

function renderRows(patients) {
  const tbody = document.getElementById('patientsBody');
  if (!patients.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">No patients found.</td></tr>`;
    return;
  }
  tbody.innerHTML = patients.map(renderPatientRow).join('');
}

// ─── Client-side search filter ────────────────────────────────────────────────

/**
 * Filters patients by display name or email (case-insensitive).
 * @param {string} query
 * @param {Patient[]} patients
 * @returns {Patient[]}
 */
export function filterPatients(query, patients) {
  const q = query.toLowerCase();
  if (!q) return patients;
  return patients.filter(p =>
    (p.displayName || '').toLowerCase().includes(q) ||
    (p.email       || '').toLowerCase().includes(q)
  );
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const adminUser = await requireAdminAuth();
  initNav(adminUser);

  const tbody = document.getElementById('patientsBody');
  tbody.innerHTML = renderSkeletonRows();

  try {
    const patients = await getAllPatients();

    // Fetch sub-collection counts in parallel
    const withCounts = await Promise.all(
      patients.map(async (p) => {
        try {
          const counts = await getPatientCounts(p.id);
          return { ...p, counts };
        } catch {
          return { ...p, counts: { appointments: 0, analyses: 0, symptoms: 0 } };
        }
      })
    );

    allPatients = withCounts;
    renderRows(allPatients);
  } catch (err) {
    console.error('Failed to load patients:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--danger)">Failed to load patients.</td></tr>`;
  }

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    renderRows(filterPatients(e.target.value, allPatients));
  });
}

init();
