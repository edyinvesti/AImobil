// scripts/migrate-images-to-r2.cjs
// Script de migração de imagens existentes para R2
// Executar: node scripts/migrate-images-to-r2.cjs

require('dotenv').config();
const { createClient } = require('@libsql/client');
const StorageService = require('../server/services/storage.service.cjs');
const logger = require('../server/utils/logger');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Missing TURSO credentials in .env');
  process.exit(1);
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const storage = new StorageService();

// Check if R2 is configured
if (!storage.configured) {
  console.error('❌ R2 not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env');
  process.exit(1);
}

async function migrateImages() {
  console.log('🔄 Starting image migration to R2...\n');
  
  // Get all properties with images
  const result = await client.execute('SELECT id, images, thumbnail FROM properties WHERE images IS NOT NULL AND images != \'[]\'');
  
  console.log(`📊 Found ${result.rows.length} properties with images\n`);
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const property of result.rows) {
    try {
      let images = [];
      try {
        images = JSON.parse(property.images);
      } catch (e) {
        console.log(`  ⚠️ Property ${property.id}: Invalid images JSON, skipping`);
        skipped++;
        continue;
      }
      
      if (!Array.isArray(images) || images.length === 0) {
        console.log(`  ⏭️ Property ${property.id}: No images, skipping`);
        skipped++;
        continue;
      }
      
      console.log(`  📦 Property ${property.id}: Migrating ${images.length} images...`);
      
      const migratedImages = [];
      
      for (let i = 0; i < images.length; i++) {
        const imageData = images[i];
        
        // Skip if already an R2 URL
        if (imageData.startsWith('http')) {
          migratedImages.push(imageData);
          console.log(`    ⏭️ Image ${i + 1}: Already a URL, skipping`);
          continue;
        }
        
        // Upload base64 to R2
        const filename = `${property.id}_${i + 1}.jpg`;
        const result = await storage.uploadBase64(imageData, filename, `properties/${property.id}`);
        migratedImages.push(result.url);
        console.log(`    ✅ Image ${i + 1}: Uploaded to ${result.url}`);
      }
      
      // Update property with new URLs
      await client.execute({
        sql: 'UPDATE properties SET images = ? WHERE id = ?',
        args: [JSON.stringify(migratedImages), property.id]
      });
      
      // Migrate thumbnail if exists
      if (property.thumbnail && !property.thumbnail.startsWith('http')) {
        const thumbResult = await storage.uploadBase64(property.thumbnail, `${property.id}_thumb.jpg`, `properties/${property.id}`);
        await client.execute({
          sql: 'UPDATE properties SET thumbnail = ? WHERE id = ?',
          args: [thumbResult.url, property.id]
        });
        console.log(`    ✅ Thumbnail migrated`);
      }
      
      migrated++;
      console.log(`  ✅ Property ${property.id}: Done\n`);
      
    } catch (e) {
      console.error(`  ❌ Property ${property.id}: Error - ${e.message}`);
      errors++;
    }
  }
  
  console.log('\n═══ MIGRATION COMPLETE ═══');
  console.log(`✅ Migrated: ${migrated}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  
  process.exit(0);
}

migrateImages().catch(e => {
  console.error('\n❌ Fatal error:', e.message);
  process.exit(1);
});
