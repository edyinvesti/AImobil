# IAmobil — Full-Stack Architecture

> **Author:** Aria (Architect Agent)  
> **Date:** 2026-06-09  
> **Version:** 1.0.0  
> **Status:** Draft — Aguardando revisão do @pm

---

## 1. Visão Geral

Arquitetura refatorada do IAmobil — plataforma de gestão imobiliária para corretores brasileiros. O sistema atual é um monolito com backend duplicado e auth inexistente. Esta arquitetura propõe modularização, segurança e escalabilidade.

---

## 2. Stack Tecnológica

### Frontend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 19 | UI Library |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool |
| Tailwind CSS | 4.x | Styling |
| Framer Motion | 12.x | Animações |
| React Router | 7.x | Roteamento |
| **@tanstack/react-query** | **5.x** | **Data fetching (substitui fetch manual)** |

### Backend
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Node.js | 22+ | Runtime |
| Express | 4.x | HTTP framework |
| **JWT (jsonwebtoken)** | **9.x** | **Autenticação** |
| bcryptjs | 2.x | Hash de senhas |
| winston | 3.x | Logging |
| express-validator | 7.x | Validação |
| express-rate-limit | 7.x | Rate limiting |

### Database
| Tecnologia | Uso |
|------------|-----|
| Turso (libSQL) | Database principal |
| **Cloudflare R2** | **Object storage para imagens** |

### AI / External
| Tecnologia | Uso |
|------------|-----|
| Google Gemini 2.0 Flash | AI principal (fallback chain) |
| Groq (Llama 3.1) | AI fallback |
| Mistral AI | AI fallback |
| Telegram Bot API | Bot de atendimento |
| Meta Ads API | Tráfego pago |
| Instagram Graph API | Publicação orgânica |

---

## 3. Arquitetura Alvo

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Dashboard │ │ Property │ │ Campaign │ │ BusinessCard     │   │
│  │ + RQ hook│ │ + RQ hook│ │ + RQ hook│ │ + RQ hook        │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘   │
│       │             │            │                  │             │
│  ┌────▼─────────────▼────────────▼──────────────────▼─────────┐  │
│  │              React Query (useQuery/useMutation)            │  │
│  └────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────────┘
                            │ fetch + JWT Bearer
