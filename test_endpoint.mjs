import { config } from 'dotenv';
import { createClient } from '@libsql/client';

config();

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN
});

(async() => {
  try {
    // Get a property ID
    const result = await client.execute('SELECT id, title FROM properties LIMIT 1');
    
    if (result.rows.length === 0) {
      console.log('Nenhuma propriedade encontrada');
      return;
    }
    
    const prop = result.rows[0];
    const propertyId = prop.id;
    console.log(`Testando com propriedade ID: ${propertyId} (${prop.title})`);
    
    // Now test the endpoint equivalent by calling getPropertyById logic directly
    const propertyResult = await client.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [propertyId]
    });
    
    if (propertyResult.rows.length === 0) {
      console.log('Propriedade não encontrada');
      return;
    }
    
    const row = propertyResult.rows[0];
    console.log('Dados brutos do banco:');
    console.log(`  images field: ${row.images}`);
    console.log(`  tipo: ${typeof row.images}`);
    
    let images = [];
    if (row.images && row.images !== '[]' && row.images !== null) {
      try {
        images = JSON.parse(row.images);
        console.log(`  Imagens parseadas: ${images.length} itens`);
        if (images.length > 0) {
          console.log(`  Primeira imagem (primeiros 100 chars): ${images[0].substring(0, 100)}...`);
          console.log(`  É base64 válida? ${/^data:image\/(png|jpe?g|gif|webp);base64,/.test(images[0]) || /^[A-Za-z0-9+/]+={0,2}$/.test(images[0])}`);
        }
      } catch(e) {
        console.log(`  Erro ao parsear JSON: ${e.message}`);
      }
    } else {
      console.log('  Campo images está vazio');
    }
    
  } catch(err) {
    console.error('Erro:', err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
})();