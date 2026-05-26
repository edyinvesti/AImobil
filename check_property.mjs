import { config } from 'dotenv';
import { createClient } from '@libsql/client';

// Carregar variáveis de ambiente
config();

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.LIBSQL_AUTH_TOKEN
});

(async() => {
  try {
    // Primeiro, vamos pegar uma propriedade qualquer para testar
    const result = await client.execute('SELECT id, title, images FROM properties LIMIT 1');
    
    if (result.rows.length === 0) {
      console.log('Nenhuma propriedade encontrada no banco');
      return;
    }
    
    const prop = result.rows[0];
    console.log('Propriedade encontrada:');
    console.log(`  ID: ${prop.id}`);
    console.log(`  Título: ${prop.title}`);
    console.log(`  Campo images (raw): ${prop.images}`);
    console.log(`  Tipo: ${typeof prop.images}`);
    
    if (prop.images && prop.images !== '[]' && prop.images !== null) {
      try {
        const parsed = JSON.parse(prop.images);
        console.log(`  Imagens parseadas: ${JSON.stringify(parsed)}`);
        console.log(`  É array: ${Array.isArray(parsed)}`);
        console.log(`  Length: ${parsed.length}`);
      } catch(e) {
        console.log(`  Erro ao parsear: ${e.message}`);
      }
    } else {
      console.log('  Campo images está vazio ou nulo');
    }
    
  } catch(err) {
    console.error('Erro:', err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
})();