import { config } from 'dotenv';
import { createClient } from '@libsql/client';

config();

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN
});

(async() => {
  try {
    // First, get a property ID from the database
    const result = await client.execute('SELECT id FROM properties LIMIT 1');
    
    if (result.rows.length === 0) {
      console.log('No properties found in database');
      return;
    }
    
    const propertyId = result.rows[0].id;
    console.log(`Testing endpoint with property ID: ${propertyId}`);
    
    // Now test the endpoint using fetch (Node.js has built-in fetch)
    const response = await fetch(`https://iamobil-gestor-imobili-rio.onrender.com/api/partner/property-image?id=${propertyId}`);
    
    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log('Endpoint response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success && data.images && data.images.length > 0) {
      console.log(`\nReceived ${data.images.length} image(s)`);
      console.log(`First image preview: ${data.images[0].substring(0, 100)}...`);
      console.log(`Is data URI: ${data.images[0].startsWith('data:image/')}`);
    } else {
      console.log('\nNo images received or unsuccessful response');
    }
    
  } catch(err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
})();