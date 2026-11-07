# Handoff — Demo do Judisys (código DMO)

Data: 2026-11-07. Responder sempre em pt-BR.

## Onde estamos

- Spec: `docs/prd-demo.md`, `docs/sdd-demo.md` (prevalece; decisões T-01 a T-39) e `docs/tasks-demo.md` (25 tarefas, com os lotes sugeridos no topo).
- Repo público `erickhwk/judisys-demo` (`~/code/judisys`), publicado pelo CI em https://erickhwk.github.io/judisys-demo/ a cada push na `main`.
- No ar: login por papel, casca, processos, empresas, prazos/agenda, credores/QGC, informes e anexos, busca global, usuários e logs.
- `main` em `b14e6ee`, com 710 testes Vitest e 65 e2e verdes. Não há worktrees nem branches locais além da `main`.
- Board: https://trello.com/b/ufNoQ9bK.
  - Concluído 🎉: DMO-01 a DMO-15, DMO-19 a DMO-21 e AJ-01.
  - A Fazer:
    - AJ-02: componentes repetidos e defeitos compartilhados. O lote 7b acrescentou itens em comentário e checklist.
    - AJ-03: CNPJ único entre empresas.
    - AJ-04: CPF/CNPJ único entre credores do processo.
    - AJ-05: rotas e abas registradas por módulo.

## Próximo passo

1. **AJ-05 sozinho, antes do lote 8** (https://trello.com/c/DRoiljBS). Cada módulo passa a declarar as próprias rotas e abas, e `src/rotas.tsx` junta tudo com `import.meta.glob`. Hoje todo lote em paralelo conflita em `rotas.tsx`, e o orquestrador liga cada aba nova à mão. O lote 8 repetiria os dois casos: a DMO-16 traz as rotas e a aba da AGC, e a DMO-18 troca a rota `/`. O card tem a proposta e os critérios.
2. **Lote 8:** DMO-16 (AGC: cadastro, presença e instalação) ∥ DMO-18 (dashboard) ∥ DMO-22 (exportações CSV), com a `execucao-paralela`. DMO-16 e DMO-18 com `visual: true`.
   - É o primeiro lote com o modelo novo da skill:
     - `spec` por tarefa: o orquestrador recorta a seção da tarefa e os trechos citados do SDD e do PRD num `<COD>-spec.md` do scratchpad;
     - `teste.rapido`: ciclo curto, por exemplo `pnpm lint && pnpm typecheck && pnpm vitest run {arquivos}`;
     - nível do `/code-review` escolhido pelo risco do diff.
   - Copie de novo o `workflow-lote.js` da skill para o scratchpad: a cópia antiga não tem essas mudanças.
   - Anote o `subagent_tokens` do lote: foram ~1,5 milhão no 7a e ~950 mil no 7b.
   - Capturas: o `capturar.sh` da `comparacao-visual` agora faz login por clique, fixa o relógio e navega por hash, então os revisores não precisam escrever script próprio. Exemplo, rodado nesta sessão:

     ```sh
     capturar.sh --url http://localhost:431{n}/judisys-demo/ --saida docs/capturas/<COD>/depois \
       --login-clique "Entrar como Analista" --relogio 2026-11-07T10:00:00 --tela logs='#/logs'
     ```

     Tela passageira (diálogo, busca aberta) continua precisando de um Playwright próprio.

Depois do lote 8 vêm o lote 9 (DMO-17, votação, que depende da DMO-16 e da DMO-19), o lote 10 (DMO-23 e DMO-24) e os AJ-02 a AJ-04 quando couber. A DMO-25 é feita no `~/code/draft-site`, com a demo pronta.

## Decisões da sessão fora da spec

- **Autonomia (memória `feedback_autonomia_demo`):** a demo é base de uma reescrita futura que o usuário vai conduzir de perto.
  - Eu decido o que for técnico ou de baixo impacto e registro no PR como "Decidido pelo orquestrador".
  - Levo a ele só regra de negócio que vale para o produto real, escopo novo e o que for difícil de desfazer.
  - Merge, autorizar Concluído e ações externas continuam com ele.
- **Esforço (memória `feedback_esforco`):** mais esforço só quando o risco pede, com o critério dito; nunca por escolha arbitrária.
- **"A rever na reescrita"** (detalhe no PR #18):
  - o analista vê os logs da coleção usuários;
  - o último usuário de um papel pode ser excluído (o cartão de entrada fica desativado até o "Resetar demo").
- **RF-38:** a busca global também acha empresa pelo nome fantasia (PRD atualizado na DMO-20).

## Pegadinhas

- Este `docs/handoff.md` fica sem commit na `main`. Commite junto com a primeira branch da próxima sessão (a do AJ-05).
- O revisor que sobe `vite preview` pode esquecer o servidor no ar: nesta sessão sobrou um na porta 4312. No fim do lote, rode `pgrep -fl preview`.
- O conflito em `rotas.tsx` continua até o AJ-05 entrar. Resolva mantendo os dois imports na ordem do Biome e confira `grep -o "rota('[^']*'" src/rotas.tsx | sort | uniq -d` vazio.
- `biome migrate` desliga o linter (há teste-guarda em `src/biome.test.ts`). Markdown fica fora do Biome.
- O build avisa chunk > 500 kB. É candidato a um AJ de carregamento sob demanda.

## Skills sugeridas

Leia este arquivo no início da sessão. O `/retro` dos lotes 4 a 7b já foi feito nesta sessão, e os ajustes estão na `origin` do `~/code/claude-setup`.

- `sdd-para-trello`: mover o AJ-05, cards do lote 8 e anexar PRs.
- `execucao-paralela`: lote 8.
- `simplify`, `revisao-spec`, `code-review`, `security-review`: checklist antes do PR do AJ-05.
- `comparacao-visual`: o AJ-05 não deve mudar nada na tela; capture antes e depois de uma ou duas telas para provar.
