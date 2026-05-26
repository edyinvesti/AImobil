import { config } from 'dotenv';
import { createClient } from '@libsql/client';

config();

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN
});

(async() => {
  try {
    const creci = '987456-F';
    console.log(`Checking properties for CRECI: ${creci}`);
    
    const result = await client.execute({
      sql: 'SELECT id, title, images FROM properties WHERE broker_creci = ?',
      args: [creci]
    });
    
    console.log(`Found ${result.rows.length} properties`);
    
    result.rows.forEach((prop, index) => {
      console.log(`\n${index + 1}. ID: ${prop.id}`);
      console.log(`   Título: ${prop.title}`);
      console.log(`   Images field (raw): ${prop.images}`);
      
      if (prop.images && prop.images !== '[]' && prop.images !== null) {
        try {
          const parsed = JSON.parse(prop.images);
          console.log(`   Parsed images: ${parsed.length} items`);
          if (parsed.length > 0) {
            console.log(`   First image (first 100 chars): ${parsed[0].substring(0, 100)}...`);
            console.log(`   Is valid data URI? ${parsed[0].startsWith('data:image/')}`);
          }
        } catch(e) {
          console.log(`   Error parsing images: ${e.message}`);
        }
      } else {
        console.log(`   No images stored`);
      }
    });
    
  } catch(err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
})();