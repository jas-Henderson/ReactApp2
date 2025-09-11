// scripts/grant-admins.js
import axios from "axios";

// Project + emulator config
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "reactapp2-8057f";
const REGION = process.env.FUNCTIONS_REGION || "us-central1";
const SETUP_SECRET = process.env.ADMIN_SETUP_SECRET || "dev-secret";
const AUTH_EMU = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const FUNCTIONS_BASE = `http://127.0.0.1:5002/${PROJECT_ID}/${REGION}/api`;

// Admin emails to seed
const ADMINS = [
  "jas.r.henderson@gmail.com",
  "louise.rennick@trios.com",
];

// Default emulator password
const DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || "Password1!";

async function ensureAuthUser(email, displayName) {
  const url = `http://${AUTH_EMU}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  try {
    await axios.post(url, {
      email,
      password: DEFAULT_PASSWORD,
      returnSecureToken: true,
      displayName,
    });
    console.log(`🆕 Created auth user in emulator: ${email}`);
  } catch (err) {
    const msg = err.response?.data?.error?.message;
    if (msg?.includes("EMAIL_EXISTS")) {
      console.log(`✓ Auth user already exists: ${email}`);
    } else {
      throw new Error(`Auth emulator signUp failed for ${email}: ${msg || err.message}`);
    }
  }
}

async function callGrant(email) {
  const url = `${FUNCTIONS_BASE}/admin/grant`;
  const res = await axios.post(
    url,
    { email },
    {
      headers: {
        "x-setup-secret": SETUP_SECRET,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data;
}

async function main() {
  let ok = true;

  for (const email of ADMINS) {
    try {
      // 1. Ensure user exists in Auth Emulator
      await ensureAuthUser(email, email.split("@")[0]);

      // 2. Call /admin/grant to assign admin claim
      const grant = await callGrant(email);
      console.log(`✅ Granted admin: ${email}`, grant);
    } catch (e) {
      ok = false;
      console.error(`❌ Failed to grant ${email}:`, e.message || e);
    }
  }

  process.exitCode = ok ? 0 : 1;
}

main().catch((e) => {
  console.error("grant-admins fatal:", e);
  process.exit(1);
});