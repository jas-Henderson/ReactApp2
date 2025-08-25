# 💇‍♀️ Salon Store (React + Vite + Firebase + Stripe)

An e-commerce demo app for **salon products**. Customers can browse, filter, add items to a cart 🛒, and complete a checkout flow via **Stripe**.  

Frontend: **React (Vite)** ⚛️  
Backend: **Firebase Functions + Firestore** 🔥  
Payments: **Stripe Checkout** 💳  

---

## 🛠️ Tech Stack

- **React 18 + Vite** ⚡ (with React Router)
- **CSS** (utility classes; responsive, mobile-first)
- **Firebase**  
  - Firestore (products DB)  
  - Cloud Functions (Express API + Stripe integration)  
  - Emulator Suite (for local development)  
- **Stripe Checkout** (test mode)  

---

## 📦 Prerequisites

- Node.js **18+** (Node 20 is fine)  
- Firebase CLI → `npm i -g firebase-tools`  
- A Firebase project (this repo uses `reactapp2-8057f`)  
- A Stripe account (use **test mode** 🧪)  

---

## 🚀 Local Setup

```bash
# clone the project
git clone https://github.com/jas-Henderson/ReactApp2.git
cd ReactApp2

# install front-end deps
npm i

# install backend deps
cd functions
npm i
cd ..

🔑 Environment Variables

Create two files:

Root .env (used by Vite/React)

# Firebase web config (from Firebase console > Project settings > Web app)
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=reactapp2-8057f
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID

# Functions Region + Base URL (emulator)
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
VITE_BACKEND_BASE_URL=http://127.0.0.1:5002/reactapp2-8057f/us-central1/api

# Stripe publishable key (TEST MODE)
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx

functions/.env.local (server secrets for local only)

STRIPE_SECRET_KEY=sk_test_xxx
WEB_APP_URL=http://localhost:5173

⚠️ Never commit secrets like STRIPE_SECRET_KEY. .env.local is gitignored.

▶️ Running Locally

Terminal A – Start Firebase emulators
firebase emulators:start --only functions,firestore --project reactapp2-8057f

	•	Functions → http://127.0.0.1:5002/reactapp2-8057f/us-central1/api
	•	Firestore UI → http://127.0.0.1:4001/firestore

Terminal B – Start Vite

npm run dev
# App at http://localhost:5173

🌱 Seeding Products

With emulators running, seed the database using seed.json:
curl -X POST -H "Content-Type: application/json" \
  -d @seed.json \
  "http://127.0.0.1:5002/reactapp2-8057f/us-central1/api/admin/seed"
View them in the Firestore Emulator UI:
👉 http://127.0.0.1:4001/firestore

🛒 Using the App
	•	Browse Products page → search, filter, sort
	•	Add products → Cart (context-based, stored in localStorage)
	•	Proceed to Checkout → creates Stripe Checkout Session

💳 Stripe test card →
4242 4242 4242 4242 (any future expiry, any CVC, any zip)

⸻

📡 API Endpoints (Local)

Base URL:
http://127.0.0.1:5002/reactapp2-8057f/us-central1/api
	•	GET /health → { "ok": true }
	•	GET /products?q=&category=&sort= → Returns products
	•	POST /admin/seed
Body: { "products": [ { name, description, priceCents, ... } ] }
	•	POST /checkout/create-session
Body: { "items": [ { "id": "<docId>", "qty": 1 } ] }
Returns → { "url": "https://checkout.stripe.com/..." }
