/**
 * admin-db.js — Firestore query module for the MediScan Admin Panel.
 * Performs cross-user reads and writes on behalf of administrators.
 * Requirements: 2.1–2.4, 3.1, 3.4, 3.5, 4.1, 4.3, 5.1, 5.3, 5.7, 5.8
 */

import {
  db,
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from './admin-firebase.js';

// ─── Dashboard ───────────────────────────────────────────────────────────────

/**
 * Fetches platform-wide statistics in parallel.
 * @returns {Promise<{ users: number, appointments: number, analyses: number, symptoms: number }>}
 */
export async function getDashboardStats() {
  const [usersSnap, apptSnap, analysesSnap, symptomsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collectionGroup(db, 'appointments')),
    getDocs(collectionGroup(db, 'analyses')),
    getDocs(collectionGroup(db, 'symptoms')),
  ]);

  return {
    users:        usersSnap.size,
    appointments: apptSnap.size,
    analyses:     analysesSnap.size,
    symptoms:     symptomsSnap.size,
  };
}

// ─── Appointments ────────────────────────────────────────────────────────────

/**
 * Retrieves all appointments across all patients, ordered by date descending.
 * Enriches each document with the parent userId extracted from the ref path.
 * @returns {Promise<Appointment[]>}
 */
export async function getAllAppointments() {
  const q    = query(collectionGroup(db, 'appointments'), orderBy('date', 'desc'));
  const snap = await getDocs(q);

  // Collect appointments and identify which ones need a user doc lookup
  const appointments = snap.docs.map(d => {
    const pathParts = d.ref.path.split('/');
    const userId = pathParts[1] || '';
    const data   = d.data();
    return { d, userId, data };
  });

  // Only fetch user docs for appointments missing patientName
  const userDocCache = {};
  await Promise.all(
    appointments
      .filter(({ data }) => !data.patientName)
      .map(async ({ userId }) => {
        if (userId && !userDocCache[userId]) {
          try {
            const snap = await getDoc(doc(db, 'users', userId));
            userDocCache[userId] = snap.exists() ? snap.data() : null;
          } catch {
            userDocCache[userId] = null;
          }
        }
      })
  );

  return appointments.map(({ d, userId, data }) => {
    let patientName  = data.patientName || data.patientEmail || '';
    let patientPhone = null;
    if (!patientName) {
      const userData = userDocCache[userId];
      patientName  = userData?.displayName || userData?.name || userData?.fullName || userData?.email || 'Unknown Patient';
      patientPhone = userData?.phone || null;
    }
    return {
      id:                 d.id,
      userId,
      patientName,
      patientPhone,
      doctorName:         data.doctorName         || '',
      date:               data.date               || '',
      time:               data.timeLabel          || data.time || '',
      status:             data.status             || 'pending',
      confirmationNumber: data.confirmationNumber || null,
    };
  });
}

/**
 * Updates the status field of a specific appointment document.
 * @param {string} userId
 * @param {string} appointmentId
 * @param {'confirmed'|'cancelled'|'pending'} status
 * @returns {Promise<void>}
 */
export async function updateAppointmentStatus(userId, appointmentId, status) {
  const ref = doc(db, 'users', userId, 'appointments', appointmentId);
  await updateDoc(ref, { status });
}

// ─── Patients ────────────────────────────────────────────────────────────────

/**
 * Retrieves all patient documents from the users collection.
 * @returns {Promise<Patient[]>}
 */
export async function getAllPatients() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id:          d.id,
      displayName: data.displayName || data.name || data.fullName || data.email || 'Unknown',
      email:       data.email       || data.emailAddress || '',
      phone:       data.phone       || data.phoneNumber  || null,
      createdAt:   data.createdAt   || data.joinedAt     || null,
    };
  });
}

/**
 * Reads sub-collection sizes for a single patient.
 * @param {string} userId
 * @returns {Promise<{ appointments: number, analyses: number, symptoms: number }>}
 */
export async function getPatientCounts(userId) {
  const [apptSnap, analysesSnap, symptomsSnap] = await Promise.all([
    getDocs(collection(db, 'users', userId, 'appointments')),
    getDocs(collection(db, 'users', userId, 'analyses')),
    getDocs(collection(db, 'users', userId, 'symptoms')),
  ]);

  return {
    appointments: apptSnap.size,
    analyses:     analysesSnap.size,
    symptoms:     symptomsSnap.size,
  };
}

// ─── Doctors ─────────────────────────────────────────────────────────────────

/**
 * Retrieves all doctor documents.
 * @returns {Promise<Doctor[]>}
 */
export async function getAllDoctors() {
  const snap = await getDocs(collection(db, 'doctors'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Adds a new doctor document.
 * @param {DoctorInput} data
 * @returns {Promise<string>} new document ID
 */
export async function addDoctor(data) {
  const ref = await addDoc(collection(db, 'doctors'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Updates an existing doctor document (merge).
 * @param {string} doctorId
 * @param {DoctorInput} data
 * @returns {Promise<void>}
 */
export async function updateDoctor(doctorId, data) {
  await updateDoc(doc(db, 'doctors', doctorId), data);
}

/**
 * Deletes a doctor document.
 * @param {string} doctorId
 * @returns {Promise<void>}
 */
export async function deleteDoctor(doctorId) {
  await deleteDoc(doc(db, 'doctors', doctorId));
}
