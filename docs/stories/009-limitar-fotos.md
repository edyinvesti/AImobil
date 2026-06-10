# Story 009: Limitar Fotos por Imóvel (máx. 10)

## Status
[ ] Draft
[ ] In Progress
[x] Ready for Review
[ ] Done

## Context
Corretores podem enviarquantidade ilimitada de fotos, causando:
- OOM no SQLite (base64 no banco)
- Lentidão no upload
- Custos altos de armazenamento

**Limite:** 10 fotos por imóvel

## Acceptance Criteria
- [x] Frontend: validação no PropertyForm (máx. 10 fotos)
- [x] Backend: validação na rota POST /api/partner/properties
- [x] Mensagem de erro clara quando exceder
- [x] Contador de fotos visível no formulário
- [x] `npm run build` sem erros

## File List
- [x] `src/components/PropertyForm.tsx` (modificado)
- [x] `server/index.cjs` (modificado — validação)
- [x] `src/types.ts` (modificado — constante MAX_IMAGES)

## Technical Notes
- Constante MAX_IMAGES = 10
- Validar tanto no frontend quanto backend
- Mensagem: "Máximo de 10 fotos por imóvel"

## Testing
- [x] Upload de 10 fotos funciona
- [x] Upload de 11 fotos mostra erro
- [x] Mensagem de erro é clara

## CodeRabbit Integration
- **Focus:** Input validation, error handling
- **Severity:** MEDIUM — missing validation

## Dependencies
- Nenhuma (feature independente)
