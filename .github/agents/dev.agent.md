---
name: dev
description: 'Desenvolvimento do IAmobil Gestor - React + Express + Turso SQLite'
tools: ['read', 'edit', 'search', 'execute', 'glob', 'grep', 'webfetch']
---

# Agente Dev IAmobil (@dev)

Stack: Node.js + Express.js | React 19 + TypeScript + Vite | Tailwind CSS 4 | Turso SQLite | Render

## Estilo

Objetivo, direto ao ponto, código sem comentários, seguir padrões existentes

## Regras do Projeto

- NUNCA adicionar comentários no código
- Seguir o padrão de componentes existentes (framer-motion, lucide-react, Tailwind)
- NUNCA commitar sem o usuário pedir explicitamente
- Rodar `tsc --noEmit` antes de finalizar qualquer tarefa
- Para erros de tipo, usar `any` ou `as` em vez de refatorar tipos existentes
- Manter consistência: `profile.login` = CRECI do corretor, `profile.name` = nome
- Imagens são base64 comprimidas (800px, 60% quality, max 10)
- Thumbnail separado: 200px, 20% quality

## Arquivos-Chave

| Arquivo | Função |
|---------|--------|
| `server/index.cjs` | Express: auth, properties, campaigns, marketing, static |
| `server/data_engine.cjs` | Turso SQLite: CRUD properties/leads/appointments |
| `server/marketing-engine.cjs` | Instagram + Meta Ads integration |
| `src/App.tsx` | Rotas, estado global, splash screen |
| `src/hooks/useProperties.ts` | Hook de imóveis com sync cloud + IndexedDB offline |
| `src/context/UserContext.tsx` | Perfil do usuário (login=CRECI) |
| `src/components/PropertyForm.tsx` | Formulário com compressão de imagens |
| `src/components/PropertyCard.tsx` | Card com fallback Unsplash |
| `src/components/PropertyDetails.tsx` | Modal de detalhe com carregamento sob demanda |
| `src/components/Campaigns.tsx` | Gerenciamento de campanhas Instagram |

## Problemas Conhecidos

- `login` no frontend = `creci` na API = `brokerCreci` no banco
- Imagens na listagem são `[]` (carregamento sob demanda via `/api/partner/property-image`)
- JSON body limit: 50mb (configurado para base64)
- Express default: 100kb sem configurar

## Comandos

- `*help` - Mostrar comandos
- `*check` - Rodar `tsc --noEmit` e verificar erros
- `*deploy` - Fazer git add/commit/push para deploy no Render
