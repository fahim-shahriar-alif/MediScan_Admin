/**
 * admin-nav.js — Shared sidebar navigation logic.
 * - Highlights the active nav link based on current pathname.
 * - Populates admin name/email in the sidebar footer.
 * - Wires the sign-out button.
 * Requirements: 6.1, 6.2, 6.3
 */

import { adminSignOut } from './admin-auth.js';

/**
 * Initialises the sidebar for an authenticated admin page.
 * @param {{ name: string, email: string }} adminUser
 */
export function initNav(adminUser) {
  highlightActiveLink();
  populateSidebarUser(adminUser);
  wireSignOut();
  wireHamburger();
}

/**
 * Highlights the sidebar link whose href matches the current page.
 * Exactly one link gets the 'active' class; all others are cleared.
 */
export function highlightActiveLink() {
  const links = document.querySelectorAll('.sidebar-nav a');
  const current = window.location.pathname;

  links.forEach(link => {
    link.classList.remove('active');
    // Normalise href to an absolute pathname for comparison
    const linkPath = new URL(link.href, window.location.origin).pathname;
    if (linkPath === current || (current.endsWith('/') && linkPath === current.slice(0, -1))) {
      link.classList.add('active');
    }
  });
}

/**
 * Populates the sidebar footer with the admin's name and email.
 * @param {{ name: string, email: string }} adminUser
 */
export function populateSidebarUser(adminUser) {
  const nameEl  = document.getElementById('sidebarAdminName');
  const emailEl = document.getElementById('sidebarAdminEmail');
  const avatarEl = document.getElementById('sidebarAvatar');

  if (nameEl)  nameEl.textContent  = adminUser.name  || 'Admin';
  if (emailEl) emailEl.textContent = adminUser.email || '';
  if (avatarEl) {
    const initial = (adminUser.name || adminUser.email || 'A')[0].toUpperCase();
    avatarEl.textContent = initial;
  }
}

function wireSignOut() {
  const btn = document.getElementById('signOutBtn');
  if (btn) {
    btn.addEventListener('click', () => adminSignOut());
  }
}

function wireHamburger() {
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar   = document.querySelector('.sidebar');
  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== hamburger) {
      sidebar.classList.remove('open');
    }
  });
}
