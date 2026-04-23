/**
 * admin-auth.js — Authentication and role verification for the MediScan Admin Panel.
 * Requirements: 1.2–1.8
 */

import {
  auth, db,
  signInWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  getDoc,
  doc,
} from './admin-firebase.js';

// ─── Auth error code → human-readable message ───────────────────────────────

const ERROR_MAP = {
  'auth/invalid-email':          'Please enter a valid email address.',
  'auth/user-disabled':          'This account has been disabled. Contact support.',
  'auth/user-not-found':         'No account found with that email address.',
  'auth/wrong-password':         'Incorrect password. Please try again.',
  'auth/invalid-credential':     'Invalid email or password. Please try again.',
  'auth/too-many-requests':      'Too many failed attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/email-already-in-use':   'An account with this email already exists.',
  'auth/weak-password':          'Password must be at least 6 characters.',
  'auth/operation-not-allowed':  'Email/password sign-in is not enabled.',
  'auth/popup-closed-by-user':   'Sign-in popup was closed before completing.',
};

/**
 * Maps a Firebase Auth error code to a human-readable message.
 * Never returns the raw error code.
 * @param {string} code
 * @returns {string}
 */
export function mapAuthError(code) {
  return ERROR_MAP[code] || 'An unexpected error occurred. Please try again.';
}

// ─── Role verification ───────────────────────────────────────────────────────

/**
 * Checks whether the given UID has admin privileges.
 * Returns true iff admins/{uid} exists with role === 'admin'.
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function verifyAdminRole(uid) {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    if (!snap.exists()) return false;
    return snap.data()?.role === 'admin';
  } catch {
    return false;
  }
}

// ─── Sign in ─────────────────────────────────────────────────────────────────

/**
 * Signs in with email/password, then verifies admin role.
 * Signs out and returns an error if role check fails.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function adminSignIn({ email, password }) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const isAdmin = await verifyAdminRole(cred.user.uid);
    if (!isAdmin) {
      await firebaseSignOut(auth);
      return { ok: false, error: 'Access denied. Admin privileges required.' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapAuthError(err.code) };
  }
}

// ─── Sign out ────────────────────────────────────────────────────────────────

/**
 * Signs the admin out and redirects to the login page.
 * @returns {Promise<void>}
 */
export async function adminSignOut() {
  await firebaseSignOut(auth);
  window.location.href = 'index.html';
}

// ─── Current user ────────────────────────────────────────────────────────────

/**
 * Returns the current admin user's display info, or null if not signed in.
 * @returns {{ name: string, email: string, uid: string } | null}
 */
export function getAdminUser() {
  const user = auth.currentUser;
  if (!user) return null;
  return {
    uid:   user.uid,
    email: user.email || '',
    name:  user.displayName || user.email?.split('@')[0] || 'Admin',
  };
}

// ─── Route guard ─────────────────────────────────────────────────────────────

/**
 * Protects an admin page. Call at the top of every authenticated page script.
 * Redirects to admin/index.html if no active session or role check fails.
 * Returns a Promise that resolves with the admin user once verified.
 * @returns {Promise<{ name: string, email: string, uid: string }>}
 */
export function requireAdminAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        window.location.href = 'index.html';
        return;
      }
      const isAdmin = await verifyAdminRole(user.uid);
      if (!isAdmin) {
        await firebaseSignOut(auth);
        window.location.href = 'index.html';
        return;
      }
      resolve({
        uid:   user.uid,
        email: user.email || '',
        name:  user.displayName || user.email?.split('@')[0] || 'Admin',
      });
    });
  });
}
