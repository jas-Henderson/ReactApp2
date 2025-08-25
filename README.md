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
