require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  const REMOTE_HOST = 'https://rail-planner-pro.web.app';
  console.log('Fetching remote manifest from Firebase...');
  const res = await fetch(REMOTE_HOST + '/manifest.json?t=' + Date.now());
  const manifest = await res.json();
  console.log('Manifest version:', manifest.version);
  
  const query = `
    INSERT INTO "GlobalSettings" ("id", "otaVersion", "email", "phone", "address") 
    VALUES ('singleton', $1, 'support@ticketspro.in', '1800-123-4567', '123 Express Hub, Tech Park Phase 2, Bengaluru, Karnataka 560100')
    ON CONFLICT ("id") 
    DO UPDATE SET "otaVersion" = $1;
  `;
  
  await client.query(query, [manifest.version]);
  console.log('OTA Version updated to', manifest.version);
  await client.end();
}

run().catch(console.error);
