import 'dotenv/config';
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

  // --- 1. INSPEÇÃO DAS VARIÁVEIS DE AMBIENTE ---
  console.log('1. Checando variáveis de ambiente (.env)...');
  const variaveisObrigatorias = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_D1_DATABASE_ID'];
  variaveisObrigatorias.forEach(v => {
    if (!process.env[v]) {
      console.log(ERRO, `A variável ${v} não está configurada no painel!`);
      pendencias++;
    } else if (process.env[v].trim() !== process.env[v]) {
      console.log(AVISO, `A variável ${v} possui espaços em branco invisíveis no início ou fim.`);
      pendencias++;
    }
  });
  if (pendencias === 0) console.log(OK, 'Todas as credenciais básicas de banco de dados estão declaradas.');

  // --- 2. INSPEÇÃO DE INTEGRIDADE DAS FOTOS ---
  console.log('\n2. Verificando consistência de arquivos e mídias...');
  try {
    const pastaUploads = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(pastaUploads)) {
      console.log(AVISO, `Pasta de uploads locais não encontrada em: ${pastaUploads} (Se estiver usando armazenamento em nuvem, ignore).`);
    } else {
      console.log(OK, 'Pasta de uploads encontrada.');
    }
  } catch (e) {
    console.log(AVISO, `Não foi possível rodar o diagnóstico de fotos. Erro técnico: ${e.message}`);
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