/* eslint-env node */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const Busboy = require("busboy");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
require("dotenv").config({ path: ".env.local" });

/* ------------------------- Admin init ------------------------- */
function getProjectId() {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.FIREBASE_CONFIG) {
    try {
      const cfg = JSON.parse(process.env.FIREBASE_CONFIG);
      if (cfg.projectId) return cfg.projectId;
    } catch (_) {}
  }
  return "reactapp2-8057f";
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: getProjectId(),
    storageBucket: process.env.STORAGE_BUCKET || `${getProjectId()}.appspot.com`,
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

/* ------------------------------ Config ------------------------------ */
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const WEB_APP_URL = process.env.WEB_APP_URL || "http://localhost:5173";
const ADMIN_SETUP_SECRET = process.env.ADMIN_SETUP_SECRET || "dev-secret";

const serverTimestamp =
  (admin.firestore.FieldValue &&
    admin.firestore.FieldValue.serverTimestamp) ||
  (() => new Date());

/* ----------------------- Email (Nodemailer) ----------------------- */
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const ALERT_EMAIL_FROM = process.env.ALERT_EMAIL_FROM || "alerts@example.com";
const ALERT_EMAIL_TO = (process.env.ALERT_EMAIL_TO || "").trim(); // optional CSV fallback

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465; false for 587/25
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
} else {
  console.warn("[Email] SMTP env not fully configured; low-stock emails will be skipped.");
}

async function sendEmail({ to, subject, html, text }) {
  if (!transporter) return { skipped: true, reason: "no-transporter" };
  if (!to || to.length === 0) return { skipped: true, reason: "no-recipients" };

  const toList = Array.isArray(to) ? to.join(",") : to;
  const info = await transporter.sendMail({
    from: ALERT_EMAIL_FROM,
    to: toList,
    subject,
    text,
    html,
  });
  return { ok: true, messageId: info.messageId };
}

/* ----------------------- Admin recipients ----------------------- */
const ADMINS_COL = "admins"; // docs keyed by uid: { email, notify: true/false, createdAt }

function uniqEmails(arr) {
  return [...new Set((arr || []).map(e => String(e || "").trim()).filter(Boolean))];
}

/** List emails from Firestore admins collection (notify=true). */
async function listAdminEmailsFromCollection() {
  const snap = await db.collection(ADMINS_COL).where("notify", "==", true).get();
  return snap.docs.map(d => (d.data()?.email || "").trim()).filter(Boolean);
}

/** Optionally list ALL auth users with custom claim admin=true. (Disabled by default) */
async function listAllAdminEmailsFromAuth(limitTo = 1000) {
  const out = [];
  let nextPageToken;
  do {
    const page = await admin.auth().listUsers(1000, nextPageToken);
    page.users.forEach(u => {
      if (u.customClaims?.admin && u.email) out.push(u.email.trim());
    });
    nextPageToken = page.pageToken;
  } while (nextPageToken && out.length < limitTo);
  return out;
}

/** Final recipient list: Firestore admins (notify=true) + optional CSV fallback (+ optional Auth admins). */
async function getAdminRecipientEmails() {
  const fromAdminsCol = await listAdminEmailsFromCollection();
  const fromEnv = ALERT_EMAIL_TO
    ? ALERT_EMAIL_TO.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  // If you want to include Auth-claimed admins automatically, uncomment:
  // const fromAuth = await listAllAdminEmailsFromAuth();
  // return uniqEmails([...fromAdminsCol, ...fromEnv, ...fromAuth]);

  return uniqEmails([...fromAdminsCol, ...fromEnv]);
}

/* ----------------------- Low-stock alerts ----------------------- */
const LOW_STOCK_THRESHOLD = 5;
const ALERTS_COL = "alerts";

