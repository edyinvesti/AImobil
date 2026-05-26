import { config } from 'dotenv';
import { createClient } from '@libsql/client';

config();

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN
});

(async() => {
  try {
    // Simulate what the /api/partner/properties endpoint does (from data_engine.cjs)
    const result = await client.execute(
      'SELECT id, title, type, price, location, city, neighborhood, bedrooms, bathrooms, ' +
      'parkingSpaces, area, sizeUnit, status, suites, livingRooms, kitchens, zipCode, state, ' +
      'streetNumber, complement, description, brokerName, brokerCreci, broker_creci, created_at ' +
      'FROM properties WHERE broker_creci = ? ORDER BY created_at DESC',
      ['987456-F']
    );
    
    console.log(`Found ${result.rows.length} properties for CRECI 987456-F`);
    
    const properties = result.rows.map(row => ({
      ...row,
      images: [], // Don't load images in list - fetch on demand (as per data_engine.cjs)
      thumbnail: null,
      address: row.location || '',
      size: row.area || 0,
      offerType: null,
      parkingSpaces: row.parkingSpaces || 0,
      sizeUnit: row.sizeUnit || 'm²',
      brokerCreci: row.brokerCreci || row.broker_creci || '',
    }));
    
    console.log('First property sample (as returned by /api/partner/properties endpoint):');
    console.log(JSON.stringify(properties[0], null, 2));
    
    // Also check what the property-image endpoint would return for this property
    if (properties.length > 0) {
      const propId = properties[0].id;
      console.log(`\nChecking property-image endpoint for ID: ${propId}`);
      
      const propertyResult = await client.execute({
        sql: 'SELECT * FROM properties WHERE id = ?',
        args: [propId]
      });
      
      if (propertyResult.rows.length > 0) {
        const row = propertyResult.rows[0];
        let images = [];
        if (row.images && row.images !== '[]' && row.images !== null) {
          try {
            images = JSON.parse(row.images);
          } catch(e) {
            console.log('Error parsing images:', e.message);
          }
        }
        
        console.log(`Property has ${images.length} image(s) in database`);
        if (images.length > 0) {
          console.log(`First image (preview): ${images[0].substring(0, 100)}...`);
        }
      }
    }
    
  } catch(err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
})();