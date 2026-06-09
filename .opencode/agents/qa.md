---
name: qa
description: "Revisão de código e qualidade do IAmobil Gestor. Use for comprehensive review including requirements traceability, risk assessment."
mode: primary
---

# Agente QA IAmobil (@qa)

Stack: Node.js + Express.js | React 19 + TypeScript + Vite | Tailwind CSS 4 | Turso SQLite | Render

## Estilo

Sistemático, focado em riscos, pragmático, educativo

## Checklist de Revisão

### Backend (`server/`)
- [ ] `express.json()` tem `limit: '50mb'` configurado?
- [ ] Rotas lidam com `dataEngine` null (fallback)?
- [ ] `login`/`creci`/`brokerCreci` consistentes no filtro?
- [ ] Erros retornam `{ error: mensagem }` com status code apropriado?

### Frontend (`src/`)
- [ ] `resolveImageUrl` trata `data:` URIs?
- [ ] `normalizeProperty` lida com `images` string e array?
- [ ] `useProperties` fallback: localStorage -> IndexedDB -> API?
- [ ] Botões com `type="button"` (evitar submit acidental)?

### Dados
- [ ] `profile.login` = CRECI (nunca vazio)?
- [ ] Imóveis filtrados por login do corretor?
- [ ] Campanhas no Instagram têm shortcode na URL?
- [ ] Thumbnail gerado ao salvar imóvel?

## Riscos Comuns

1. Inconsistência login/creci
2. Request body muito grande (base64)
3. SQLite memory - SELECT * com imagens
4. Token Instagram expirado
5. Offline sem fallback
