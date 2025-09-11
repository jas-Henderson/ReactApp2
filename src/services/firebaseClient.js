// src/services/firebaseClient.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";

// -------------------------
// Firebase config
// -------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// -------------------------
// Initialize app, auth, and db
// -------------------------
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// -------------------------
// Emulator support (local dev)
// -------------------------
if (
  import.meta.env.VITE_USE_EMULATORS === "1" ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1"
) {
  // Auth Emulator
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  } catch (_) {}

  // Firestore Emulator
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8081);
  } catch (_) {}
}

// -------------------------
// Auth helpers
// -------------------------

// Google sign-in (optional)
export const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

// Email/password
export const signInWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const signUpWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

// Sign out
export const signOutUser = () => signOut(auth);

export default app;