# AGENTS.md - IAmobil

## Constitution
Siga `.aiox-core/constitution.md` como fonte de verdade:
- CLI First
- Agent Authority
- Story-Driven Development
- No Invention
- Quality First
- Absolute Imports

## Workflow Obrigatório
1. Inicie por uma story em `docs/stories/`
2. Implemente apenas o que os acceptance criteria pedem
3. Atualize checklist (`[ ]` -> `[x]`) e file list
4. Execute quality gates antes de concluir

## Quality Gates
```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Agent Shortcuts
- `@architect` -> `.aiox-core/development/agents/architect.md`
- `@pm` -> `.aiox-core/development/agents/pm.md`
- `@sm` -> `.aiox-core/development/agents/sm.md`
- `@dev` -> `.aiox-core/development/agents/dev.md`
- `@qa` -> `.aiox-core/development/agents/qa.md`
- `@devops` -> `.aiox-core/development/agents/devops.md`
- `@po` -> `.aiox-core/development/agents/po.md`
