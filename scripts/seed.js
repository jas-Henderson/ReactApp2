// scripts/seed.js
import fs from "fs";
import path from "path";
import axios from "axios";

const seedPath = path.resolve("./seed.json");
if (!fs.existsSync(seedPath)) {
  console.error("❌ seed.json not found");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(seedPath, "utf8"));

async function seed() {
  try {
    const url = "http://127.0.0.1:5002/reactapp2-8057f/us-central1/api/admin/seed";
    const res = await axios.post(url, data, {
      headers: { "Content-Type": "application/json" }
    });
    console.log("✅ Seed complete:", res.data);
  } catch (err) {
    console.error("❌ Seed failed:", err.response?.data || err.message);
    process.exit(1);
  }
}

seed();