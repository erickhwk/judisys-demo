# Handoff — Demo do Judisys (código DMO)

Data: 2026-11-07 (fim da noite). Responder sempre em pt-BR.

## Foco da próxima sessão

Nada em andamento além do merge da AJ-17. As 25 tarefas DMO e os AJ-01 a AJ-16 estão concluídos e no ar. A próxima sessão começa pelo que o usuário pedir. Os candidatos conhecidos estão em "Pendências" abaixo.

## Onde estamos

- Spec: `docs/prd-demo.md`, `docs/sdd-demo.md` (prevalece) e `docs/tasks-demo.md`. O bloco **"Execução em paralelo"** do arquivo de tarefas tem os args fixos do workflow de lote, e agora também o ponteiro para a marca da Draft.
- Repo público `erickhwk/judisys-demo` (`~/code/judisys`), publicado pelo CI a cada push na `main` em **https://judisys-demo.draft.dev.br**:
  - domínio próprio, CNAME no registro.br e HTTPS ligado;
  - base do Vite `/` (AJ-10);
  - o endereço antigo do github.io redireciona para o novo.
- O site da Draft (`~/code/draft-site`) tem o botão "Quero testar o Judisys" na seção `#judisys`, abrindo a demo em nova aba (DMO-25).
- `main` em `0516b2f`, com 990 testes Vitest e 105 e2e verdes. Há uma branch aberta, a `aj-17-guarda-de-cores`, no PR #42. Não há worktrees.
- Board: https://trello.com/b/ufNoQ9bK.
  - Concluído 🎉: DMO-01 a DMO-25 e AJ-01 a AJ-16.
  - Em revisão: AJ-17 (PR #42, https://github.com/erickhwk/judisys-demo/pull/42). Falta o CI do PR verde.

## O que esta sessão entregou

O detalhe está nos corpos dos PRs #32 a #42:

- Lote 11 (#32 a #34): busca de Credores sem perder teclas (hook `src/ui/useBuscaAdiada.ts`), trilha num `nav` "Trilha" e helpers dos e2e unificados em `e2e/apoio.ts`.
- AJ-10 (#35): domínio próprio.
- AJ-14 (#36): favicon (`pnpm favicons`, gerado de `src/ui/logos/judisys-marca-branca.svg`).
- Lote 12 (#37, #38): trilha do credor e buscas de Empresas, Processos e Informes.
- Lote 13 (#39, #40): trilha da AGC e **modo escuro** (AJ-11), que ficou assim:
  - switch no topo e na entrada, com o comportamento do `draft-site/tema.js`;
  - tokens escuros em `@media screen`, então a impressão fica sempre clara;
  - cores chapadas, sem degradê, inclusive na marca (dourado `#C8993F`);
  - rodapé à direita com a marca da Draft, que fica laranja `#FF5A36` no hover.
- AJ-16 (#41): trilha do informe. Agora o nome do processo leva à visão geral em toda trilha.
- AJ-17 (#42, aberto): guarda `src/estilos/cores.test.ts`. Toda cor vem de `tokens.css`, sem degradê. Saiu do `/retro`.

## Pendências

- **Usuário:** merge do PR #42 (AJ-17). Depois disso:
  - conferir o CI da `main`;
  - mover a AJ-17 para Concluído 🎉, com o ok do usuário.
- **Usuário:** conferência manual no Firefox e no Safari (RNF-02 da DMO-24, item desmarcado de propósito), agora nos dois temas.
- **Usuário:** commitar as edições de skill que estão sem commit em `~/code/claude-setup`:
  - `execucao-paralela/SKILL.md`, `workflow-lote.js`, `comparacao-visual/SKILL.md`, `capturar.mjs`: retros anteriores (DMO-17, lote 9);
  - `execucao-paralela/SKILL.md` (passos 6.2 e 7.2) e `sdd-para-trello/SKILL.md` (a regra de conferir com `grep` o que o card cita): retro desta sessão.
- Ideias que os agentes registraram e ninguém pediu (não viraram card):
  - o `useBuscaAdiada` devolver `limpar`, para tirar o `setTextoBusca('')` repetido em 4 telas;
  - um helper `rotaDoProcesso(id, aba)` para as cerca de 10 cópias de `/processos/${id}/visao-geral`.
- O usuário quer, mais adiante, um "curso" ou material sobre as regras de RJ e falência da demo (memória `project_judisys`).

## Decisões que continuam valendo

- As da sessão anterior (PRs #24 a #31 e SDD T-40): AGC encerrada recalcula na tela; documento do credor único por processo e classe; RNF-03 no Fast 4G; sem meta de cobertura no CI.
- Cores: só em `src/estilos/tokens.css`, chapadas. O preto da impressão é o token `--cor-impressao-texto`. A paleta escura foi aprovada como está (decidido no PR #40).
- AJ pequeno (uma linha mais um e2e) se faz na própria sessão, com a passada única de revisão. Lote, só com duas ou mais tarefas.

## Pegadinhas

- **`/code-review` em fork:** `(none)` ou `(nenhum)` quer dizer **sem achados**. Não é falha. Ele lê o diff numa chamada só e deixa os arquivos de teste de fora. Quando o teste é a própria mudança, revise o teste à mão. Para diff com lógica, use `medium`.
- **Commit do orquestrador depois do revisor:** passa por `/code-review`. Se mexe no visual, refaça as capturas (passo 6.2 da `execucao-paralela`).
- **Card de AJ:** confira com `grep` rota, arquivo e teste antes de escrever. Nesta sessão, três cards saíram com erro de memória.
- **PR empilhado:** mergear o de baixo apagando a branch, para o GitHub mudar a base do de cima.
- **O Biome também verifica SVG** (exige `<title>` em todo `<svg>`) e recusa `export` em arquivo de teste.
- **Captura de hover com Playwright:** espere a tela terminar de carregar antes do `hover()`. Senão o layout se move e o hover se perde.
- **Workflow de lote:** copie o `workflow-lote.js` da skill para o scratchpad a cada lote.
- **Fim de lote:** `git worktree prune` e remover as branches `worktree-wf_*`. Os `http.server` nas portas 8000 e 8765 não são do judisys; não derrube.

## Skills sugeridas

Leia este arquivo no início da sessão.

- `sdd-para-trello`: mover a AJ-17 e criar cards novos.
- `execucao-paralela`: se o próximo pedido tiver duas ou mais tarefas.
- `simplify`, `revisao-spec`, `code-review`, `security-review`: checklist antes de qualquer PR.
- `comparacao-visual`: tarefa que muda o visual. Com `--rolagem-interna`, e com os dois temas desde a AJ-11.
- `grilling`: se vier feature nova que peça PRD e SDD (por exemplo, o material sobre as regras de RJ e falência).