┌───────────────────────────┼──────────────────────────────────────┐
│                     BACKEND (Express)                             │
│  ┌────────────────────────▼───────────────────────────────────┐  │
│  │                    JWT Auth Middleware                      │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                      │
│  ┌────────────────────────▼───────────────────────────────────┐  │
│  │                      Router Layer                           │  │
│  │  /api/auth/*  /api/properties/*  /api/leads/*  /api/mkt/*  │  │
│  └──┬────────────┬──────────────┬──────────────┬─────────────┘  │
│     │            │              │              │                  │
│  ┌──▼───┐  ┌────▼────┐  ┌─────▼─────┐  ┌────▼──────┐          │
│  │ Auth │  │Property │  │   Leads   │  │ Marketing │          │
│  │Service│  │Service  │  │  Service  │  │  Service  │          │
│  └──┬───┘  └────┬────┘  └─────┬─────┘  └────┬──────┘          │
│     │           │              │              │                  │
│  ┌──▼───────────▼──────────────▼──────────────▼──────────────┐  │
│  │                   DataEngine (único)                       │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │                   AI Gateway (fallback chain)              │  │
│  │                   Gemini → Groq → Mistral                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌────────────────────┐    ┌────────────────────────────────┐   │
│  │  Turso (libSQL)    │    │    Cloudflare R2 (images)      │   │
│  │  properties        │    │    /properties/{id}/{hash}.jpg │   │
│  │  leads             │    │    /thumbnails/{id}/{hash}.jpg │   │
│  │  appointments      │    └────────────────────────────────┘   │
│  │  brokers           │                                         │
│  │  campaigns         │                                         │
│  │  users             │                                         │
│  └────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Estrutura de Diretórios

```
AImobil/
├── src/                          # Frontend React
│   ├── App.tsx
│   ├── index.tsx
│   ├── types.ts
│   ├── utils.ts
│   ├── sync-queue.ts
│   ├── context/
│   │   └── UserContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts            # NOVO - autenticação
│   │   ├── useProperties.ts      # REATORADO - usa React Query
│   │   ├── useLeads.ts           # REATORADO - usa React Query
│   │   ├── useCampaigns.ts       # NOVO - React Query
│   │   └── useToast.tsx
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── PropertyForm.tsx
│   │   ├── PropertyDetails.tsx
│   │   ├── PropertyCard.tsx
│   │   ├── Campaigns.tsx
│   │   ├── Appointments.tsx
│   │   ├── BusinessCard.tsx
│   │   ├── ProfileView.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BottomBar.tsx
│   │   ├── Login.tsx             # NOVO - tela de login
│   │   ├── SplashScreen.tsx
│   │   ├── ConfirmationModal.tsx
│   │   ├── EmptyPortfolio.tsx
│   │   ├── SkeletonCard.tsx
│   │   └── common/
│   │       ├── ErrorBoundary.tsx
│   │       └── Skeleton.tsx
│   └── services/
│       └── api.ts                # NOVO - instância axios/fetch configurada
│
├── server/                       # Backend Express
│   ├── index.cjs                 # REATORADO - montagem modular
│   ├── db/
│   │   ├── index.cjs             # NOVO - DataEngine único
│   │   ├── schema.cjs            # NOVO - definição de tabelas
│   │   └── migrations.cjs        # NOVO - migrations controladas
│   ├── services/
│   │   ├── auth.service.cjs      # NOVO - JWT + bcrypt
│   │   ├── property.service.cjs  # NOVO - CRUD imóveis
│   │   ├── lead.service.cjs      # NOVO - CRUD leads
│   │   ├── appointment.service.cjs # NOVO - agendamentos
│   │   ├── marketing.service.cjs # REATORADO de marketing-engine.cjs
│   │   ├── telegram.service.cjs  # NOVO - bot Telegram
│   │   └── ai.service.cjs        # NOVO - Gemini/Groq/Mistral
│   ├── middleware/
│   │   ├── auth.middleware.cjs    # NOVO - verificação JWT
│   │   ├── validate.middleware.cjs # NOVO - express-validator
│   │   └── error.middleware.cjs   # NOVO - tratamento centralizado
│   ├── routes/
│   │   ├── auth.routes.cjs       # NOVO
│   │   ├── property.routes.cjs   # NOVO
│   │   ├── lead.routes.cjs       # NOVO
│   │   ├── appointment.routes.cjs # NOVO
│   │   ├── marketing.routes.cjs  # NOVO
│   │   ├── telegram.routes.cjs   # NOVO
│   │   └── health.routes.cjs     # NOVO
│   └── utils/
│       ├── logger.cjs            # NOVO - winston config
│       └── errors.cjs            # NOVO - classes de erro customizadas
│
├── api/                          # REMOVIDO (substituído por server/)
│
├── .aiox-core/                   # Framework AIOX
├── docs/
│   ├── stories/
│   └── architecture/
│       └── fullstack-architecture.md  # ESTE ARQUIVO
├── AGENTS.md
├── package.json
├── vite.config.ts
├── tsconfig.json
└── render.yaml
```

---

## 5. Componentes Detalhados

### 5.1 DataEngine (único)

```javascript
// server/db/index.cjs
const { createClient } = require('@libsql/client');

class DataEngine {
  constructor() {
    this.client = null;
  }

  async initialize() {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    
    if (!url || !token) {
      throw new Error('Missing TURSO credentials');
    }
    
    this.client = createClient({ url, authToken: token });
    await this.initializeTables();
  }

  // CRUD methods...
}

// Singleton - único por processo
let instance = null;
module.exports = {
  getDataEngine: async () => {
    if (!instance) {
      instance = new DataEngine();
      await instance.initialize();
    }
    return instance;
  }
};
```

### 5.2 Auth Middleware (JWT)

```javascript
// server/middleware/auth.middleware.cjs
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET não configurado');
  process.exit(1);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { login, creci, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
```

### 5.3 AI Gateway (fallback chain único)

```javascript
// server/services/ai.service.cjs
class AIGateway {
  constructor() {
    this.providers = [
      { name: 'gemini', key: process.env.GEMINI_API_KEY, fn: this.callGemini },
      { name: 'groq', key: process.env.GROQ_API_KEY, fn: this.callGroq },
      { name: 'mistral', key: process.env.MISTRAL_API_KEY, fn: this.callMistral },
    ].filter(p => p.key);
  }

  async process(message, systemPrompt) {
    for (const provider of this.providers) {
      try {
        return await provider.fn.call(this, message, systemPrompt);
      } catch (err) {
        console.warn(`${provider.name} failed, trying next...`);
      }
    }
    throw new Error('Nenhum provedor de IA disponível');
  }
}

module.exports = { AIGateway };
```

### 5.4 Frontend — React Query Hooks

```typescript
// src/hooks/useProperties.ts (refatorado)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useProperties(creci: string) {
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', creci],
    queryFn: () => api.get(`/properties?creci=${creci}`).then(r => r.data),
    staleTime: 30_000,
  });

  const createProperty = useMutation({
    mutationFn: (data) => api.post('/properties', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['properties'] }),
  });

  const deleteProperty = useMutation({
    mutationFn: (id) => api.delete(`/properties/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['properties'] }),
  });

  return { properties, isLoading, createProperty, deleteProperty };
}
```

---

## 6. Fluxos de Dados

### 6.1 Autenticação

```
┌──────────┐  POST /api/auth/login   ┌──────────┐
│  Login   │ ──────────────────────→  │  Express │
│  Screen  │                          │  Router  │
└──────────┘                          └────┬─────┘
                                           │
                                    ┌──────▼──────┐
                                    │ authService │
                                    │ .login()    │
                                    └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │  bcrypt     │
                                    │  compare    │
                                    └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │  jwt.sign() │
                                    │  → token    │
                                    └─────────────┘
```

### 6.2 Upload de Imagem

```
┌──────────┐  POST /api/properties  ┌──────────┐
│  Form    │ ────────────────────→   │  Express │
│  (images)│                         │  Router  │
└──────────┘                         └────┬─────┘
                                          │
                                   ┌──────▼──────┐
                                   │  compress() │
                                   │  (canvas)   │
                                   └──────┬──────┘
                                          │
                                   ┌──────▼──────┐
                                   │  R2 Upload  │
                                   │  → URL      │
                                   └──────┬──────┘
                                          │
                                   ┌──────▼──────┐
                                   │  Turso      │
                                   │  (URL only) │
                                   └─────────────┘
```

### 6.3 Campanha Marketing

```
┌──────────┐  POST /api/marketing   ┌──────────┐
│ Campaign │ ────────────────────→   │Marketing │
│  Form    │                         │ Service  │
└──────────┘                         └────┬─────┘
                                          │
                        ┌─────────────────┼─────────────────┐
                        │                 │                 │
                 ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
                 │  AI Gateway │  │  Meta Ads   │  │  Instagram  │
                 │  (copy gen) │  │  API        │  │  Graph API  │
                 └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 7. Segurança

### 7.1 Autenticação
- JWT com expiração de 24h
- Refresh token para sessões longas
- Senhas hasheadas com bcrypt (10 rounds)

### 7.2 Rate Limiting
- Auth: 100 req/15min por IP
- API geral: 300 req/15min por IP
- Telegram: 30 msg/min por chat

### 7.3 Validação
- express-validator em todas as rotas
- Sanitização de input
- Validação de tipo e formato

### 7.4 CORS
- Allowlist configurável via env `ALLOWED_ORIGINS`
- Credentials habilitados

---

## 8. Plano de Migração

### Fase 1: Fundação (Stories 1-3)
| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 001 | Unificar DataEngine (matar duplicação) | Alta |
| 002 | JWT auth middleware | Alta |
| 003 | Estrutura de services | Alta |

### Fase 2: Modularização (Stories 4-6)
| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 004 | Extrair Telegram service | Média |
| 005 | Extrair AI gateway | Média |
| 006 | Extrair Marketing service | Média |

### Fase 3: Frontend (Stories 7-9)
| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 007 | React Query migration | Alta |
| 008 | Tela de login + useAuth hook | Alta |
| 009 | Decompor useProperties | Média |

### Fase 4: Infra (Stories 10-11)
| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 010 | Migrar imagens para R2 | Média |
| 011 | Remover api/ duplicado | Baixa |

---

## 9. Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tamanho de `index.cjs` | 61KB / 1614 linhas | <5KB / ~100 linhas |
| Número de backends | 2 (Express + Serverless) | 1 (Express) |
| Instâncias de DataEngine | 3 | 1 (singleton) |
| Auth middleware | Nenhum | JWT em todas as rotas |
| Uso de React Query | 0 hooks | Todos os data hooks |
| Imagens no SQLite | Base64 no banco | URLs no R2 |

---

*Full-Stack Architecture v1.0.0 — IAmobil*
*Designed by Aria (Architect Agent) — AIOX Framework*
