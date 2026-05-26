import { createClient } from '@libsql/client';

const client = createClient({ 
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});

async function checkBrokersForPhotos() {
  try {
    console.log('=== CHECKING BROKERS TABLE FOR PHOTO DATA ===\n');
    
    // Check available tables first
    const tablesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Available tables:', tablesResult.rows.map(r => r.name).join(', '));
    console.log('');
    
    // Check if brokers table exists
    const brokersExists = tablesResult.rows.some(r => r.name === 'brokers');
    if (!brokersExists) {
      console.log('❌ Brokers table does not exist in the database!');
      return;
    }
    
    console.log('✅ Brokers table found\n');
    
    // Get table schema
    const schemaResult = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='brokers'");
    console.log('Table Schema:');
    console.log(schemaResult.rows[0].sql);
    console.log('');
    
    // Get column details
    const pragmaResult = await client.execute('PRAGMA table_info(brokers)');
    console.log('Column Details:');
    pragmaResult.rows.forEach(col => {
      console.log(`${col.name}: ${col.type}${col.pk ? ' PK' : ''}${col.notnull ? ' NOT NULL' : ''}`);
    });
    console.log('');
    
    // Identify photo/image related columns
    const photoColumns = pragmaResult.rows.filter(col => 
      ['photo', 'image', 'picture', 'avatar', 'foto'].some(term => 
        col.name.toLowerCase().includes(term)
      )
    );
    
    if (photoColumns.length > 0) {
      console.log(`🔍 FOUND ${photoColumns.length} PHOTO/IMAGE RELATED COLUMN(S):`);
      photoColumns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
      console.log('');
      
      // Check data in each photo column
      for (const col of photoColumns) {
        console.log(`📊 Checking column: ${col.name}`);
        
        // Count non-null/non-empty values
        const countQuery = `SELECT COUNT(*) as total FROM brokers WHERE ${col.name} IS NOT NULL AND ${col.name} != ''`;
        const countResult = await client.execute(countQuery);
        const nonEmptyCount = countResult.rows[0].total;
        
        // Get total count for percentage
        const totalResult = await client.execute('SELECT COUNT(*) as total FROM brokers');
        const totalBrokers = totalResult.rows[0].total;
        
        console.log(`  Non-empty values: ${nonEmptyCount} / ${totalBrokers} (${((nonEmptyCount/totalBrokers)*100).toFixed(1)}%)`);
        
        if (nonEmptyCount > 0) {
          // Get sample values (first 3)
          const sampleQuery = `SELECT ${col.name} FROM brokers WHERE ${col.name} IS NOT NULL AND ${col.name} != '' LIMIT 3`;
          const sampleResult = await client.execute(sampleQuery);
          console.log('  Sample values:');
          sampleResult.rows.forEach((row, index) => {
            const value = row[col.name];
            // Truncate long values for display
            let displayValue = value;
            if (typeof value === 'string' && value.length > 50) {
              displayValue = value.substring(0, 50) + '...';
            }
            console.log(`    ${index + 1}. ${displayValue}`);
          });
        } else {
          console.log('  No data found in this column.');
        }
        console.log('');
      }
    } else {
      console.log('❌ NO PHOTO/IMAGE RELATED COLUMNS FOUND IN BROKERS TABLE.');
      console.log('All columns in brokers table:');
      pragmaResult.rows.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
      console.log('\nThis suggests that manager/broker photos are either:');
      console.log('  1. Stored in a different table');
      console.log('  2. Stored with a different column naming convention');
      console.log('  3. Not implemented in the database schema yet');
    }
    
    // Show sample broker data for context
    console.log('\n' + '='.repeat(60));
    console.log('SAMPLE BROKER DATA (First 3 records):');
    const sampleBrokers = await client.execute('SELECT * FROM brokers LIMIT 3');
    if (sampleBrokers.rows.length === 0) {
      console.log('No brokers found in the database.');
    } else {
      sampleBrokers.rows.forEach((broker, index) => {
        console.log(`\nBroker #${index + 1}:`);
        Object.keys(broker).forEach(key => {
          const value = broker[key];
          let displayValue = value;
          if (value === null) displayValue = '(NULL)';
          else if (value === '') displayValue = '(empty)';
          else if (typeof value === 'string' && value.length > 30) {
            displayValue = value.substring(0, 30) + '...';
          }
          console.log(`  ${key.padEnd(18)}: ${displayValue}`);
        });
      });
    }
    
  } catch (error) {
    console.error('Error checking brokers table:', error.message);
    console.error(error.stack);
  }
}

checkBrokersForPhotos();