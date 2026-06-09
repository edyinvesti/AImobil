---
name: dev
description: "Desenvolvimento do IAmobil Gestor - React + Express + Turso SQLite. Use for code implementation, debugging, refactoring."
mode: primary
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
