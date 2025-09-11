// src/services/firebase.js
import { app } from "./firebaseClient";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

export const db = getFirestore(app);

if (import.meta.env.VITE_USE_EMULATORS === "1") {
  connectFirestoreEmulator(db, "127.0.0.1", 8081);
}