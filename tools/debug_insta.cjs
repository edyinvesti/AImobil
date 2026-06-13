require('dotenv').config();
const { createClient } = require('@libsql/client');
const { MarketingEngine } = require('./server/marketing-engine.cjs');

async function debug() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  
  try {
    // 1. Get the property ID from campaigns
    const rs = await client.execute("SELECT property_id, property_title FROM campaigns WHERE instagram_status = 'DRAFT' ORDER BY created_at DESC LIMIT 1");
    if (!rs.rows.length) {
      console.log('No DRAFT campaigns found.');
      return;
    }
    const propId = rs.rows[0].property_id;
    console.log('Testing property:', rs.rows[0].property_title, propId);

    // 2. Initialize MarketingEngine with a mock Cloudinary (or skip if not needed, but let's try the direct postarNoInstagram)
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const engine = new MarketingEngine(cloudinary);
    
    // 3. Post to instagram!
    console.log('--- RUNNING EXPERIMENT ---');
    const result = await engine.postarNoInstagram(propId);
    console.log('FINAL RESULT:', JSON.stringify(result, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    client.close();
  }
}

debug();
