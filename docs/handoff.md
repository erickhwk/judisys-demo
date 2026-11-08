# Handoff — Judisys demo (DMO concluída; INI em especificação)

Data: 2026-11-08. Responda sempre em pt-BR.

## Foco da próxima sessão

**Rodar o lote 1 do INI (início montável)**: INI-01, INI-02, INI-04 e INI-05, em paralelo, com a `execucao-paralela`.

- As worktrees e os PRs usam a branch **`ini-redesign`** como base, nunca a `main`.
- A divisão de arquivos e os args do lote estão no topo de `docs/tasks-inicio.md`.

A INI-02 inclui o script `pnpm indicadores`, a fonte única dos números do seed (decidido em 2026-11-08).

## Onde estamos

- **Demo no ar:** https://judisys-demo.draft.dev.br, publicada pela `main` (`ace642c`), com 991 testes Vitest e 105 e2e verdes. As tarefas DMO-01 a DMO-25 e AJ-01 a AJ-17 estão em Concluído 🎉.
- **Feature INI**, o redesenho da área logada:
  - **Especificação:** `docs/prd-inicio.md`, `docs/sdd-inicio.md` (prevalece sobre o PRD) e `docs/tasks-inicio.md`, todos aprovados.
  - **Branch de agregação `ini-redesign`:** já está no GitHub, com o PRD, o SDD e as tarefas. Todos os PRs INI vão para ela. Só a INI-10 abre o PR `ini-redesign` → `main`, porque a `main` publica a demo a cada push.
  - **Cards:** INI-01 a INI-10 estão no Backlog do board https://trello.com/b/ufNoQ9bK, com a label `início`.
  - **Referência visual aprovada:** canvas https://claude.ai/artifact/GLuzrvfvB5HY7Wy1je9sbr, linhas "INI · Casca e início" e "INI · Fichas" (SDD §11). As linhas de cima (propostas A, B, C e A2) são histórico.
- **Outros cards em "A Fazer":**
  - AJ-18 · `useBuscaAdiada` devolve o `limpar` (https://trello.com/c/iopAxPbg);
  - AJ-19 · helper `rotaDoProcesso(id, aba)` (https://trello.com/c/eDQK6HAn).

  As duas vão mexer em arquivos que o INI também toca, então é melhor rodá-las depois do INI ou combinar a ordem com o usuário.

## O que esta sessão fez

- Comparou o dashboard atual com três direções no canvas. O usuário escolheu a "Pauta do dia", em versão montável.
- Fechou 22 decisões no `grilling`. O resumo está no PRD §4 (D-01 a D-16).
- Escreveu o PRD, o SDD e as tarefas, e criou os cards.
- `/retro`: o `trello.sh` passou a aceitar a "Descrição" em várias linhas no `import` e ganhou os comandos `labels` e `new-label` (commit `fe9f086` no `~/code/claude-setup`, sem push).

## Decisões que continuam valendo

- As da demo: SDD da demo §4 e os PRs #24 a #42. Cores só em `src/estilos/tokens.css`, chapadas, sem degradê; o guarda é o `cores.test.ts`. Sem meta de cobertura no CI.
- AJ pequeno (uma linha e um e2e) se faz na própria sessão, com uma passada única de revisão. Lote só com duas tarefas ou mais.
- **INI:** o usuário quer polidez visual acima de tudo. Cada quadro tem um desenho por largura e só fica pronto com capturas em 1280 (menu aberto), 1440, 834 e 390px, nos dois temas (SDD §5.3 e §10).
- A versão "final" do Judisys vai ser outro projeto, em Node, NestJS, TypeScript e React, e lá o usuário quer aprender. A demo continua no modo "entregar" (memórias `user_profile` e `feedback_autonomia_demo`).

## Pegadinhas

- **Arquivos do canvas:** ficam em `.canvas-propostas/` no repo, fora do git (está em `.git/info/exclude`). Para revisar, publique com `root` nessa pasta, e leia antes o `project/canvas.json` publicado (action `read`). A ferramenta de Artifact recusa a pasta temporária do job como `root`.
- **INI-03, prova de conceito:** o `react-grid-layout` 2.3 limita o `x` do quadro em vez de recusar. A recusa vem da posição do ponteiro (SDD §5.6 e Q-01). Se não ficar estável, a alternativa é um grid próprio.
- **`/code-review` em fork:** `(none)` ou `(nenhum)` quer dizer **sem achados**, não falha. Ele deixa os arquivos de teste de fora; quando o teste é a própria mudança, revise o teste à mão. Para diff com lógica, use `medium`.
- **Commit do orquestrador depois do revisor:** passa pelo `/code-review`. Se mexe no visual, refaça as capturas (passo 6.2 da `execucao-paralela`).
- **Card de AJ:** confira com `grep` a rota, o arquivo e o teste antes de escrever.
- **PR empilhado:** mergeie o de baixo apagando a branch, para o GitHub mudar a base do de cima.
- **Biome:** também verifica SVG (exige `<title>` em todo `<svg>`) e recusa `export` em arquivo de teste.
- **Captura de hover com Playwright:** espere a tela terminar de carregar antes do `hover()`.
- **Workflow de lote:** copie o `workflow-lote.js` da skill para o scratchpad a cada lote.
- **Fim de lote:** rode `git worktree prune` e remova as branches `worktree-wf_*`. Os `http.server` nas portas 8000 e 8765 não são do judisys; não os derrube.

## Skills sugeridas

Leia este arquivo no início da sessão.

- `execucao-paralela`: rodar o lote 1 do INI, a partir da `ini-redesign`.
- `sdd-para-trello`: mover os cards INI e criar cards novos.
- `comparacao-visual`: toda tarefa INI. Use `--rolagem-interna` e os dois temas.
- `simplify`, `revisao-spec`, `code-review` e `security-review`: o checklist antes de qualquer PR.
- `grilling`: se aparecer decisão nova de produto no meio do INI.
