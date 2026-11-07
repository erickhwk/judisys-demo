# Handoff — Demo do Judisys (código DMO)

Data: 2026-11-07. Responder sempre em pt-BR.

## Onde estamos

- Spec: `docs/prd-demo.md`, `docs/sdd-demo.md` (prevalece) e `docs/tasks-demo.md`. O cabeçalho deste último tem os lotes sugeridos e, desde o AJ-06, o bloco **"Execução em paralelo"**, com os args fixos do workflow de lote.
- Repo público `erickhwk/judisys-demo` (`~/code/judisys`), publicado pelo CI em https://erickhwk.github.io/judisys-demo/ a cada push na `main`.
- `main` em `ed2dd30`, com 797 testes Vitest e 74 e2e verdes. Não há worktrees nem branches locais além da `main`.
- No ar: tudo o que havia antes, mais a AGC (cadastro, presença e instalação), o dashboard e as exportações CSV.
- Board: https://trello.com/b/ufNoQ9bK.
  - Concluído 🎉: DMO-01 a DMO-16, DMO-18 a DMO-22 e AJ-01, AJ-05 e AJ-06.
  - A Fazer: AJ-02 (componentes repetidos), AJ-03 (CNPJ único entre empresas), AJ-04 (CPF/CNPJ único entre credores do processo) e as DMO-17, DMO-23, DMO-24 e DMO-25.

## Feito nesta sessão

- **AJ-05 (PR #19):** cada módulo declara as próprias rotas e abas em `src/modulos/<m>/rotas.tsx`. O detalhe está no corpo do PR.
- **Lote 8 (PRs #20 DMO-22, #21 DMO-18, #22 DMO-16):** ~900 mil tokens de subagentes, ~25 min. É o primeiro lote em que cada agente recebe só o trecho da spec da sua tarefa e roda o ciclo curto de testes.
- **Retro do lote 8 e AJ-06 (PR #23):**
  - o e2e local gera o seed sozinho;
  - o PRZ-08 deixou de ser instável: era uma corrida no próprio teste;
  - o bloco "Execução em paralelo" entrou no `docs/tasks-demo.md`.

## Próximo passo

1. **Lote 9: DMO-17 sozinha** (AGC: votação, painel do art. 45, cram down e registro), com a `execucao-paralela`.
   - Ela depende da DMO-16 e da DMO-19, já na `main`.
   - Use o bloco "Execução em paralelo" do `docs/tasks-demo.md` para `teste` e `contexto`. Acrescente só a divisão de arquivos e a nota da tarefa.
   - Na nota, dizer que ela constrói sobre `src/modulos/agc/` e `src/dados/servicos/agc.ts` (DMO-16). Dizer também que a presença trava na instalação e que a DMO-17 vota sobre os presentes. O "reabrir lista enquanto não houver voto" só entra se a demo pedir (ver abaixo).
   - É uma tarefa grande (~35–45 min) e tem regra de domínio. O `/code-review` fica no nível high.
   - Copie de novo o `workflow-lote.js` da skill para o scratchpad e recorte a spec com um script, como no lote 8: seção da tarefa, mais as §2, §4.2, §6, §7.6 e §10 do SDD e a §7.9 do PRD.
2. Depois: lote 10 (DMO-23 e DMO-24, mais os AJ-02 a AJ-04 se couberem) e, por último, a DMO-25 no `~/code/draft-site`.

## Decisões da sessão fora da spec

- **Autonomia (memória `feedback_autonomia_demo`):** eu decido o técnico e registro no PR como "Decidido pelo orquestrador". Levo ao usuário só regra de negócio do produto real, escopo novo e o que for difícil de desfazer.
- **"A rever na reescrita"** (detalhe nos PRs #21 e #22):
  - a 2ª convocação é livre na simulação; pela lei, só se a 1ª não instalou;
  - não há intervalo mínimo de 5 dias entre convocações (art. 36, I);
  - credor presente que perde o voto só ganha um aviso, e a presença não sai sozinha;
  - prazos abertos de processo encerrado continuam nos números do dashboard.
- **Lista de presença travada depois da instalação, sem desfazer:** decidido com o usuário.
- **Dashboard:** título "Dashboard" e 4 cartões, em vez de "Painel de Controle" e 5 cartões do guia. Decidido pelo orquestrador.
- **AJ-05:** a tabela de `src/rotas.test.ts` confere só as rotas antigas. Rota nova leva teste de permissão no próprio módulo, regra que está no bloco do `docs/tasks-demo.md`.

## Pegadinhas

- Este `docs/handoff.md` fica sem commit na `main`. Commite junto com a primeira branch da próxima sessão.
- O `capturar.sh` da `comparacao-visual` não desliga animações: duas capturas do mesmo código podem diferir na faixa do menu lateral.
  - Pendente da retro: ajustar no `~/code/claude-setup`, com `reducedMotion: 'reduce'` e CSS que zere `animation` e `transition`.
  - Até lá, diferença só no menu lateral é ruído.
- O `/code-review` em fork pode voltar vazio (no AJ-06 voltou em 4 s, com uma única ferramenta chamada). Nesse caso, revise à mão ou rode de novo; não trate como "sem achados".
- No fim de cada lote, rode `pgrep -fl preview` e derrube o que sobrou. Remova também os worktrees e as branches `worktree-wf_*` (passo 7 da `execucao-paralela`).
- O build avisa chunk > 500 kB. É candidato a um AJ de carregamento sob demanda (tirar o `eager` do glob e usar `React.lazy` nos `rotas.tsx`).

## Skills sugeridas

Leia este arquivo no início da sessão.

- `execucao-paralela`: lote 9 (DMO-17) e lote 10.
- `sdd-para-trello`: mover cards (Concluído com o ok do usuário, Em andamento, Em revisão) e anexar PRs.
- `simplify`, `revisao-spec`, `code-review`, `security-review`: checklist antes de qualquer PR feito fora do workflow.
- `comparacao-visual`: tarefas com `visual: true` (a DMO-17 é uma).
- `retro` ao fim do lote 9 ou 10; `handoff` ao encerrar.
