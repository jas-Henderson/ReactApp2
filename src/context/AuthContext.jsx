// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  auth,
  signInWithGoogle,
  signOutUser,
  signInWithEmail,
  signUpWithEmail,
} from "../services/firebaseClient";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        try {
          // Get ID token claims from Firebase and refresh to ensure latest custom claims
          const token = await getIdTokenResult(u, true);
          const claimAdmin = Boolean(token.claims?.admin);
          setIsAdmin(claimAdmin);
        } catch (err) {
          console.error("AuthContext: failed to fetch ID token / claims", err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const value = {
    user,
    isAdmin,
    loading,

    // Sign-in options
    signInWithGoogle, // optional
    signInWithEmail: (email, password) => signInWithEmail(email, password),
    signUpWithEmail: (email, password) => signUpWithEmail(email, password),

    // Sign-out
    signOut: signOutUser,

    // Handy getter for the raw token when calling your backend
    getIdToken: () => auth.currentUser?.getIdToken(),
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);