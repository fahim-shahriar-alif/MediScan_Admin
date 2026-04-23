/**
 * admin-management.js — Admin user management page logic.
 * Allows existing admins to create and remove other admin accounts.
 */

import { requireAdminAuth } from './admin-auth.js';
import { initNav } from './admin-nav.js';
import { auth, db } from './admin-firebase.js';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message, type = 'error') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Render ───────────────────────────────────────────────────────────────────

let adminsCache = [];
let currentAdminUid = '';

function renderAdmins(admins) {
  const tbody = document.getElementById('adminsBody');
  if (!admins.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted)">No admins found.</td></tr>`;
    return;
  }
  tbody.innerHTML = admins.map(a => `
    <tr data-uid="${a.uid}">
      <td>${escapeHtml(a.name)}</td>
      <td>${escapeHtml(a.email)}</td>
      <td style="font-size:.75rem;color:var(--text-muted);font-family:monospace">${escapeHtml(a.uid)}</td>
      <td>
        ${a.uid === currentAdminUid
          ? `<span style="font-size:.78rem;color:var(--text-muted)">You</span>`
          : `<button class="btn btn-danger btn-sm" onclick="removeAdmin('${a.uid}')">Remove</button>`
        }
      </td>
    </tr>`).join('');
}

function renderSkeletonRows() {
  return Array.from({ length: 3 }, () => `
    <tr class="skeleton-row">
      ${Array.from({ length: 4 }, () => `<td><div class="skeleton skeleton-cell" style="width:${80 + (Math.random() * 80 | 0)}px"></div></td>`).join('')}
    </tr>`).join('');
}

// ─── Load admins ──────────────────────────────────────────────────────────────

async function loadAdmins() {
  const tbody = document.getElementById('adminsBody');
  tbody.innerHTML = renderSkeletonRows();
  try {
    const snap = await getDocs(collection(db, 'admins'));
    adminsCache = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    renderAdmins(adminsCache);
  } catch (err) {
    console.error('Failed to load admins:', err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--danger)">Failed to load admins.</td></tr>`;
  }
}

// ─── Remove admin ─────────────────────────────────────────────────────────────

window.removeAdmin = async function (uid) {
  if (!confirm('Remove this admin? They will lose access immediately.')) return;
  try {
    await deleteDoc(doc(db, 'admins', uid));
    adminsCache = adminsCache.filter(a => a.uid !== uid);
    renderAdmins(adminsCache);
    showToast('Admin removed successfully.', 'success');
  } catch (err) {
    console.error('Failed to remove admin:', err);
    showToast('Failed to remove admin. Please try again.');
  }
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal() {
  document.getElementById('addAdminForm').reset();
  clearFormErrors();
  document.getElementById('addAdminModal').classList.add('open');
}

function closeModal() {
  document.getElementById('addAdminModal').classList.remove('open');
}

function clearFormErrors() {
  ['AdminName', 'AdminEmail', 'AdminPassword'].forEach(f => {
    const errEl = document.getElementById(`err${f}`);
    const input = document.getElementById(`admin${f.replace('Admin', '')}`);
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
    if (input) input.classList.remove('error');
  });
}

function showError(fieldId, errId, msg) {
  const input = document.getElementById(fieldId);
  const errEl = document.getElementById(errId);
  if (input) input.classList.add('error');
  if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
}

// ─── Create admin ─────────────────────────────────────────────────────────────

async function handleCreateAdmin(e) {
  e.preventDefault();
  clearFormErrors();

  const name     = document.getElementById('adminName').value.trim();
  const email    = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;

  let valid = true;
  if (!name)            { showError('adminName',     'errAdminName',     'Name is required.');                  valid = false; }
  if (!email)           { showError('adminEmail',    'errAdminEmail',    'Email is required.');                 valid = false; }
  if (password.length < 6) { showError('adminPassword', 'errAdminPassword', 'Password must be at least 6 characters.'); valid = false; }
  if (!valid) return;

  const saveBtn = document.getElementById('saveAdminBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Creating…';

  try {
    // Create Firebase Auth account
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // Write admins/{uid} document
    await setDoc(doc(db, 'admins', cred.user.uid), {
      role: 'admin',
      name,
      email,
      createdAt: serverTimestamp(),
    });

    // Update local list
    const newAdmin = { uid: cred.user.uid, name, email, role: 'admin' };
    adminsCache.push(newAdmin);
    renderAdmins(adminsCache);

    closeModal();
    showToast(`Admin "${name}" created successfully.`, 'success');
  } catch (err) {
    console.error('Failed to create admin:', err);
    const messages = {
      'auth/email-already-in-use': 'This email is already registered.',
      'auth/invalid-email':        'Invalid email address.',
      'auth/weak-password':        'Password must be at least 6 characters.',
    };
    showError('adminEmail', 'errAdminEmail', messages[err.code] || `Error: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Create Admin';
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const adminUser = await requireAdminAuth();
  currentAdminUid = adminUser.uid;
  initNav(adminUser);
  await loadAdmins();

  document.getElementById('addAdminBtn').addEventListener('click', openModal);
  document.getElementById('cancelAddAdminBtn').addEventListener('click', closeModal);
  document.getElementById('addAdminModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('addAdminModal')) closeModal();
  });
  document.getElementById('addAdminForm').addEventListener('submit', handleCreateAdmin);
}

init();
