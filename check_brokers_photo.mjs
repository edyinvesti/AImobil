import { createClient } from '@libsql/client';

const client = createClient({ 
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});

async function testConnection() {
  try {
    console.log('Testing Turso connection...');
    const result = await client.execute('SELECT 1 as test');
    console.log('✅ Connection successful:', result.rows);
    
    // Check tables
    const tablesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📋 Available tables:', tablesResult.rows.map(r => r.name));
    
    // Count properties
    const countResult = await client.execute('SELECT COUNT(*) as total FROM properties');
    console.log('🏠 Properties count:', countResult.rows[0].total);
    
    // Count leads
    const leadsCountResult = await client.execute('SELECT COUNT(*) as total FROM leads');
    console.log('👥 Leads count:', leadsCountResult.rows[0].total);
    
    // Count appointments
    const appointmentsCountResult = await client.execute('SELECT COUNT(*) as total FROM appointments');
    console.log('📅 Appointments count:', appointmentsCountResult.rows[0].total);
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  }
}

testConnection();