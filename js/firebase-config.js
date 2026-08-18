import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

// =============================================================
// WAJIB: GANTI DENGAN CONFIG FIREBASE MILIK ANDA
// Firebase Console > Project settings > Your apps > Web app
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBGRSLuywBbJVVNaOrKWDEX6yX49HP__EU",
  authDomain: "cbt-smp.firebaseapp.com",
  projectId: "cbt-smp",
  storageBucket: "cbt-smp.firebasestorage.app",
  messagingSenderId: "328919975853",
  appId: "1:328919975853:web:fe5c9efdf822dbba978324",
  measurementId: "G-JNKZWVLED1"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
