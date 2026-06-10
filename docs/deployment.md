# Guia de Deploy — IAmobil

## Pré-requisitos

- Conta no [Render](https://render.com)
- Conta no [Cloudflare Pages](https://pages.cloudflare.com)
- Conta no [Turso](https://turso.tech)
- Conta no [Cloudflare R2](https://www.cloudflare.com/r2/) (opcional)

## 1. Configurar Turso

1. Acesse [turso.tech](https://turso.tech)
2. Crie um banco de dados
3. Copie a URL e o Token

## 2. Configurar Render

1. Acesse [render.com](https://render.com)
2. Crie um novo Web Service
3. Conecte o repositório GitHub
4. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.cjs`

### Variáveis de Ambiente

Copie do `render.yaml` ou configure manualmente:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `TURSO_DATABASE_URL` | ✅ | URL do banco Turso |
| `TURSO_AUTH_TOKEN` | ✅ | Token de autenticação Turso |
| `JWT_SECRET` | ✅ | Chave secreta para JWT |
| `GEMINI_API_KEY` | ❌ | API Key do Google Gemini |
| `GROQ_API_KEY` | ❌ | API Key do Groq |
| `MISTRAL_API_KEY` | ❌ | API Key do Mistral |
| `TELEGRAM_BOT_TOKEN` | ❌ | Token do bot Telegram |
| `R2_ENDPOINT` | ❌ | Endpoint do Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | ❌ | Access Key do R2 |
| `R2_SECRET_ACCESS_KEY` | ❌ | Secret Key do R2 |
| `R2_BUCKET_NAME` | ❌ | Nome do bucket R2 |
| `R2_PUBLIC_URL` | ❌ | URL pública do R2 |

## 3. Configurar Cloudflare Pages

1. Acesse [pages.cloudflare.com](https://pages.cloudflare.com)
2. Crie um novo projeto
3. Conecte o repositório GitHub
4. Configure:
   - **Build Command:** `npm run build`
   - **Build Output Directory:** `dist`
   - **Environment Variables:**
     - `VITE_API_URL`: URL do backend (ex: `https://aimobil.onrender.com`)

## 4. Configurar Cloudflare R2 (Opcional)

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. Vá para R2 Object Storage
3. Crie um bucket chamado `iamobil-images`
4. Configure acesso público
5. Crie um token de API com permissões de leitura/escrita
6. Copie as credenciais para as variáveis de ambiente

## 5. Deploy

### Backend (Render)
1. Faça push para o GitHub
2. O Render fará deploy automaticamente

### Frontend (Cloudflare Pages)
1. Faça push para o GitHub
2. O Cloudflare fará build e deploy automaticamente

## 6. Verificação

### Health Check
```bash
curl https://aimobil.onrender.com/api/health
```

### Login
```bash
curl -X POST https://aimobil.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "password": "admin123"}'
```

### Propriedades
```bash
curl https://aimobil.onrender.com/api/properties
```

## 7. Troubleshooting

### Erro de CORS
Verifique se `ALLOWED_ORIGINS` está configurado corretamente.

### Erro de Database
Verifique se `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` estão corretos.

### Erro de JWT
Verifique se `JWT_SECRET` está definido.

### Imagens não carregam
Verifique se as variáveis R2 estão configuradas.

## 8. Variáveis de Ambiente Locais

Crie um arquivo `.env` na raiz:

```env
# Database
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...

# Auth
JWT_SECRET=sua-chave-secreta

# AI
GEMINI_API_KEY=...
GROQ_API_KEY=...
MISTRAL_API_KEY=...

# Telegram
TELEGRAM_BOT_TOKEN=...

# Storage (opcional)
R2_ENDPOINT=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=iamobil-images
R2_PUBLIC_URL=...

# Server
PORT=10002
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

## 9. Comandos Úteis

```bash
# Instalar dependências
npm install

# Build
npm run build

# Iniciar servidor
npm start

# Migration de imagens para R2
node scripts/migrate-images-to-r2.cjs

# Verificar schema do banco
node server/db/recreate-schema.cjs
```
