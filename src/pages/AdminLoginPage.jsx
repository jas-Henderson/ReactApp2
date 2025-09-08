// src/pages/AdminLoginPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { auth } from "../services/firebaseClient";

export default function AdminLoginPage() {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    user,
    isAdmin,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // If/when user becomes admin, go straight to dashboard
  useEffect(() => {
    if (user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [user, isAdmin, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }

      // Force token refresh so custom claims are re-read
      await auth.currentUser?.getIdToken(true);

      // Try the admin dashboard; ProtectedRoute will bounce back if not admin
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err?.message || "Failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const notAdminYet =
    user && !isAdmin && !busy && (mode === "login" || mode === "signup");

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h2>Admin Login</h2>

      <div className="card" style={{ padding: 16, marginTop: 12 }}>
        <form onSubmit={submit} className="column" style={{ gap: 12 }}>
          <label className="column">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          <label className="column">
            <span>Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="notice" style={{ background: "#fff4f4", borderColor: "#ffd5d5" }}>
              {error}
            </div>
          )}

          {notAdminYet && (
            <div className="notice" style={{ background: "#fff9e6", borderColor: "#ffe3a1" }}>
              Signed in, but this account doesn’t have admin access yet.
              Grant the <code>admin</code> claim using the endpoint below, then sign out and back in.
            </div>
          )}

          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            className="btn secondary"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>

          <div style={{ textAlign: "center", opacity: 0.6 }}>or</div>

          <button
            type="button"
            className="btn secondary"
            onClick={signInWithGoogle}
            disabled={busy}
          >
            Continue with Google
          </button>

          <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            After creating a user, grant admin with:
          </p>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f7f7f7", padding: 8, borderRadius: 8 }}>
{`curl -X POST "http://127.0.0.1:5002/reactapp2-8057f/us-central1/api/admin/grant" \
  -H "Content-Type: application/json" \
  -H "x-setup-secret: dev-secret" \
  -d '{"email":"you@example.com"}'`}
          </pre>
        </form>
      </div>
    </div>
  );
}