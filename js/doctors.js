/**
 * doctors.js — Doctors management page logic.
 * Requirements: 5.1–5.9
 */

import { requireAdminAuth } from './admin-auth.js';
import { initNav } from './admin-nav.js';
import { getAllDoctors, addDoctor, updateDoctor, deleteDoctor } from './admin-db.js';

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message, type = 'error') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ─── Form validation ──────────────────────────────────────────────────────────

/**
 * Validates doctor form input.
 * Returns { valid: boolean, errors: Record<string, string> }
 * @param {{ name, specialty, address, phone, rating }} data
 */
export function validateDoctorForm(data) {
  const errors = {};
  if (!data.name?.trim())      errors.name      = 'Name is required.';
  if (!data.specialty?.trim()) errors.specialty = 'Specialty is required.';
  if (!data.address?.trim())   errors.address   = 'Address is required.';
  if (!data.phone?.trim())     errors.phone     = 'Phone is required.';

  const rating = parseFloat(data.rating);
  if (data.rating === '' || data.rating === null || data.rating === undefined) {
    errors.rating = 'Rating is required.';
  } else if (isNaN(rating) || rating < 1.0 || rating > 5.0) {
    errors.rating = 'Rating must be a number between 1.0 and 5.0.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function clearFormErrors() {
  ['Name','Specialty','Address','Phone','Rating'].forEach(f => {
    const errEl = document.getElementById(`err${f}`);
    const input = document.getElementById(`field${f}`);
    if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
    if (input) input.classList.remove('error');
  });
}

function showFormErrors(errors) {
  Object.entries(errors).forEach(([field, msg]) => {
    const key = field.charAt(0).toUpperCase() + field.slice(1);
    const errEl = document.getElementById(`err${key}`);
    const input = document.getElementById(`field${key}`);
    if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
    if (input) input.classList.add('error');
  });
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/**
 * Renders a single doctor card.
 * @param {Doctor} doctor
 * @returns {string} HTML string
 */
export function renderDoctorCard(doctor) {
  const stars = '★'.repeat(Math.round(doctor.rating || 0)) + '☆'.repeat(5 - Math.round(doctor.rating || 0));
  return `
    <div class="doctor-card" data-id="${doctor.id}">
      <div class="doctor-card-name">${escapeHtml(doctor.name)}</div>
      <div class="doctor-card-specialty">${escapeHtml(doctor.specialty)}</div>
      <div class="doctor-card-detail">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:1px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${escapeHtml(doctor.address)}
      </div>
      <div class="doctor-card-detail">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16z"/></svg>
        ${escapeHtml(doctor.phone)}
      </div>
      <div class="doctor-card-rating">
        <span style="color:var(--warning)">${stars}</span>
        <span style="color:var(--text-main)">${Number(doctor.rating || 0).toFixed(1)}</span>
      </div>
      <div class="doctor-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="openEditModal('${doctor.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="removeDoctor('${doctor.id}')">Remove</button>
      </div>
    </div>`;
}

function renderGrid(doctors) {
  const grid = document.getElementById('doctorsGrid');
  if (!doctors.length) {
    grid.innerHTML = `<p class="text-muted" style="padding:32px 0">No doctors found. Click "Add Doctor" to get started.</p>`;
    return;
  }
  grid.innerHTML = doctors.map(renderDoctorCard).join('');
}

// ─── Modal ────────────────────────────────────────────────────────────────────

let doctorsCache = [];

function openModal(title = 'Add Doctor', doctor = null) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('doctorId').value      = doctor?.id      || '';
  document.getElementById('fieldName').value     = doctor?.name     || '';
  document.getElementById('fieldSpecialty').value= doctor?.specialty|| '';
  document.getElementById('fieldAddress').value  = doctor?.address  || '';
  document.getElementById('fieldPhone').value    = doctor?.phone    || '';
  document.getElementById('fieldRating').value   = doctor?.rating   != null ? doctor.rating : '';
  clearFormErrors();
  document.getElementById('doctorModal').classList.add('open');
}

function closeModal() {
  document.getElementById('doctorModal').classList.remove('open');
}

/**
 * Opens the edit modal pre-populated with the doctor's current data.
 * @param {string} doctorId
 */
window.openEditModal = function(doctorId) {
  const doctor = doctorsCache.find(d => d.id === doctorId);
  if (doctor) openModal('Edit Doctor', doctor);
};

window.removeDoctor = async function(doctorId) {
  if (!confirm('Are you sure you want to remove this doctor? This cannot be undone.')) return;
  const card = document.querySelector(`.doctor-card[data-id="${doctorId}"]`);
  try {
    await deleteDoctor(doctorId);
    doctorsCache = doctorsCache.filter(d => d.id !== doctorId);
    card?.remove();
    if (!doctorsCache.length) renderGrid([]);
    showToast('Doctor removed successfully.', 'success');
  } catch (err) {
    console.error('Failed to delete doctor:', err);
    showToast('Failed to remove doctor. Please try again.');
  }
};

// ─── Form submit ──────────────────────────────────────────────────────────────

async function handleFormSubmit(e) {
  e.preventDefault();
  clearFormErrors();

  const data = {
    name:      document.getElementById('fieldName').value.trim(),
    specialty: document.getElementById('fieldSpecialty').value.trim(),
    address:   document.getElementById('fieldAddress').value.trim(),
    phone:     document.getElementById('fieldPhone').value.trim(),
    rating:    document.getElementById('fieldRating').value,
  };

  const { valid, errors } = validateDoctorForm(data);
  if (!valid) { showFormErrors(errors); return; }

  const doctorData = { ...data, rating: parseFloat(data.rating) };
  const existingId = document.getElementById('doctorId').value;
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    if (existingId) {
      // Edit
      await updateDoctor(existingId, doctorData);
      const idx = doctorsCache.findIndex(d => d.id === existingId);
      if (idx !== -1) {
        doctorsCache[idx] = { ...doctorsCache[idx], ...doctorData };
        const card = document.querySelector(`.doctor-card[data-id="${existingId}"]`);
        if (card) {
          card.insertAdjacentHTML('afterend', renderDoctorCard(doctorsCache[idx]));
          card.remove();
        }
      }
      showToast('Doctor updated successfully.', 'success');
    } else {
      // Add
      const newId = await addDoctor(doctorData);
      const newDoctor = { id: newId, ...doctorData };
      doctorsCache.push(newDoctor);
      const grid = document.getElementById('doctorsGrid');
      // Remove empty state if present
      const emptyMsg = grid.querySelector('p');
      if (emptyMsg) emptyMsg.remove();
      grid.insertAdjacentHTML('afterbegin', renderDoctorCard(newDoctor));
      showToast('Doctor added successfully.', 'success');
    }
    closeModal();
  } catch (err) {
    console.error('Failed to save doctor:', err);
    showToast('Failed to save doctor. Please try again.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Doctor';
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const adminUser = await requireAdminAuth();
  initNav(adminUser);

  const grid = document.getElementById('doctorsGrid');
  grid.innerHTML = `<p class="text-muted" style="padding:32px 0">Loading doctors…</p>`;

  try {
    doctorsCache = await getAllDoctors();
    renderGrid(doctorsCache);
  } catch (err) {
    console.error('Failed to load doctors:', err);
    grid.innerHTML = `<p style="color:var(--danger);padding:32px 0">Failed to load doctors.</p>`;
  }

  // Modal controls
  document.getElementById('addDoctorBtn').addEventListener('click', () => openModal('Add Doctor'));
  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
  document.getElementById('doctorModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('doctorModal')) closeModal();
  });
  document.getElementById('doctorForm').addEventListener('submit', handleFormSubmit);
}

init();
