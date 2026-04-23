/**
 * dashboard.js — Dashboard statistics page logic.
 * Requirements: 2.1–2.7
 */

import { requireAdminAuth } from './admin-auth.js';
import { initNav } from './admin-nav.js';
import { getDashboardStats } from './admin-db.js';

const STATS_CONFIG = [
  { key: 'users',        label: 'Total Patients',      iconClass: 'blue',
    icon: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
  { key: 'appointments', label: 'Total Appointments',  iconClass: 'green',
    icon: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>` },
  { key: 'analyses',     label: 'Total Scans',         iconClass: 'yellow',
    icon: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>` },
  { key: 'symptoms',     label: 'Symptom Checks',      iconClass: 'purple',
    icon: `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>` },
];

/**
 * Renders a stat card with a numeric count and label.
 * @param {{ key: string, label: string, iconClass: string, icon: string }} cfg
 * @param {number|string} value
 * @returns {string} HTML string
 */
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

async function init() {
  const adminUser = await requireAdminAuth();
  initNav(adminUser);

  const grid = document.getElementById('statsGrid');

  try {
    const stats = await getDashboardStats();
    grid.innerHTML = STATS_CONFIG.map(cfg => renderStatCard(cfg, stats[cfg.key])).join('');
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
    grid.innerHTML = STATS_CONFIG.map(cfg => renderStatCard(cfg, '—')).join('');
  }
}

init();
