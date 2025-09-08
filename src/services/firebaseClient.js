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

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize app + auth
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// -------------------------
// Emulator support (local dev)
// -------------------------
if (import.meta.env.VITE_USE_EMULATORS === "1") {
  // Default Firebase Auth emulator runs on port 9099
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
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