require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const REMOTE_HOST = 'https://rail-planner-pro.web.app';
  console.log('Fetching remote manifest from Firebase...');
  const res = await fetch(REMOTE_HOST + '/manifest.json?t=' + Date.now());
  const manifest = await res.json();
  console.log('Manifest version:', manifest.version);
  
  const settings = await prisma.globalSettings.upsert({
    where: { id: 'singleton' },
    update: { otaVersion: manifest.version },
    create: { 
        id: 'singleton', 
        otaVersion: manifest.version,
        email: 'support@ticketspro.in',
        phone: '1800-123-4567',
        address: '123 Express Hub, Tech Park Phase 2, Bengaluru, Karnataka 560100',
    }
  });
  console.log('OTA Version updated to', settings.otaVersion);
}

run().catch(console.error).finally(() => prisma.$disconnect());
