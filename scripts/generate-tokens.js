// scripts/generate-tokens.js
const fs = require("fs");
const crypto = require("crypto");

// Generate 100 unique tokens
const tokens = Array.from({ length: 100 }, () => ({
  token: crypto.randomBytes(16).toString("hex"),
  used: false,
  createdAt: new Date().toISOString(),
}));

fs.writeFileSync("tokens.json", JSON.stringify(tokens, null, 2));
console.log("✅ tokens.json created with 100 one-time unlock tokens.");