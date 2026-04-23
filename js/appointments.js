/**
 * appointments.js — Appointments management page logic.
 * Requirements: 3.1–3.8
 */

import { requireAdminAuth } from './admin-auth.js';
import { initNav } from './admin-nav.js';
import { getAllAppointments, updateAppointmentStatus } from './admin-db.js';

/** All loaded appointments (used for client-side filtering). */
let allAppointments = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Rendering ───────────────────────────────────────────────────────────────

/**
 * Renders a single appointment table row.
 * @param {Appointment} appt
 * @returns {string} HTML string
 */
export function renderAppointmentRow(appt) {
  const badgeClass = {
    confirmed: 'badge-confirmed',
    pending:   'badge-pending',
    cancelled: 'badge-cancelled',
  }[appt.status] || 'badge-pending';

  const patientName = appt.patientName || 'Unknown Patient';
  const formattedDate = appt.date ? new Date(appt.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  return `
    <tr data-id="${appt.id}" data-user-id="${appt.userId}">
      <td>${escapeHtml(patientName)}</td>
      <td>${escapeHtml(appt.doctorName)}</td>
      <td>${escapeHtml(formattedDate)}</td>
      <td>${escapeHtml(appt.time)}</td>
      <td>
        <span class="badge ${badgeClass}" id="badge-${appt.id}">${appt.status}</span>
        <div class="row-error" id="err-${appt.id}"></div>
      </td>
      <td>
        <div class="flex gap-2">
          <button class="btn btn-success btn-sm" onclick="confirmAppt('${appt.id}','${appt.userId}')" ${appt.status === 'confirmed' ? 'disabled' : ''}>Confirm</button>
          <button class="btn btn-danger btn-sm"  onclick="cancelAppt('${appt.id}','${appt.userId}')"  ${appt.status === 'cancelled' ? 'disabled' : ''}>Cancel</button>
        </div>
      </td>
    </tr>`;
}

function renderSkeletonRows(count = 5) {
  return Array.from({ length: count }, () => `
    <tr class="skeleton-row">
      ${Array.from({ length: 6 }, () => `<td><div class="skeleton skeleton-cell" style="width:${60 + (Math.random() * 60 | 0)}px"></div></td>`).join('')}
    </tr>`).join('');
}

function renderRows(appointments) {
  const tbody = document.getElementById('appointmentsBody');
  if (!appointments.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">No appointments found.</td></tr>`;
    return;
  }
  tbody.innerHTML = appointments.map(renderAppointmentRow).join('');
}

// ─── Client-side search filter ────────────────────────────────────────────────

/**
 * Filters appointments by patient name or doctor name (case-insensitive).
 * @param {string} query
 * @param {Appointment[]} appointments
 * @returns {Appointment[]}
 */
export function filterAppointments(query, appointments) {
  const q = query.toLowerCase();
  if (!q) return appointments;
  return appointments.filter(a =>
    (a.patientName || '').toLowerCase().includes(q) ||
    (a.doctorName  || '').toLowerCase().includes(q)
  );
}

// ─── Status update ────────────────────────────────────────────────────────────

async function setStatus(appointmentId, userId, newStatus) {
  const badge  = document.getElementById(`badge-${appointmentId}`);
  const errEl  = document.getElementById(`err-${appointmentId}`);
  const prevStatus = badge?.textContent?.trim() || 'pending';
  const prevClass  = badge?.className || '';

  // Optimistic update
  if (badge) {
    badge.textContent = newStatus;
    badge.className = `badge badge-${newStatus}`;
  }
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }

  try {
    await updateAppointmentStatus(userId, appointmentId, newStatus);
    // Update local data
    const appt = allAppointments.find(a => a.id === appointmentId);
    if (appt) appt.status = newStatus;
    // Refresh row buttons
    const row = document.querySelector(`tr[data-id="${appointmentId}"]`);
    if (row) {
      const [confirmBtn, cancelBtn] = row.querySelectorAll('button');
      if (confirmBtn) confirmBtn.disabled = newStatus === 'confirmed';
      if (cancelBtn)  cancelBtn.disabled  = newStatus === 'cancelled';
    }
  } catch (err) {
    console.error('Failed to update appointment status:', err);
    // Revert
    if (badge) { badge.textContent = prevStatus; badge.className = prevClass; }
    if (errEl) { errEl.textContent = 'Update failed. Please try again.'; errEl.classList.add('visible'); }
  }
}

// Expose to inline onclick handlers
window.confirmAppt = (id, userId) => setStatus(id, userId, 'confirmed');
window.cancelAppt  = (id, userId) => setStatus(id, userId, 'cancelled');

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const adminUser = await requireAdminAuth();
  initNav(adminUser);

  const tbody = document.getElementById('appointmentsBody');
  tbody.innerHTML = renderSkeletonRows();

  try {
    allAppointments = await getAllAppointments();
    renderRows(allAppointments);
  } catch (err) {
    console.error('Failed to load appointments:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--danger)">Failed to load appointments.</td></tr>`;
  }

  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    renderRows(filterAppointments(e.target.value, allAppointments));
  });
}

init();
