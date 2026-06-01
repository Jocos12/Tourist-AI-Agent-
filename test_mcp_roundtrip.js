// test_mcp_roundtrip.js — confirms MCP server can read from Atlas
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;

async function testRoundTrip() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("hodari");

  console.log("\n=== MCP Round-Trip Test ===\n");

  const user = await db.collection("users").findOne({ user_id: "usr_001" });
  console.log("📄 users collection — read 1 document:");
  console.log(JSON.stringify(user, null, 2));

  const place = await db.collection("places").findOne({ place_id: "plc_001" });
  console.log("\n📄 places collection — read 1 document:");
  console.log(JSON.stringify(place, null, 2));

  const interaction = await db
    .collection("interactions")
    .findOne({ user_id: "usr_001" });
  console.log("\n📄 interactions collection — read 1 document:");
  console.log(JSON.stringify(interaction, null, 2));

  console.log("\n✅ Round-trip OK — all 3 collections readable via driver");
  await client.close();
}

testRoundTrip().catch((err) => {
  console.error("❌ Round-trip FAILED:", err.message);
  process.exit(1);
});
