/* eslint-env node */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { FieldValue } = require('firebase-admin/firestore'); // serverTimestamp()
require('dotenv').config({ path: '.env.local' });

admin.initializeApp();
const db = admin.firestore();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5173';

// ---- Express setup
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
// Handle CORS preflight quickly
app.options('*', cors({ origin: true }));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Utilities
const serverTimestamp =
  (FieldValue && FieldValue.serverTimestamp)
    ? FieldValue.serverTimestamp
    : () => new Date(); // fallback if FieldValue is unavailable

function toProductResponse(doc) {
  const d = doc.data();
  return { id: doc.id, ...d };
}

// ---- Products list with filters/search
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

// Optional helper: GET /products/:id
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

// ---- Seed products
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
        priceCents: Number(p.priceCents) || 0, // cents integer
        images: Array.isArray(p.images) ? p.images : [],
        category: p.category || 'Hair Care',
        tags: Array.isArray(p.tags) ? p.tags : [],
        inStock: p.inStock ?? true,
        createdAt: serverTimestamp(), // FieldValue.serverTimestamp() or Date fallback
      });
    });

    await batch.commit();
    res.json({ ok: true, count: products.length });
  } catch (e) {
    console.error('POST /admin/seed error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ---- Stripe Checkout
// POST /checkout/create-session  body: { items: [{ id, qty }] }
app.post('/checkout/create-session', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items' });
    }

    // Build line items from Firestore
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

// ---- Gen-1 export (firebase-functions v4.x)
exports.api = functions.region('us-central1').https.onRequest(app);