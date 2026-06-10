# Shard 6: Infra & Deployment

> **Source:** fullstack-architecture.md §8  
> **For:** @sm, @dev, @devops

---

## Problema Atual

- Imagens base64 no SQLite (OOM em listagens)
- Backend duplicado (Express + Vercel serverless)
- Deploy split: Render (backend) + Cloudflare Pages (frontend)

## Solução

### Cloudflare R2 para Imagens

```
R2 Bucket: iamobil-images
├── properties/{propertyId}/{hash}.jpg
├── thumbnails/{propertyId}/{hash}.jpg
└── profiles/{login}/{hash}.jpg
```

### Upload Flow

```
Frontend → POST /api/properties (images[]) 
    → Backend compress (canvas)
    → Upload to R2
    → Store URLs in Turso
    → Return property with image URLs
```

### Configuração R2

```javascript
// server/services/storage.service.cjs
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

class StorageService {
  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    this.bucket = process.env.R2_BUCKET_NAME || 'iamobil-images';
  }

  async uploadImage(key, buffer, contentType) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    
    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }
}

module.exports = { StorageService };
```

### Deploy Unificado

```yaml
# render.yaml (atualizado)
services:
  - type: web
    name: iamobil-api
    runtime: node
    buildCommand: npm install
    startCommand: node server/index.cjs
    envVars:
      - key: TURSO_DATABASE_URL
        sync: false
      - key: TURSO_AUTH_TOKEN
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: GEMINI_API_KEY
        sync: false
      - key: TELEGRAM_BOT_TOKEN
        sync: false
      - key: R2_ENDPOINT
        sync: false
      - key: R2_ACCESS_KEY_ID
        sync: false
      - key: R2_SECRET_ACCESS_KEY
        sync: false
      - key: R2_BUCKET_NAME
        value: iamobil-images
      - key: R2_PUBLIC_URL
        sync: false
```

### Migração de Imagens

Script para migrar imagens existentes do SQLite para R2:

```javascript
// scripts/migrate-images-to-r2.cjs
const { DataEngine } = require('../server/db');
const { StorageService } = require('../server/services/storage.service');

async function migrate() {
  const db = await DataEngine.getInstance();
  const storage = new StorageService();
  
  const properties = await db.getAllProperties();
  
  for (const prop of properties) {
    if (!prop.images) continue;
    
    const images = JSON.parse(prop.images);
    const newUrls = [];
    
    for (const base64 of images) {
      const buffer = Buffer.from(base64.split(',')[1], 'base64');
      const hash = require('crypto').createHash('md5').update(buffer).digest('hex');
      const key = `properties/${prop.id}/${hash}.jpg`;
      
      const url = await storage.uploadImage(key, buffer, 'image/jpeg');
      newUrls.push(url);
    }
    
    await db.updateProperty(prop.id, { images: JSON.stringify(newUrls) });
  }
}
```

### Tarefas

- [ ] Criar `server/services/storage.service.cjs`
- [ ] Configurar R2 bucket no Cloudflare
- [ ] Adicionar variáveis de ambiente R2 no Render
- [ ] Criar script de migração de imagens
- [ ] Atualizar PropertyForm para upload via R2
- [ ] Remover `api/` duplicado
- [ ] Atualizar render.yaml
- [ ] Testar deploy completo

---

*Shard 6: Infra & Deployment — IAmobil Architecture*
