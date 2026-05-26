import { createClient } from '@libsql/client';
import 'dotenv/config';

const client = createClient({
  url: process.env.DATABASE_URL || 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: process.env.LIBSQL_AUTH_TOKEN || ''
});

async function testQuery() {
  try {
    const sql = 'SELECT id, title, type, offer_type, price, address, city, neighborhood, bedrooms, bathrooms, parking_spaces, size, size_unit, status, created_at FROM properties ORDER BY created_at DESC LIMIT 20';
    console.log('Running query...');
    const rs = await client.execute(sql);
    console.log('Success! Rows:', rs.rows.length);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testQuery();
