# Handoff — Demo do Judisys (código DMO)

Data: 2026-11-07. Responder sempre em pt-BR.

## Onde estamos

- Planejamento **concluído**. Fluxo pedido → PRD → SDD → tarefas → Trello já percorrido; falta a implementação.
- **PRD:** `docs/prd-demo.md` — **aprovado** em 2026-11-07 (revisão item a item dos acréscimos feita nesta sessão).
- **SDD:** `docs/sdd-demo.md` — **aprovado** em 2026-11-07. Prevalece sobre o PRD onde diverge (seção 2, C-01 a C-10: correções jurídicas conferidas no texto compilado do Planalto). Decisões técnicas T-01 a T-19 (fechadas com o usuário via `grilling`) e T-20 a T-30 (de implementação, aprovadas com o SDD).
- **Tarefas:** `docs/tasks-demo.md` — 25 tarefas (DMO-01 a DMO-25) e a tabela de **lotes sugeridos** (10 lotes por dependência) no topo.
- **Trello:** board **Judisys** criado pela API (https://trello.com/b/ufNoQ9bK, privado), já mapeado em `~/.claude/skills/sdd-para-trello/boards.tsv` (`judisys`). Listas e labels padrão + label `demo`. Os 25 cards estão no **Backlog**, cada um com checklists "Critérios de aceite" e "Testes".

## Próximo passo

1. **DMO-01 · Montar o projeto.** Mover o card para "Em andamento". Os comandos que mudam o ambiente (`git init`, `gh repo create erickhwk/judisys-demo`, `pnpm create vite`, `pnpm add ...`) são **executados pelo usuário**: montar a sequência explicada e entregar para ele rodar. Ler/editar arquivos pode ser feito direto.
2. Depois, seguir os lotes de `docs/tasks-demo.md`. Se o usuário pedir execução em paralelo, usar `execucao-paralela` (não há banco; cada worktree usa `fake-indexeddb`, então o pré-requisito de `TEST_ENV_NUMBER` não se aplica).
3. Antes de cada PR: checklist do `~/.claude/CLAUDE.md` (`/simplify` → `/revisao-spec` → `/code-review` → `/security-review`, commits de revisão separados, dúvidas ao usuário antes do PR).
4. DMO-25 (botão "Ver demo") é no `~/code/draft-site`, só depois da demo no ar.

## Pendências fora das tarefas

- **Curso das regras de negócio** (SDD Q-02): o usuário quer, depois, um material explicando as regras de RJ/falência usadas na demo (fases, classes, quóruns, cram down), de preferência com exemplos do seed. Não é tarefa DMO; oferecer quando a implementação estiver encaminhada.
- Passo manual único na DMO-02: Settings → Pages → fonte "GitHub Actions" (o usuário faz).

## Pegadinhas

- `~/code/judisys` **ainda não é repo git**; só tem `docs/` (PRD, SDD, tarefas, este handoff). O primeiro commit deve incluir `docs/`.
- `trello.sh import` lê todo `## ` do arquivo de tarefas como tarefa: seções que não são tarefa ficam sem título `## ` (por isso "Lotes sugeridos" está em negrito).
- Datas: tudo passa por `hoje()`/`agora()` de `src/regras/relogio.ts` (INV-08); datas sem hora em `aaaa-mm-dd`.
- Nome do escritório fictício confirmado: "Vértice Administração Judicial" (o usuário só achou "Vértice Advocacia", diferente). Nenhuma menção a MCAA/Ethos na demo.
- Usuário GitHub: `erickhwk`.

## Referências

- Guia visual: `~/code/mcaa-app/docs/design/judisys/` (`DESIGN.md`, `login.html`, `dashboard.html`, `telas/`, `assets/`).
- Formato de referência de PRD/SDD/tarefas: `~/code/mcaa-app/docs/*-unificacao-mcaa-ethos.md`.
- Site da Draft: `~/code/draft-site` (seção `#judisys`).
- Lei: https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101.htm

## Skills sugeridas

- `sdd-para-trello`: mover cards (Em andamento → Em revisão → Pronto pra deploy → Concluído 🎉), marcar checklists, anexar PRs.
- `execucao-paralela`: se o usuário pedir lotes em paralelo.
- `simplify`, `revisao-spec`, `code-review`, `security-review`: checklist antes de cada PR.
- `comparacao-visual`: nas tarefas que mudam telas (DMO-09, DMO-10, DMO-12 a DMO-21, DMO-23).
- `run`: para subir a demo e conferir no navegador.
- `artifact-design` / `artifact-diagramming`: se for produzir o material do curso.
