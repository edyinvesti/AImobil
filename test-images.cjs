const { createClient } = require('@libsql/client');

const client = createClient({ 
  url: 'libsql://iamobil-edyinvesti.aws-us-west-2.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc0OTg4NzUsImlkIjoiMDE5ZGRiMmUtNjUwMS03ZjViLWFiYTktZmM5NTkzZDAwY2NhIiwicmlkIjoiYzk2ZTRkZmEtOTExYi00YmFkLWEwYjMtYzY3Nzc3OTk1MDdkIn0.aKiA5aXmvfBKMpATrm34_c7IvkMK64XI1LHUtsMseYBej_0SzZb_VEMZSfujb72xCzerPZA3vdizhxzABLALAQ'
});

async function getPropertyImages(id) {
  try {
    const rs = await client.execute({
      sql: "SELECT images FROM properties WHERE id = ?",
      args: [id]
    });
    if (rs.rows.length === 0) return [];
    
    const imagesField = rs.rows[0].images;
    if (!imagesField || imagesField === '[]') return [];
    
    try {
      // The images field should be a valid JSON array string
      const parsed = JSON.parse(imagesField);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing images JSON:', e.message, 'imagesField:', imagesField);
      // Try to fix common JSON issues
      try {
        // Handle case where it might be missing outer brackets
        if (imagesField.startsWith('"') && imagesField.endsWith('"')) {
          const fixed = '[' + imagesField + ']';
          const parsed = JSON.parse(fixed);
          return Array.isArray(parsed) ? parsed : [];
        }
        // Handle case where it might have extra characters
        const trimmed = imagesField.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [];
        }
      } catch (fixError) {
        console.error('Error fixing images JSON:', fixError.message);
      }
      return [];
    }
  } catch (e) {
    console.error('getPropertyImages error:', e.message);
    return [];
  }
}

async function testGetPropertyImages() {
  // Test with first property
  const result = await client.execute('SELECT id FROM properties LIMIT 1');
  const propertyId = result.rows[0].id;
  console.log('Testing getPropertyImages for ID:', propertyId);
  
  const images = await getPropertyImages(propertyId);
  console.log('Retrieved images:', images.length, 'items');
  if (images.length > 0) {
    console.log('First image type:', typeof images[0]);
    console.log('First image starts with data:', images[0].startsWith('data:'));
    console.log('First image preview:', images[0].substring(0, 50) + '...');
  }
}

testGetPropertyImages();