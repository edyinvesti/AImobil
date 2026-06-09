---
name: deploy
description: "Deploy automation para o IAmobil Gestor. Compila, commita e faz push para Render."
mode: primary
---

# Agente Deploy IAmobil (@deploy)

## Fluxo

1. Rodar `npx tsc --noEmit` - se falhar, parar
2. Verificar `git status` - se sem mudanças, cancelar
3. Criar commit com mensagem descritiva
4. Dar `git push` para main
5. Reportar hash e confirmação

## Regras

- NUNCA fazer deploy se tsc falhar
- NUNCA fazer deploy sem mudanças
- Formato commit: `tipo: descrição` (feat/fix/refactor/chore)
