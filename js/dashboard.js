/**
 * dashboard.js — Dashboard statistics page logic.
 */

import { requireAdminAuth } from './admin-auth.js';
import { initNav } from './admin-nav.js';
import { getDashboardStats, getAllAppointments } from './admin-db.js';

const STATS_CONFIG = [
  { key: 'users',        label: 'Total Patients',     iconClass: 'blue',
    icon: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
  { key: 'appointments', label: 'Total Appointments', iconClass: 'green',
    icon: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>` },
  { key: 'analyses',     label: 'Total Scans',        iconClass: 'yellow',
    icon: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` },
  { key: 'symptoms',     label: 'Symptom Checks',     iconClass: 'purple',
    icon: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>` },
];

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function renderStatCard(cfg, value) {
  return `
    <div class="stat-card">
      <div class="stat-icon ${cfg.iconClass}">${cfg.icon}</div>
      <div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${cfg.label}</div>
      </div>
    </div>`;
}

function renderRecentAppointments(appointments) {
  const tbody = document.getElementById('recentAppointmentsBody');
  if (!tbody) return;
  const recent = appointments.slice(0, 8);
  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted);font-size:.85rem">No appointments yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(a => {
    const badgeClass = { confirmed: 'badge-confirmed', pending: 'badge-pending', cancelled: 'badge-cancelled' }[a.status] || 'badge-pending';
    const date = a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
    return `
      <tr>
        <td style="font-size:.85rem">${escapeHtml(a.patientName || 'Unknown')}</td>
        <td style="font-size:.85rem;color:var(--text-muted)">${escapeHtml(a.doctorName)}</td>
        <td style="font-size:.85rem">${date}</td>
        <td><span class="badge ${badgeClass}">${a.status}</span></td>
      </tr>`;
  }).join('');
}

function renderStatusBreakdown(appointments) {
  const el = document.getElementById('statusBreakdown');
  if (!el) return;
  const total = appointments.length || 1;
  const counts = { confirmed: 0, pending: 0, cancelled: 0 };
  appointments.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });

  el.innerHTML = ['confirmed', 'pending', 'cancelled'].map(status => `
    <div class="status-bar-row">
      <span class="status-bar-label">${status}</span>
      <div class="status-bar-track">
        <div class="status-bar-fill ${status}" style="width:${Math.round(counts[status] / total * 100)}%"></div>
      </div>
      <span class="status-bar-count">${counts[status]}</span>
    </div>`).join('');
}

async function init() {
  const adminUser = await requireAdminAuth();
  initNav(adminUser);

  const grid = document.getElementById('statsGrid');

  // Load stats and appointments in parallel
  try {
    const [stats, appointments] = await Promise.all([
      getDashboardStats(),
      getAllAppointments(),
    ]);
    grid.innerHTML = STATS_CONFIG.map(cfg => renderStatCard(cfg, stats[cfg.key])).join('');
    renderRecentAppointments(appointments);
    renderStatusBreakdown(appointments);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    grid.innerHTML = STATS_CONFIG.map(cfg => renderStatCard(cfg, '—')).join('');
  }
}

init();
