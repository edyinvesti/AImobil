import { createClient } from '@libsql/client';
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

console.log('🔍 CONECTANDO AO BANCO TURSO...\n');

const client = createClient({
  url: DATABASE_URL,
  authToken: LIBSQL_AUTH_TOKEN
});

async function visaoGeral() {
  try {
    // 1. Listar todas as tabelas
    console.log('📋 ETAPA 1: LISTANDO TABELAS DO BANCO\n');
    const tablesResult = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    );
    
    const tabelas = tablesResult.rows.map(row => row.name);
    console.log(`Encontradas ${tabelas.length} tabela(s):`);
    tabelas.forEach((tabela, index) => {
      console.log(`  ${index + 1}. ${tabela}`);
    });
    console.log('');
    
    // 2. Analisar cada tabela importante
    console.log('📊 ETAPA 2: ANÁLISE DAS TABELAS\n');
    
    // Tabelas que sabemos que existem baseado no código
    const tabelasImportantes = ['properties', 'leads', 'appointments', 'brokers'];
    
    for (const tabela of tabelasImportantes) {
      if (tabelas.includes(tabela)) {
        await analisarTabela(tabela, client);
      } else {
        console.log(`⚠️  Tabela ${tabela} não encontrada no banco\n`);
      }
    }
    
    // 3. Verificar se existe tabela fotos (referenciada no inspecionar-sistema)
    if (tabelas.includes('fotos')) {
      await analisarTabela('fotos', client);
    } else {
      console.log('📋 Tabela "fotos": Não encontrada (provavelmente não existe ou usa outro nome)\n');
    }
    
    // 4. Informações específicas sobre properties com imagens
    console.log('🖼️  ETAPA 3: ANÁLISE DE IMAGENS NAS PROPRIEDADES\n');
    await analisarImagensProperties(client);
    
  } catch (error) {
    console.error('❌ ERRO durante a visão geral:', error.message);
    console.error(error.stack);
  }
}

async function analisarTabela(nomeTabela, client) {
  try {
    console.log(`🔹 Tabela: ${nomeTabela}`);
    
    // Contar registros
    const countResult = await client.execute(`SELECT COUNT(*) as total FROM ${nomeTabela}`);
    const total = countResult.rows[0].total;
    console.log(`   Total de registros: ${total}`);
    
    if (total === 0) {
      console.log(`   ⚠️  Tabela vazia\n`);
      return;
    }
    
    // Pegar estrutura da tabela (colunas)
    const schemaResult = await client.execute(`PRAGMA table_info(${nomeTabela})`);
    const colunas = schemaResult.rows.map(col => col.name);
    console.log(`   Colunas (${colunas.length}): ${colunas.join(', ')}`);
    
    // Mostrar amostra de dados (máximo 2 registros)
    const limite = Math.min(2, total);
    const sampleResult = await client.execute(`SELECT * FROM ${nomeTabela} LIMIT ${limite}`);
    
    console.log(`   Amostra (${limite} registro(s)):`);
    sampleResult.rows.forEach((row, index) => {
      console.log(`     Registro ${index + 1}:`);
      // Mostrar apenas algumas colunas-chave para não poluir a saída
      const chavesMostrar = obterChavesRelevantes(nomeTabela, row);
      chavesMostrar.forEach(chave => {
        const valor = row[chave];
        const valorStr = typeof valor === 'string' && valor.length > 50 
          ? `${valor.substring(0, 50)}...` 
          : valor;
        console.log(`       ${chave}: ${valorStr}`);
      });
    });
    console.log('');
    
  } catch (error) {
    console.log(`   ❌ Erro ao analisar ${nomeTabela}: ${error.message}\n`);
  }
}

function obterChavesRelevantes(tabela, row) {
  // Definir colunas-chave para cada tabela para melhor visualização
  const chavesPorTabela = {
    properties: ['id', 'title', 'broker_creci', 'price', 'city', 'status'],
    leads: ['id', 'name', 'phone', 'interest', 'status'],
    appointments: ['id', 'lead_name', 'property_title', 'date_time', 'status'],
    brokers: ['creci', 'name', 'email', 'phone', 'photo'],
    fotos: ['nome_arquivo', 'property_id', 'legenda']
  };
  
  const chavesRelevantes = chavesPorTabela[tabela] || [];
  // Filtrar apenas colunas que existem na linha
  return chavesRelevantes.filter(chave => chave in row);
}

async function analisarImagensProperties(client) {
  try {
    console.log('🔍 Verificando campo de imagens nas propriedades...\n');
    
    // Contar propriedades com e sem imagens
    const result = await client.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN images IS NULL OR images = '' OR images = '[]' THEN 1 ELSE 0 END) as sem_imagens,
        SUM(CASE WHEN images IS NOT NULL AND images <> '' AND images <> '[]' THEN 1 ELSE 0 END) as com_imagens
      FROM properties;
    `);
    
    const stats = result.rows[0];
    console.log(`   Total de propriedades: ${stats.total}`);
    console.log(`   Com imagens: ${stats.com_imagens}`);
    console.log(`   Sem imagens: ${stats.sem_imagens}`);
    
    if (stats.com_imagens > 0) {
      // Analisar o formato das imagens
      const imagensResult = await client.execute(`
        SELECT id, title, images 
        FROM properties 
        WHERE images IS NOT NULL AND images <> '' AND images <> '[]'
        LIMIT 3;
      `);
      
      console.log(`\n   Amostra de propriedades com imagens:`);
      imagensResult.rows.forEach((prop, index) => {
        console.log(`     ${index + 1}. ${prop.title} (ID: ${prop.id.substring(0, 8)}...)`);
        
        // Tentar interpretar o campo de imagens
        let tipoImagens = 'desconhecido';
        let quantidade = 0;
        
        if (prop.images) {
          if (prop.images.startsWith('[')) {
            try {
              const imagensArray = JSON.parse(prop.images);
              if (Array.isArray(imagensArray)) {
                tipoImagens = 'JSON array';
                quantidade = imagensArray.length;
                
                // Verificar se são base64 ou URLs
                if (imagensArray.length > 0) {
                  const primeira = imagensArray[0];
                  if (typeof primeira === 'string') {
                    if (primeira.startsWith('data:image/')) {
                      tipoImagens += ' (base64 embedded)';
                    } else if (primeira.startsWith('http')) {
                      tipoImagens += ' (URLs externas)';
                    } else {
                      tipoImagens += ' (strings desconhecidas)';
                    }
                  }
                }
              } else {
                tipoImagens = 'JSON não-array';
              }
            } catch (e) {
              tipoImagens = 'JSON inválido';
            }
          } else if (prop.images.startsWith('data:image/')) {
            tipoImagens = 'base64 direto (não array)';
            quantidade = 1;
          } else {
            tipoImagens = 'formato desconhecido';
          }
        }
        
        console.log(`       Tipo: ${tipoImagens}`);
        console.log(`       Quantidade: ${quantidade}`);
        
        if (quantidade > 0 && quantidade <= 3 && prop.images) {
          // Mostrar uma amostra pequena do conteúdo se for base64
          if (prop.images.startsWith('data:image/')) {
            console.log(`       Exemplo: ${prop.images.substring(0, 60)}...`);
          }
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.log(`   ❌ Erro ao analisar imagens: ${error.message}\n`);
  }
}

// Executar a visão geral
visaoGeral().then(() => {
  console.log('✅ Visão geral do banco concluída.');
});