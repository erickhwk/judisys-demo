# Handoff — Demo do Judisys (código DMO)

Data: 2026-11-07. Responder sempre em pt-BR.

## Onde estamos

- Planejamento aprovado: `docs/prd-demo.md`, `docs/sdd-demo.md` (prevalece; decisões T-01 a T-33), `docs/tasks-demo.md` (25 tarefas e lotes sugeridos no topo).
- Repo público `erickhwk/judisys-demo` (pasta `~/code/judisys`), publicado em https://erickhwk.github.io/judisys-demo/ pelo CI a cada push na `main` (Pages ativado pela API, fonte GitHub Actions).
- **Concluídas (Concluído 🎉 no Trello):** DMO-01 a DMO-06 e DMO-09, ou seja, lotes 1, 2 e 3. `main` em `7cbce72`, 315 testes Vitest, sem worktrees nem branches locais além da `main`.
- Board: https://trello.com/b/ufNoQ9bK. **AJ-01** (porta do e2e por `PORTA_E2E` + teste-guarda do preset do Biome) está em "A Fazer": https://trello.com/c/QbnQZI9c.

## Próximo passo

1. **AJ-01** antes do lote 6 (quando as telas ganham e2e por tarefa). Pequeno: dá para fazer sozinho, com o checklist de revisão do `~/.claude/CLAUDE.md` em passada única (diff pequeno), `/code-review` pela skill.
2. **Lote 4: DMO-07 (seed e PDFs) ∥ DMO-11 (serviços de processo)**, com a `execucao-paralela`. Ponha no `contexto`/`nota`:
   - DMO-07: documentos gravados **só com dígitos** (schemas da DMO-06 fazem `transform(somenteDigitos)`); `completarCpf/Cnpj/Cnj` de `src/regras/documentos.ts` exigem base de 9/12/18 dígitos; o README tem uma linha dizendo que `pnpm seed` é placeholder: atualizar. Teste de determinismo (INV-07).
   - DMO-11: garantir **um único RMA aberto** por RJ (INV-05) também ao desfazer/refazer "processamento deferido" (`novoRma` de `prazos.ts` nasce sem `marcoId`); **não capturar erro dentro de `armazenamento.transacao`** (Dexie aborta tudo, memória mantém gravações parciais); `excluir` genérico não faz cascata (T-23 é dos serviços); `useServico(fabrica)` exige fábrica estável.
   - Projeto sem banco: `teste` sem `drop` (setup `pnpm install --frozen-lockfile`); enquanto o AJ-01 não entrar, os agentes não rodam `pnpm e2e` (porta fixa 4173) e o orquestrador roda no merge de teste.
3. Seguir os lotes do `docs/tasks-demo.md`. DMO-25 é no `~/code/draft-site`, depois da demo pronta.

## Decisões desta sessão que não estão em spec

- O usuário roda merge; eu rodo instalação, testes, push de branch, PR, CI e cards (ver memória `feedback_commands`). Repo/visibilidade e ações externas novas: perguntar.
- DMO-09: o item "catálogo conferido visualmente" ficou desmarcado (não confirmado antes do merge). Catálogo só em dev: `pnpm dev` → http://localhost:5173/judisys-demo/#/catalogo (abrir a URL direto; o hash só é lido no carregamento até a DMO-10 pôr o roteador).
- Para a DMO-18 (QGC impresso): `src/estilos/impressao.css` esconde todo `<button>`/`<nav>` na impressão; dados não podem ser `<button>`.
- Para a DMO-17: critério novo do T-33 já está no arquivo de tarefas e no card.

## Pegadinhas

- `biome migrate` troca o preset para `"none"` (linter desligado). Não rodar; o AJ-01 cria a guarda.
- Markdown fica fora do Biome (`!**/*.md`); `docs/` já foi reformatado uma vez por engano.
- `trello.sh diff` mostra "sobra no card" quando o card recebeu item cuja edição no arquivo de tarefas ainda está num PR aberto: esperado até o merge.
- Este `docs/handoff.md` fica modificado e sem commit na `main`; commite junto com a primeira branch da próxima sessão (por exemplo, a do AJ-01) para a árvore ficar limpa antes do lote.
- Retro aplicada em `~/code/claude-setup` (commits `8443238`, `379d4c2`, ainda sem push): `docs/projeto-novo-vite.md` e a `execucao-paralela` aceitam projeto sem banco (`teste` sem `drop`) e `visual: true` por tarefa.

## Skills sugeridas

- `execucao-paralela`: lote 4 em diante (use `visual: true` nas tarefas de tela: DMO-10, DMO-12 a DMO-21, DMO-23).
- `sdd-para-trello`: mover cards, marcar checklists, anexar PRs (AJ-01 e lotes).
- `simplify`, `revisao-spec`, `code-review`, `security-review`: checklist antes de cada PR.
- `comparacao-visual`: tarefas que mudam telas.
- `run`: subir a demo e conferir no navegador.
- `artifact-design` / `artifact-diagramming`: material do curso das regras de RJ/falência (SDD Q-02), a oferecer quando as telas estiverem encaminhadas.
