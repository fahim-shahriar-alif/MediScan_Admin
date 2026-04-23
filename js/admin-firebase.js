/**
 * admin-firebase.js — Firebase initialisation for the MediScan Admin Panel.
 * Reads firebaseConfig from window.CONFIG (loaded via ../config.js).
 * The Firebase SDK is loaded from CDN; this module uses ES module imports.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
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
  where,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Firebase config is provided by ../config.js as window.firebaseConfig
// (the main app's js/firebase.js hard-codes it; we read it from the same source)
const firebaseConfig = {
  apiKey:            'AIzaSyDzOEZEaSzws_u909SrLluWaehQBRr1PGE',
  authDomain:        'mediscan-5534e.firebaseapp.com',
  projectId:         'mediscan-5534e',
  storageBucket:     'mediscan-5534e.firebasestorage.app',
  messagingSenderId: '787691091795',
  appId:             '1:787691091795:web:65b2cd16e5862efad853a6',
  measurementId:     'G-Y5NRTGXZYS',
};

const app  = initializeApp(firebaseConfig, 'admin');
const auth = getAuth(app);
const db   = getFirestore(app);

export {
  auth, db,
  signInWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  // Firestore helpers
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
  where,
  serverTimestamp,
};
