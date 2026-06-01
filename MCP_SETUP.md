# MongoDB MCP Server — Local Setup Guide

## What the MCP server does
Exposes your Atlas database as a set of "tools" (find, insert, update, etc.)
that Claude or any MCP client can call without touching raw driver code.

---

## 1 — Install the official MongoDB MCP server

```bash
npm install -g @mongodb-js/mongodb-mcp-server
# or run it ephemerally with npx (no install needed):
npx -y @mongodb-js/mongodb-mcp-server
```

---

## 2 — Configure it (two options)

### Option A — Environment variable (simplest)
```bash
export MONGODB_URI="mongodb+srv://hodari_rw:<password>@hodari-cluster.xxxxx.mongodb.net/hodari?retryWrites=true&w=majority"
npx @mongodb-js/mongodb-mcp-server
```

### Option B — Config file  `~/.mongodb-mcp/config.json`
```json
{
  "connectionString": "mongodb+srv://hodari_rw:<password>@hodari-cluster.xxxxx.mongodb.net/hodari?retryWrites=true&w=majority"
}
```
Then just run: `npx @mongodb-js/mongodb-mcp-server`

---

## 3 — Wire it into Claude Desktop  `claude_desktop_config.json`

macOS path:  `~/Library/Application Support/Claude/claude_desktop_config.json`  
Windows path: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mongodb-hodari": {
      "command": "npx",
      "args": ["-y", "@mongodb-js/mongodb-mcp-server"],
      "env": {
        "MONGODB_URI": "mongodb+srv://hodari_rw:<password>@hodari-cluster.xxxxx.mongodb.net/hodari?retryWrites=true&w=majority"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

---

## 4 — Test the MCP round-trip (Node driver, no MCP server needed)

```bash
cd hodari
cp .env.example .env          # fill in your real MONGODB_URI
npm install
npm run test:mcp
```

Expected output:
```
=== MCP Round-Trip Test ===

📄 users collection — read 1 document:
{ user_id: "usr_001", email: "amara@example.com", ... }

📄 places collection — read 1 document:
{ place_id: "plc_001", name: "Question Coffee", ... }

📄 interactions collection — read 1 document:
{ user_id: "usr_001", place_id: "plc_001", signal: "liked", ... }

✅ Round-trip OK — all 3 collections readable via driver
```

---

## 5 — Screenshot checklist for Atlas dashboard

Open: Atlas → Browse Collections → hodari  
Confirm you can see all three collection names in the left sidebar:
- `hodari.users`
- `hodari.places`
- `hodari.interactions`

Take screenshot — this satisfies requirement 6.

---

## Schema reference

### users
| Field | Type | Notes |
|---|---|---|
| user_id | String | unique index |
| email | String | unique index |
| home_country | String | ISO 3166-1 alpha-2 |
| languages | Array<String> | BCP-47 codes |
| dietary_flags | Array<String> | halal, vegan, etc. |
| budget_tier | String | low / mid / high |
| accessibility_needs | Array<String> | |
| created_at | Date | |

### places
| Field | Type | Notes |
|---|---|---|
| place_id | String | unique index |
| name | String | |
| city | String | |
| coordinates | GeoJSON Point | 2dsphere index |
| categories | Array<String> | |
| price_level | Number | 1–4 |
| description | String | |
| embedding | Array<Number> or null | 768-d, null until Phase 2 |

### interactions
| Field | Type | Notes |
|---|---|---|
| user_id | String | compound index with timestamp |
| place_id | String | index |
| signal | String | liked/disliked/visited/skipped/booked |
| context | Object | time_of_day, companion, weather, … |
| session_id | String | index |
| timestamp | Date | |
