// setup_db.js - Run with: node setup_db.js
// Requires: npm install mongodb dotenv

import dns from "node:dns";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI not set in .env");

const dnsServers = process.env.DNS_SERVERS?.split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (dnsServers?.length) {
  dns.setServers(dnsServers);
} else {
  const current = dns.getServers();
  const localOnly = current.every(
    (s) => s === "127.0.0.1" || s === "::1" || s.startsWith("127.")
  );
  if (localOnly && current.length > 0) {
    console.warn(
      "Node DNS is localhost-only (common with VPN/proxy tools); using 8.8.8.8 and 1.1.1.1 for Atlas."
    );
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }
}

const client = new MongoClient(uri);

async function setup() {
  await client.connect();
  console.log("✅ Connected to MongoDB Atlas");

  const db = client.db("hodari");

  // ── users ──────────────────────────────────────────────
  await db.createCollection("users");
  await db.collection("users").createIndex({ user_id: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });

  await db.collection("users").insertOne({
    user_id: "usr_001",
    email: "amara@example.com",
    home_country: "RW",
    languages: ["en", "rw", "fr"],
    dietary_flags: ["halal"],
    budget_tier: "mid",           // low | mid | high
    accessibility_needs: [],
    created_at: new Date(),
  });

  // ── places ─────────────────────────────────────────────
  await db.createCollection("places");
  await db.collection("places").createIndex({ place_id: 1 }, { unique: true });
  await db.collection("places").createIndex({ coordinates: "2dsphere" });

  await db.collection("places").insertOne({
    place_id: "plc_001",
    name: "Question Coffee",
    city: "Kigali",
    coordinates: {
      type: "Point",
      coordinates: [30.0619, -1.9441],   // [lng, lat] — GeoJSON standard
    },
    categories: ["cafe", "coworking", "brunch"],
    price_level: 2,                        // 1–4 scale
    description: "Specialty coffee roaster and community space in Kigali.",
    embedding: null,                        // 768-d vector — populated later
  });

  // ── interactions ───────────────────────────────────────
  await db.createCollection("interactions");
  await db.collection("interactions").createIndex({ user_id: 1, timestamp: -1 });
  await db.collection("interactions").createIndex({ place_id: 1 });
  await db.collection("interactions").createIndex({ session_id: 1 });

  await db.collection("interactions").insertOne({
    user_id: "usr_001",
    place_id: "plc_001",
    signal: "liked",          // liked | disliked | visited | skipped | booked
    context: {
      time_of_day: "morning",
      companion: "solo",
      weather: "sunny",
    },
    session_id: "sess_abc123",
    timestamp: new Date(),
  });

  console.log("✅ Collections created: users, places, interactions");
  console.log("✅ Seed documents inserted (1 per collection)");

  // Verify
  const counts = {
    users: await db.collection("users").countDocuments(),
    places: await db.collection("places").countDocuments(),
    interactions: await db.collection("interactions").countDocuments(),
  };
  console.log("📊 Document counts:", counts);

  await client.close();
}

setup().catch((err) => {
  console.error("❌ Setup failed:", err);
  process.exit(1);
});
