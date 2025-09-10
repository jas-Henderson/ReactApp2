/* eslint-env node */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

// ---------- Robust Admin init (works even if CLI isn't logged in) ----------
function getProjectId() {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.FIREBASE_CONFIG) {
    try {
      const cfg = JSON.parse(process.env.FIREBASE_CONFIG);
      if (cfg.projectId) return cfg.projectId;
    } catch (_) {}
  }
  return 'reactapp2-8057f'; // fallback to your project id
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: getProjectId() });
}
const db = admin.firestore();

// Stripe / config
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5173';
const ADMIN_SETUP_SECRET = process.env.ADMIN_SETUP_SECRET || 'dev-secret';

// ---------- Express ----------
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.options('*', cors({ origin: true }));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Helpers
const serverTimestamp =
  (admin.firestore.FieldValue &&
    admin.firestore.FieldValue.serverTimestamp) ||
  (() => new Date());

function toProductResponse(doc) {
  const d = doc.data();
  return { id: doc.id, ...d };
}

// ---------- Admin auth middleware ----------
async function requireAdmin(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const match = hdr.match(/^Bearer (.+)$/i);
    if (!match) return res.status(401).json({ error: 'Missing token' });
    const decoded = await admin.auth().verifyIdToken(match[1]);
    if (!decoded.admin) return res.status(403).json({ error: 'Admin only' });
    req.user = decoded;
    next();
  } catch (e) {
    console.error('Auth error:', e);
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ===================== PUBLIC API =====================

// GET /products?q=&category=&sort=
app.get('/products', async (req, res) => {
  try {
    const { q = '', category = '', sort = 'newest' } = req.query;
    let ref = db.collection('products');

    if (category) ref = ref.where('category', '==', category);

    if (sort === 'price-asc') ref = ref.orderBy('priceCents', 'asc');
    else if (sort === 'price-desc') ref = ref.orderBy('priceCents', 'desc');
    else ref = ref.orderBy('createdAt', 'desc');

    const snapshot = await ref.limit(50).get();
    let products = snapshot.docs.map(toProductResponse);

    if (q) {
      const lower = String(q).toLowerCase();
      products = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          (p.tags || []).some((t) => String(t).toLowerCase().includes(lower)) ||
          (p.description || '').toLowerCase().includes(lower)
      );
    }

    res.json({ products });
  } catch (e) {
    console.error('GET /products error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /products/:id
app.get('/products/:id', async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json(toProductResponse(doc));
  } catch (e) {
    console.error('GET /products/:id error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Seed products (dev convenience)
// POST /admin/seed  body: { products: [{ name, priceCents, ...}] }
app.post('/admin/seed', async (req, res) => {
  try {
    const { products = [] } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'No products provided' });
    }

    const batch = db.batch();
    const col = db.collection('products');

    products.forEach((p) => {
      const ref = col.doc();
      batch.set(ref, {
        name: p.name,
        description: p.description || '',
        priceCents: Number(p.priceCents) || 0,
        images: Array.isArray(p.images) ? p.images : [],
        category: p.category || 'Hair Care',
        tags: Array.isArray(p.tags) ? p.tags : [],
        inStock: p.inStock ?? true,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
    res.json({ ok: true, count: products.length });
  } catch (e) {
    console.error('POST /admin/seed error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Create Stripe Checkout session
// POST /checkout/create-session  body: { items: [{ id, qty }] }
app.post('/checkout/create-session', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items' });
    }

    const lineItems = [];
    for (const it of items) {
      const snap = await db.collection('products').doc(it.id).get();
      if (!snap.exists) continue;
      const p = snap.data();
      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: { name: p.name, images: p.images || [] },
          unit_amount: Number(p.priceCents) || 0,
        },
        quantity: it.qty || 1,
      });
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ error: 'Invalid items' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${WEB_APP_URL}/success`,
      cancel_url: `${WEB_APP_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('POST /checkout/create-session error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===================== ADMIN API =====================

// GET /admin/products
app.get('/admin/products', requireAdmin, async (req, res) => {
  try {
    const { q = '', category = '', sort = 'newest' } = req.query;
    let ref = db.collection('products');
    if (category) ref = ref.where('category', '==', category);
    if (sort === 'price-asc') ref = ref.orderBy('priceCents', 'asc');
    else if (sort === 'price-desc') ref = ref.orderBy('priceCents', 'desc');
    else ref = ref.orderBy('createdAt', 'desc');

    const snap = await ref.limit(100).get();
    let products = snap.docs.map(toProductResponse);

    if (q) {
      const lower = q.toLowerCase();
      products = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(lower) ||
          (p.tags || []).some((t) => String(t).toLowerCase().includes(lower)) ||
          (p.description || '').toLowerCase().includes(lower)
      );
    }
    res.json({ products });
  } catch (e) {
    console.error('GET /admin/products error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /admin/products
app.post('/admin/products', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description = '',
      priceCents,
      images = [],
      category = 'Hair Care',
      tags = [],
      inStock = true,
    } = req.body;

    if (!name || typeof priceCents !== 'number') {
      return res.status(400).json({ error: 'name & priceCents required' });
    }

    const ref = await db.collection('products').add({
      name,
      description,
      priceCents: Number(priceCents) || 0,
      images: Array.isArray(images) ? images : [],
      category,
      tags: Array.isArray(tags) ? tags : [],
      inStock: !!inStock,
      createdAt: serverTimestamp(),
    });

    const doc = await ref.get();
    res.json({ id: ref.id, ...doc.data() });
  } catch (e) {
    console.error('POST /admin/products error:', e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /admin/products/:id
app.put('/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const patch = { ...req.body };
    delete patch.createdAt;

    await db.collection('products').doc(id).set(patch, { merge: true });
    const doc = await db.collection('products').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id, ...doc.data() });
  } catch (e) {
    console.error('PUT /admin/products/:id error:', e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /admin/products/:id
app.delete('/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    await db.collection('products').doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /admin/products/:id error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /admin/grant  (one-time: grant admin claim to email)
// header: x-setup-secret: <ADMIN_SETUP_SECRET>
app.post('/admin/grant', async (req, res) => {
  try {
    if ((req.headers['x-setup-secret'] || '') !== ADMIN_SETUP_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    res.json({ ok: true, uid: user.uid });
  } catch (e) {
    console.error('POST /admin/grant error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ---------- Export (Gen-1) ----------
exports.api = functions.region('us-central1').https.onRequest(app);