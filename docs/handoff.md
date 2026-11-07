# Handoff — Demo do Judisys (código DMO)

Data: 2026-11-07. Responder sempre em pt-BR.

## Onde estamos

- Spec: `docs/prd-demo.md`, `docs/sdd-demo.md` (prevalece; decisões T-01 a T-39), `docs/tasks-demo.md` (25 tarefas, lotes sugeridos no topo).
- Repo público `erickhwk/judisys-demo` (`~/code/judisys`), publicado em https://erickhwk.github.io/judisys-demo/ pelo CI a cada push na `main`. Já no ar: login por papel, casca (faixa, menu, rodapé), processos, empresas, prazos/agenda e credores/QGC.
- `main` em `09a4d59`: 658 testes Vitest e 47 e2e verdes; sem worktrees nem branches locais além da `main`.
- Board: https://trello.com/b/ufNoQ9bK.
  - Concluído 🎉: DMO-01 a DMO-11 e AJ-01.
  - Pronto pra deploy (lote 7a, deploy verde, falta o usuário autorizar Concluído): DMO-12, DMO-13, DMO-14, DMO-15.
  - A Fazer: AJ-02 (componentes repetidos + `position: relative` na `.rolagem` da Tabela), AJ-03 (CNPJ único entre empresas), AJ-04 (CPF/CNPJ único entre credores do processo).

## Próximo passo: lote 7b

**DMO-19 · Informes e anexos ∥ DMO-20 · Busca global ∥ DMO-21 · Usuários e logs**, com a `execucao-paralela` (cada uma `visual: true`). Atenção: a DMO-20 é a busca global, não usuários.

O que pôr no `contexto`/`nota` (não está na spec):
- **`src/rotas.tsx` conflita sempre** (lote 7a: todo PR depois do primeiro brigou no import e, às vezes, nas linhas de rota). Peça a cada tarefa o import **numa linha própria em posição diferente** (ex.: DMO-19 logo depois do import de credores, DMO-21 no fim do bloco) e confira, depois de cada resolução, `grep -o "rota('[^']*'" src/rotas.tsx | sort | uniq -d` vazio. O resolvedor "mantém os dois lados" duplica rotas quando o conflito pega as linhas da tabela.
- Abas do processo: `src/modulos/processos/abas.tsx` tem `agc` e `informes` num bloco `// TEMPORÁRIO`. A DMO-19 exporta `AbaInformes({ processoId })` (só conteúdo) e o orquestrador liga no mapa depois, como fez com AbaPrazos/AbaCredores; a aba AGC é da DMO-16.
- DMO-19: anexo `{ origem: 'publico', caminho: 'anexos/x.pdf', nome }` ou `{ origem: 'local', arquivoId, ... }` (blob na tabela `arquivos`, sem log próprio); erro de cota com `ehErroDeCota`/`MENSAGEM_COTA` de `src/dados/carga.ts` (fecha o CAR-11 que ficou desmarcado na DMO-08); `VisualizadorPdf` em `src/ui/`.
- DMO-21: logs com `de` `null` (seed) ou `undefined` (app) tratados como vazio; log de exclusão de processo usa o prefixo `cascata.<tabela>` (`PREFIXO_CASCATA` em `src/dados/servicos/`); desempate de logs no mesmo segundo é por id (UUID) no repositório; formatação de/para pode reaproveitar `src/modulos/processos/historico.ts`.
- Componente genérico novo fica na pasta do módulo (o AJ-02 junta depois). Cabeçalho de página, download e moeda já existem em 2 ou 3 cópias: reaproveite um deles em vez de criar mais.
- Revisor: `/comparacao-visual` logo depois da `/revisao-spec`; o `capturar.sh` só faz login por formulário, então script Playwright próprio clicando no cartão "Entrar como …", portas 431{n} (preview) e 420{n} (e2e). Mesmo assim, confira se as capturas vieram (no lote 5 faltou e o orquestrador fez).
- Os testes e2e que contam linhas precisam esperar a lista carregar (o PRZ-10 falhou só no merge de teste por isso).

Depois do 7b: lote 8 (DMO-16 AGC cadastro e presença, DMO-18 dashboard, DMO-22 CSV), lote 9 (DMO-17 votação), lote 10 (DMO-23, DMO-24), e os AJ-02 a 04 quando couber. DMO-25 no `~/code/draft-site`, com a demo pronta.

## Decisões da sessão fora da spec

- O usuário faz merge e autoriza mover para Concluído; eu rodo instalação, testes, push de branch, PR, CI e cards (memória `feedback_commands`).
- Na rodada de dúvidas, recomendações com "a sua escolha" geram ambiguidade: dê uma recomendação só.

## Pegadinhas

- Este `docs/handoff.md` fica modificado e sem commit na `main`: commite junto com a primeira branch da próxima sessão (ou num PR `docs:`), para a árvore ficar limpa antes do lote.
- `biome migrate` desliga o linter (há teste-guarda em `src/biome.test.ts`); Markdown fica fora do Biome.
- Build avisa chunk > 500 kB (614 kB na DMO-10): candidato a AJ de carregamento sob demanda.
- Para a retro: o `capturar.sh` da `comparacao-visual` não sabe segurar/derrubar URL (telas passageiras) nem logar por clique.

## Skills sugeridas

- `execucao-paralela`: lote 7b.
- `sdd-para-trello`: cards (mover, checar, anexar PR, AJ).
- `simplify`, `revisao-spec`, `code-review`, `security-review`: checklist antes de PR.
- `comparacao-visual`: telas.
- `retro`: há material acumulado desde a última (lotes 4 a 7a).
