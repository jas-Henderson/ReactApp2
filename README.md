💇‍♀️ Salon Store (React + Vite + Firebase + Stripe)

An e-commerce demo app for salon products. Customers can browse, filter, add items to a cart 🛒, and complete a checkout flow via Stripe.

Includes an Admin Dashboard where admins can log in, create/edit/delete products, and upload images.

⸻

🛠️ Tech Stack
	•	React 18 + Vite ⚡ (with React Router)
	•	CSS (utility classes; responsive, mobile-first)
	•	Firebase
	•	Firestore (products DB)
	•	Authentication (email/password + Google)
	•	Cloud Functions (Express API + Stripe integration)
	•	Emulator Suite (for local development)
	•	Stripe Checkout (test mode)

⸻

📦 Prerequisites
	•	Node.js 18+ (Node 20 is fine)
	•	Firebase CLI → npm i -g firebase-tools
	•	A Firebase project (this repo uses reactapp2-8057f)
	•	A Stripe account (use test mode 🧪)

🚀 Local Setup
# clone the project
git clone https://github.com/jas-Henderson/ReactApp2.git
cd ReactApp2

# install frontend deps
npm i

# install backend deps
cd functions
npm i
cd ..

🔑 Environment Variables
Root .env (used by Vite/React)
# Firebase web config (from Firebase console → Project settings → Web app)
VITE_FIREBASE_API_KEY=AIzaSyA9ZQNiVOdNK8NINU4_-ZS9LJpc4bbn7Z8
VITE_FIREBASE_AUTH_DOMAIN=reactapp2-8057f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=reactapp2-8057f
VITE_FIREBASE_STORAGE_BUCKET=reactapp2-8057f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=666103800129
VITE_FIREBASE_APP_ID=1:666103800129:web:a7ceded85ab863b5b601c0

# Functions Region + Base URL (emulator)
VITE_FIREBASE_FUNCTIONS_REGION=us-central1
VITE_BACKEND_BASE_URL=http://127.0.0.1:5002/reactapp2-8057f/us-central1/api

# Stripe publishable key (TEST MODE)
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx

# Use Firebase Auth Emulator (optional, during dev)
VITE_USE_AUTH_EMULATOR=1

functions/.env.local (server secrets for local only)

STRIPE_SECRET_KEY=sk_test_xxx
WEB_APP_URL=http://localhost:5173

⚠️ Never commit secrets like STRIPE_SECRET_KEY. .env.local is gitignored.

▶️ Running Locally

Terminal A – Firebase Emulators
firebase emulators:start --only functions,firestore,auth --project reactapp2-8057f

	•	Functions → http://127.0.0.1:5002/reactapp2-8057f/us-central1/api
	•	Firestore UI → http://127.0.0.1:4001/firestore
	•	Auth UI → http://127.0.0.1:4000/auth

Terminal B – Vite Dev Server

npm run dev
# App at http://localhost:5173

🌱 Seeding Products

With emulators running, load products into Firestore:

curl -X POST -H "Content-Type: application/json" \
  -d @seed.json \
  "http://127.0.0.1:5002/reactapp2-8057f/us-central1/api/admin/seed"

		•	seed.json contains sample products.
	•	View them in Firestore Emulator → http://127.0.0.1:4001/firestore.

	🔐 Admin Access
	1.	Go to Admin Login → sign up with email + password.
	2.	Grant yourself admin role via the Functions API:
	curl -X POST "http://127.0.0.1:5002/reactapp2-8057f/us-central1/api/admin/grant" \
  -H "Content-Type: application/json" \
  -H "x-setup-secret: dev-secret" \
  -d '{"email":"your_email@example.com"}'

		3.	Refresh the app → now you can access /admin dashboard.

		🛒 Using the App
	•	Browse Products → search, filter, sort
	•	Add to Cart → context-based, stored in localStorage
	•	Proceed to Checkout → creates Stripe Checkout Session

💳 Stripe test card →
4242 4242 4242 4242 (any future expiry, any CVC, any zip)


📡 API Endpoints (Local)

Base URL:
http://127.0.0.1:5002/reactapp2-8057f/us-central1/api
	•	GET /health → { "ok": true }
	•	GET /products?q=&category=&sort= → returns products
	•	POST /admin/seed → seed sample products
	•	POST /checkout/create-session → creates Stripe checkout
	•	POST /admin/products → create product (admin)
	•	PUT /admin/products/:id → update product
	•	DELETE /admin/products/:id → delete product

	👉 After following these steps, you’ll have a working local storefront + admin dashboard with seeded products.