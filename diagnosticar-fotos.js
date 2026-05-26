import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Carregar variáveis de ambiente do arquivo .env
config();

// Usar as mesmas variáveis de ambiente que o código real
const DATABASE_URL = process.env.DATABASE_URL;
const LIBSQL_AUTH_TOKEN = process.env.LIBSQL_AUTH_TOKEN;

if (!DATABASE_URL) {
  console.error('❌ ERRO: DATABASE_URL não configurada no .env');
  process.exit(1);
}

if (!LIBSQL_AUTH_TOKEN) {
  console.error('❌ ERRO: LIBSQL_AUTH_TOKEN não configurada no .env');
  process.exit(1);
}

console.log('🔍 Conectando ao banco Turso...');
console.log(`   URL: ${DATABASE_URL.substring(0, 30)}...`);

const client = createClient({
  url: DATABASE_URL,
  authToken: LIBSQL_AUTH_TOKEN
});

async function diagnosticarFotosCreci(creci) {
  console.log(`\n🔎 PROCURANDO IMÓVEIS COM CRECI: ${creci}\n`);
  
  try {
    // 1. Buscar propriedades com esse CRECI
    const propriedadesResult = await client.execute({
      sql: "SELECT id, title, broker_creci, images FROM properties WHERE broker_creci = ?",
      args: [creci]
    });
    
    if (propriedadesResult.rows.length === 0) {
      console.log(`❌ Nenhum imóvel encontrado com CRECI ${creci}`);
      return;
    }
    
    console.log(`✅ Encontrados ${propriedadesResult.rows.length} imóvel(is) com CRECI ${creci}:\n`);
    
    let totalComFotos = 0;
    let totalSemFotos = 0;
    
    for (const prop of propriedadesResult.rows) {
      console.log(`🏷️  ID: ${prop.id}`);
      console.log(`   Título: ${prop.title}`);
      console.log(`   CRECI no banco: ${prop.broker_creci || '(vazio)'}`);
      
      // Analisar o campo de imagens
      let imagens = [];
      let imagensValidas = 0;
      
      if (prop.images && prop.images !== '[]' && prop.images !== null) {
        try {
          // Tentar parsear o JSON
          const imagensStr = prop.images.startsWith('[') ? prop.images : '[' + prop.images;
          imagens = JSON.parse(imagensStr);
          
          if (Array.isArray(imagens)) {
            imagensValidas = imagens.length;
            console.log(`   🖼️  Imagens no banco: ${imagensValidas}`);
            
            if (imagensValidas > 0) {
              console.log(`   📋 Lista de imagens:`);
              imagens.forEach((img, index) => {
                console.log(`      ${index + 1}. ${img}`);
              });
              totalComFotos++;
            } else {
              console.log(`   ⚠️  Array de imagens está vazio`);
              totalSemFotos++;
            }
          } else {
            console.log(`   ❌ Campo imagens não é um array válido: ${typeof imagens}`);
            totalSemFotos++;
          }
        } catch (e) {
          console.log(`   ❌ Erro ao processar imagens: ${e.message}`);
          console.log(`   📝 Conteúdo bruto: ${prop.images}`);
          totalSemFotos++;
        }
      } else {
        console.log(`   ❌ Nenhuma imagem registrada`);
        totalSemFotos++;
      }
      
      console.log('');
    }
    
    // Resumo
    console.log('📊 RESUMO:');
    console.log(`   Total de imóveis: ${propriedadesResult.rows.length}`);
    console.log(`   Com fotos: ${totalComFotos}`);
    console.log(`   Sem fotos: ${totalSemFotos}`);
    
    // 2. Verificar consistência com sistema de arquivos (se houver uploads local)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    console.log(`\n📁 Verificando pasta de uploads: ${uploadsDir}`);
    
    if (fs.existsSync(uploadsDir)) {
      const arquivos = fs.readdirSync(uploadsDir);
      console.log(`   📄 Arquivos encontrados: ${arquivos.length}`);
      
      if (arquivos.length > 0) {
        console.log(`   📋 Primeiros 5 arquivos:`);
        arquivos.slice(0, 5).forEach((arquivo, index) => {
          console.log(`      ${index + 1}. ${arquivo}`);
        });
        
        // Extrair nomes de arquivos do banco para comparação
        const nomesBanco = [];
        for (const prop of propriedadesResult.rows) {
          if (prop.images && prop.images !== '[]' && prop.images !== null) {
            try {
              const imagensStr = prop.images.startsWith('[') ? prop.images : '[' + prop.images;
              const imagens = JSON.parse(imagensStr);
              if (Array.isArray(imagens)) {
                nomesBanco.push(...imagens);
              }
            } catch (e) {
              // Ignorar erros de parse aqui
            }
          }
        }
        
        if (nomesBanco.length > 0) {
          console.log(`\n🔍 Comparando banco com sistema de arquivos:`);
          const faltandoNoSistema = nomesBanco.filter(nome => !arquivos.includes(nome));
          const extrasNoSistema = arquivos.filter(arquivo => !nomesBanco.includes(arquivo));
          
          if (faltandoNoSistema.length === 0 && extrasNoSistema.length === 0) {
            console.log(`   ✅ PERFEITO: Arquivos do banco correspondem exatamente aos do sistema`);
          } else {
            if (faltandoNoSistema.length > 0) {
              console.log(`   ❌ ${faltandoNoSistema.length} arquivo(s) do banco NÃO ENCONTRADO(s) no sistema:`);
              faltandoNoSistema.slice(0, 5).forEach(nome => {
                console.log(`      - ${nome}`);
              });
              if (faltandoNoSistema.length > 5) {
                console.log(`      ... e mais ${faltandoNoSistema.length - 5} arquivos`);
              }
            }
            
            if (extrasNoSistema.length > 0) {
              console.log(`   ⚠️  ${extrasNoSistema.length} arquivo(s) no sistema NÃO REGISTRADO(s) no banco:`);
              extrasNoSistema.slice(0, 5).forEach(arquivo => {
                console.log(`      - ${arquivo}`);
              });
              if (extrasNoSistema.length > 5) {
                console.log(`      ... e mais ${extrasNoSistema.length - 5} arquivos`);
              }
            }
          }
        }
      } else {
        console.log(`   ℹ️  Pasta de uploads está vazia`);
      }
    } else {
      console.log(`   ℹ️  Pasta de uploads não existe (provavelmente usando armazenamento em nuvem)`);
    }
    
  } catch (error) {
    console.error(`❌ ERRO durante a diagnóstico: ${error.message}`);
    console.error(error.stack);
  }
}

// Executar diagnóstico para o CRECI especificado
diagnosticarFotosCreci('987456-F').then(() => {
  console.log('\n✅ Diagnóstico concluído.');
});