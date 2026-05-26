import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Cores para o terminal
const OK = '\x1b[32m[PERFEITO]\x1b[0m';
const AVISO = '\x1b[33m[ATENÇÃO]\x1b[0m';
const ERRO = '\x1b[31m[FORA DO LUGAR]\x1b[0m';
const TITULO = '\x1b[34m%s\x1b[0m';
async function varrerSistema() {
  console.log(TITULO, '\n🔍 INICIANDO INSPEÇÃO DE ROTINA DO ANTIGRAVITY...\n');
  let pendencias = 0;
  // --- 1. INSPEÇÃO DAS VARIÁVEIS DO RENDER.COM ---
  console.log('1. Checando variáveis de ambiente (.env)...');
  const variaveisObrigatorias = ['DATABASE_URL', 'LIBSQL_AUTH_TOKEN'];
  variaveisObrigatorias.forEach(v => {
    if (!process.env[v]) {
      console.log(ERRO, `A variável ${v} não está configurada no painel do Render!`);
      pendencias++;
    } else if (process.env[v].trim() !== process.env[v]) {
      console.log(AVISO, `A variável ${v} possui espaços em branco invisíveis no início ou fim.`);
      pendencias++;
    }
  });
  if (pendencias === 0) console.log(OK, 'Todas as credenciais básicas estão declaradas.');
  // --- 2. INSPEÇÃO DO TURSO (libSQL) ---
  console.log('\n2. Testando conexão com o banco Turso (libSQL)...');
  try {
    const db = createClient({
      url: process.env.DATABASE_URL || '',
      authToken: process.env.LIBSQL_AUTH_TOKEN || '',
    });
    await db.execute("SELECT 1;");
    console.log(OK, 'Comunicação ativa com o banco Turso.');
  } catch (err) {
    console.log(ERRO, `Não foi possível ler o banco Turso. Erro: ${err.message}`);
    pendencias++;
  }

  // --- 4. INSPEÇÃO DE INTEGRIDADE DAS FOTOS ---
  console.log('\n4. Verificando consistência de arquivos e mídias...');
  try {
    const pastaUploads = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(pastaUploads)) {
      console.log(AVISO, `Pasta de uploads locais não encontrada em: ${pastaUploads} (Se estiver usando armazenamento em nuvem, ignore).`);
    } else {
      const fotosFisicas = fs.readdirSync(pastaUploads);
      // Conecta rápido no Turso para cruzar dados de arquivos
      const db = createClient({ url: process.env.DATABASE_URL || '', authToken: process.env.LIBSQL_AUTH_TOKEN || '' });
      const resultadoBanco = await db.execute("SELECT nome_arquivo FROM fotos").catch(() => ({ rows: [] }));
      const fotosNoBanco = resultadoBanco.rows.map(r => r.nome_arquivo);
      let sumidas = 0;
      fotosNoBanco.forEach(f => {
        if (!fotosFisicas.includes(f)) {
          console.log(ERRO, `A foto "${f}" está registrada no banco, mas o arquivo NÃO EXISTE no Render.`);
          sumidas++;
          pendencias++;
        }
      });
      if (sumidas === 0) console.log(OK, 'A quantidade de arquivos bate com os registros do banco.');
    }
  } catch (e) {
    console.log(AVISO, `Não foi possível rodar o cruzamento de arquivos de fotos. Erro técnico: ${e.message}`);
  }
  // --- CONCLUSÃO DO DIAGNÓSTICO ---
  console.log(TITULO, '\n==================================================');
  if (pendencias === 0) {
    console.log(OK, 'TUDO EM ORDEM! O sistema está operando perfeitamente e 100% alinhado.');
    process.exit(0);
  } else {
    console.log(ERRO, `INSPEÇÃO CONCLUÍDA: Encontramos ${pendencias} coisa(s) fora do lugar. Corrija os pontos listados acima.`);
    process.exit(1);
  }
}
varrerSistema();