async function createLowStockAlert({ id, name, inventory }) {
  const ref = db.collection(ALERTS_COL).doc();
  await ref.set({
    type: "low_stock",
    productId: id,
    productName: name || "(unnamed)",
    inventory: Number(inventory) ?? null,
    resolved: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

function toProductResponse(doc) {
  const d = doc.data();
  return { id: doc.id, ...d };
}

/* ------------------------ Express / middleware ----------------------- */
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.options("*", cors({ origin: true }));

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// Admin auth guard
async function requireAdmin(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
       const match = hdr.match(/^Bearer (.+)$/i);
    if (!match) return res.status(401).json({ error: "Missing token" });
    const decoded = await admin.auth().verifyIdToken(match[1]);
    if (!decoded.admin) return res.status(403).json({ error: "Admin only" });
    req.user = decoded;
    next();
  } catch (e) {
    console.error("Auth error:", e);
    res.status(401).json({ error: "Invalid token" });
  }
}

/* ============================ PUBLIC API ============================ */

// GET /products?q=&category=&sort=
app.get("/products", async (req, res) => {
  try {
    const { q = "", category = "", sort = "newest" } = req.query;
    let ref = db.collection("products");

    if (category) ref = ref.where("category", "==", category);

    if (sort === "price-asc") ref = ref.orderBy("priceCents", "asc");
    else if (sort === "price-desc") ref = ref.orderBy("priceCents", "desc");
    else ref = ref.orderBy("createdAt", "desc");

    const snapshot = await ref.limit(50).get();
    let products = snapshot.docs.map(toProductResponse);

    if (q) {
      const lower = String(q).toLowerCase();
      products = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          (p.tags || []).some((t) => String(t).toLowerCase().includes(lower)) ||
          (p.description || "").toLowerCase().includes(lower)
      );
    }

    res.json({ products });
  } catch (e) {
    console.error("GET /products error:", e);
    res.status(500).json({ error: e.message });
  }
});

// GET /products/:id
app.get("/products/:id", async (req, res) => {
  try {
    const doc = await db.collection("products").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    res.json(toProductResponse(doc));
  } catch (e) {
    console.error("GET /products/:id error:", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /admin/seed  body: { products: [{ ... , inventory }] }
app.post("/admin/seed", async (req, res) => {
  try {
    const { products = [] } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "No products provided" });
    }

    const batch = db.batch();
    const col = db.collection("products");

    products.forEach((p) => {
      const ref = col.doc();
      batch.set(ref, {
        name: p.name,
        description: p.description || "",
        priceCents: Number(p.priceCents) || 0,
        images: Array.isArray(p.images) ? p.images : [],
        category: p.category || "Hair Care",
        tags: Array.isArray(p.tags) ? p.tags : [],
        inStock: p.inStock ?? true,
        inventory: Number(p.inventory ?? 0),
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
    res.json({ ok: true, count: products.length });
  } catch (e) {
    console.error("POST /admin/seed error:", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /checkout/create-session  body: { items: [{ id, qty }] }
app.post("/checkout/create-session", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items" });
    }

    const lineItems = [];
    for (const it of items) {
      const snap = await db.collection("products").doc(it.id).get();
      if (!snap.exists) continue;
      const p = snap.data();
      lineItems.push({
        price_data: {
          currency: "cad",
          product_data: { name: p.name, images: p.images || [] },
          unit_amount: Number(p.priceCents) || 0,
        },
        quantity: it.qty || 1,
      });
    }

    if (lineItems.length === 0) return res.status(400).json({ error: "Invalid items" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${WEB_APP_URL}/success`,
      cancel_url: `${WEB_APP_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error("POST /checkout/create-session error:", e);
    res.status(500).json({ error: e.message });
  }
});

/* ============================ ADMIN API ============================ */

// Simple who-am-I for the client to confirm admin
app.get("/admin/me", requireAdmin, (req, res) => {
  res.json({ admin: true, uid: req.user.uid, email: req.user.email || null });
});

// GET /admin/products
app.get("/admin/products", requireAdmin, async (req, res) => {
  try {
    const { q = "", category = "", sort = "newest" } = req.query;
    let ref = db.collection("products");
    if (category) ref = ref.where("category", "==", category);
    if (sort === "price-asc") ref = ref.orderBy("priceCents", "asc");
    else if (sort === "price-desc") ref = ref.orderBy("priceCents", "desc");
    else ref = ref.orderBy("createdAt", "desc");

    const snap = await ref.limit(100).get();
    let products = snap.docs.map(toProductResponse);

    if (q) {
      const lower = q.toLowerCase();
      products = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          (p.tags || []).some((t) => String(t).toLowerCase().includes(lower)) ||
          (p.description || "").toLowerCase().includes(lower)
      );
    }
    res.json({ products });
  } catch (e) {
    console.error("GET /admin/products error:", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /admin/products
app.post("/admin/products", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description = "",
      priceCents,
      images = [],
      category = "Hair Care",
      tags = [],
      inStock = true,
      inventory = 0,
    } = req.body;

    if (!name || typeof priceCents !== "number") {
      return res.status(400).json({ error: "name & priceCents required" });
    }

    const ref = await db.collection("products").add({
      name,
      description,
      priceCents: Number(priceCents) || 0,
      images: Array.isArray(images) ? images : [],
      category,
      tags: Array.isArray(tags) ? tags : [],
      inStock: !!inStock,
      inventory: Number(inventory) || 0,
      createdAt: serverTimestamp(),
    });

    const doc = await ref.get();
    res.json({ id: ref.id, ...doc.data() });
  } catch (e) {
    console.error("POST /admin/products error:", e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /admin/products/:id
app.put("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const patch = { ...req.body };
    delete patch.createdAt;

    await db.collection("products").doc(id).set(patch, { merge: true });
    const doc = await db.collection("products").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    res.json({ id, ...doc.data() });
  } catch (e) {
    console.error("PUT /admin/products/:id error:", e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /admin/products/:id
app.delete("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    await db.collection("products").doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /admin/products/:id error:", e);
    res.status(500).json({ error: e.message });
  }
});

/* --------------------------- Admin: Upload file --------------------------- */
/**
 * POST /admin/upload  (multipart/form-data, field: "file")
 * Saves to Storage at product-images/<unique>-<filename>
 * Returns: { url, path }
 */
app.post("/admin/upload", requireAdmin, (req, res) => {
  try {
    const bb = new Busboy({ headers: req.headers });
    let buffers = [];
    let filename = "upload.bin";
    let mimeType = "application/octet-stream";

    bb.on("file", (_name, file, info) => {
      filename = info?.filename || filename;
      mimeType = info?.mimeType || mimeType;
      file.on("data", (d) => buffers.push(d));
    });

    bb.on("finish", async () => {
      try {
        const buffer = Buffer.concat(buffers || []);
        if (!buffer.length) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        const unique = `${Date.now()}-${uuidv4()}`;
        const safeName = filename.replace(/\s+/g, "_");
        const destPath = `product-images/${unique}-${safeName}`;

        const f = bucket.file(destPath);
        await f.save(buffer, {
          contentType: mimeType,
          resumable: false,
          metadata: { cacheControl: "public, max-age=31536000" },
        });

        // Make public for a stable URL (or switch to signed URLs if preferred)
        try { await f.makePublic(); } catch (_) {}
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`;
        return res.json({ url: publicUrl, path: destPath });
      } catch (err) {
        console.error("Upload save error:", err);
        return res.status(500).json({ error: err.message });
      }
    });

    req.pipe(bb);
  } catch (e) {
    console.error("Upload init error:", e);
    res.status(500).json({ error: e.message });
  }
});

/* ------------------------------ Admins API (recipients management) ------------------------------ */

// List admins (from Firestore collection)
app.get("/admin/admins", requireAdmin, async (_req, res) => {
  try {
    const snap = await db.collection(ADMINS_COL).orderBy("createdAt", "desc").get();
    const admins = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ admins });
  } catch (e) {
    console.error("GET /admin/admins error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Toggle notify flag for an admin
app.post("/admin/admins/:uid/notify", requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { notify } = req.body || {};
    await db.collection(ADMINS_COL).doc(uid).set(
      { notify: !!notify, updatedAt: serverTimestamp() },
      { merge: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /admin/admins/:uid/notify error:", e);
    res.status(500).json({ error: e.message });
  }
});

/* ------------------------------ Alerts API ------------------------------ */

// GET /admin/alerts  -> unresolved + a few recently resolved
app.get("/admin/alerts", requireAdmin, async (_req, res) => {
  try {
    const unresolvedSnap = await db
      .collection(ALERTS_COL)
      .where("resolved", "==", false)
      .orderBy("createdAt", "desc")
      .get();
    const unresolved = unresolvedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const resolvedSnap = await db
      .collection(ALERTS_COL)
      .where("resolved", "==", true)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    const recentResolved = resolvedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.json({ unresolved, recentResolved });
  } catch (e) {
    console.error("GET /admin/alerts error:", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /admin/alerts/:id/resolve
app.post("/admin/alerts/:id/resolve", requireAdmin, async (req, res) => {
  try {
    await db
      .collection(ALERTS_COL)
      .doc(req.params.id)
      .set({ resolved: true, resolvedAt: serverTimestamp() }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /admin/alerts/:id/resolve error:", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /admin/grant  (one-time: grant admin claim to email)
// Also upserts admins/{uid} with notify:true so they get emails.
app.post("/admin/grant", async (req, res) => {
  try {
    if ((req.headers["x-setup-secret"] || "") !== ADMIN_SETUP_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });

    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    await db.collection(ADMINS_COL).doc(user.uid).set(
      {
        email: user.email || email,
        notify: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    res.json({ ok: true, uid: user.uid });
  } catch (e) {
    console.error("POST /admin/grant error:", e);
    res.status(500).json({ error: e.message });
  }
});

/* ------------------------ Firestore Triggers ------------------------ */
// Create a low-stock alert when inventory crosses below threshold
exports.onProductWrite = functions.firestore
  .document("products/{id}")
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    if (!after || typeof after.inventory !== "number") return;

    const was = typeof before?.inventory === "number" ? before.inventory : null;
    const now = after.inventory;

    const crossedBelow =
      (was === null || was >= LOW_STOCK_THRESHOLD) && now < LOW_STOCK_THRESHOLD;
    if (!crossedBelow) return;

    // Avoid duplicate unresolved alerts for the same product
    const existing = await db
      .collection(ALERTS_COL)
      .where("type", "==", "low_stock")
      .where("productId", "==", context.params.id)
      .where("resolved", "==", false)
      .limit(1)
      .get();
    if (!existing.empty) return;

    await createLowStockAlert({
      id: context.params.id,
      name: after.name,
      inventory: now,
    });
  });

/** When a new alert is created, email all admins (if SMTP is configured). */
exports.onAlertCreate = functions.firestore
  .document("alerts/{id}")
  .onCreate(async (snap) => {
    const a = snap.data() || {};
    if (a.type !== "low_stock") return;

    const recipients = await getAdminRecipientEmails(); // ← gather recipients
    if (!recipients.length) {
      console.warn("[Email] No admin recipients for low-stock alert.");
      return;
    }

    const subject = `⚠️ Low stock: ${a.productName || "(unnamed)"} — ${a.inventory} left`;
    const text =
      `Low stock alert\n\n` +
      `Product: ${a.productName || "(unnamed)"}\n` +
      `Inventory: ${a.inventory}\n` +
      `Time: ${new Date().toISOString()}\n`;
    const html =
      `<h2>Low stock alert</h2>` +
      `<p><strong>Product:</strong> ${a.productName || "(unnamed)"}<br/>` +
      `<strong>Inventory:</strong> ${a.inventory}<br/>` +
      `<strong>Time:</strong> ${new Date().toLocaleString()}</p>` +
      `<p><em>This was generated automatically by Salon Store.</em></p>`;

    try {
      const result = await sendEmail({
        to: recipients,
        subject,
        text,
        html,
      });
      console.log("[Email] low_stock =>", result);
    } catch (err) {
      console.error("[Email] send failed:", err);
    }
  });

/* ---------------------------- Export API ---------------------------- */
exports.api = functions.region("us-central1").https.onRequest(app);