# Handoff — Judisys demo (INI: lote 1 concluído)

Data: 2026-11-08. Responda sempre em pt-BR.

## Foco da próxima sessão

**Rodar o lote 2 do INI: a INI-03** (grade montável, Personalizar e moldura do quadro), com a `execucao-paralela`.

- É uma tarefa só. Pela regra da casa ("lote só com duas tarefas ou mais"), pode rodar como um lote de uma tarefa, para manter o par implementador e revisor. A outra opção é a própria sessão implementar. Combine com o usuário.
- A tarefa começa pela prova de conceito da recusa no `react-grid-layout` 2.3 (Q-01, SDD §5.6). Se não ficar estável, a alternativa é um grid próprio, decidida e registrada no SDD dentro da própria tarefa.
- A base é a `ini-redesign`, e o PR vai para ela, nunca para a `main`.

## Onde estamos

- **`ini-redesign`:** está com as tarefas INI-01, INI-02, INI-04 e INI-05 (PRs #43 a #46, mergeados pelo orquestrador com o CI verde, com autorização excepcional do usuário).
  - Topo: o commit de docs da retro e este handoff.
  - Na última suíte local com o lote integrado: Vitest 1104 e e2e 113, todos verdes.
- **Cards INI-01, 02, 04 e 05:** em "Pronto pra deploy". INI-03 e INI-06 a INI-10 continuam no Backlog do board https://trello.com/b/ufNoQ9bK.
- **Demo no ar:** https://judisys-demo.draft.dev.br, ainda publicada pela `main` (`ace642c`). Nada do INI chegou à `main`. Só a INI-10 abre o PR `ini-redesign` → `main`.
- **Especificação:** `docs/prd-inicio.md`, `docs/sdd-inicio.md` (prevalece sobre o PRD) e `docs/tasks-inicio.md`. Os args fixos dos lotes estão no topo das tarefas.
- **Referência visual:** canvas https://claude.ai/artifact/GLuzrvfvB5HY7Wy1je9sbr, linhas "INI · Casca e início" e "INI · Fichas" (SDD §11).
- **Outros cards em "A Fazer":**
  - AJ-18 · `useBuscaAdiada` devolve o `limpar`;
  - AJ-19 · helper `rotaDoProcesso(id, aba)`.

  As duas tocam arquivos do INI. Rode depois do INI, ou combine a ordem com o usuário.

## Decisões do lote 1 (já no SDD, nas tarefas e nos cards)

- **MNT-08:** montagem salva com todos os quadros descartados volta ao padrão do papel; a montagem vazia de propósito continua vazia. A regra fica no `normalizar`. Quadro fora do grid é reposicionado (MNT-05), não descartado (§5.4 corrigida).
- **Frase-resumo:** "a AGC **de** <apelido>" (CAB-03, CAB-07 e RF-07). Ela olha só a 1ª convocação, como diz o §5.7.
- **Busca do início:** fica no `CabecalhoInicio`, à direita, no mesmo padrão do `CabecalhoPagina`, e some abaixo de 901px. O Personalizar da INI-03 entra na prop `acoes`, à esquerda da busca.
- **5ª cor dos gráficos:** a INI-08 cria o `--cor-grafico-5`. Hoje a 5ª série usa a cor do trilho e quase some no tema claro.
- **`pnpm indicadores`:** é a fonte única dos números do seed e já imprime o `resumoDoDia`. Cálculo novo em `src/modulos/inicio/indicadores.ts` também entra no script.

## Decisões que continuam valendo

- As da demo: SDD da demo §4 e os PRs #24 a #42. Cores só em `src/estilos/tokens.css`, chapadas e sem degradê; o guarda é o `cores.test.ts`. Sem meta de cobertura no CI.
- **INI:** polidez visual acima de tudo. Cada quadro tem um desenho por largura e só fica pronto com capturas em 1280 (menu aberto), 1440, 834 e 390, nos dois temas.
- A versão "final" do Judisys vai ser outro projeto, em Node, NestJS, TypeScript e React, e lá o usuário quer aprender. A demo continua no modo "entregar".
- **Merge e push dos PRs:** a autorização do lote 1 foi excepcional. Confirme com o usuário antes de mergear no lote 2.

## Pegadinhas

- **Capturas:** o `capturar.sh` agora aceita `--viewports` e `--tema claro,escuro --tema-chave tema`. O comando completo está na parte fixa da `tasks-inicio.md`.
- **e2e nos lotes:** use `--workers=2` (já está no `run` da `tasks-demo.md`). Com os workers padrão, quatro agentes sobrecarregam a máquina, e o e2e falha por tempo.
- **CI na `ini-redesign`:** o CI roda em PR e em push na `main`, não em push na `ini-redesign`. Vale o CI do último PR, desde que o head dele já contenha a base.
- **`.canvas-propostas/`:** fica no repo, fora do git (`.git/info/exclude`). Para revisar, publique com `root` nessa pasta e leia antes o `project/canvas.json` publicado.
- **`/code-review` em fork:** `(none)` quer dizer sem achados. Ele deixa os testes de fora; revise o teste à mão quando o teste for a própria mudança.
- **Commit do orquestrador depois do revisor:** passa pelo `/code-review`. Se mexe no visual, refaça as capturas.
- **Biome:** exige `<title>` em todo `<svg>` e recusa `export` em arquivo de teste.
- **Fim de lote:** rode `git worktree prune` e remova as branches `worktree-wf_*`. Os `http.server` nas portas 8000 e 8765 não são do judisys; não os derrube.

## Skills sugeridas

Leia este arquivo no início da sessão.

- `execucao-paralela`: lote 2 (INI-03), a partir da `ini-redesign`.
- `sdd-para-trello`: mover o card da INI-03.
- `comparacao-visual`: toda tarefa INI, com `--rolagem-interna`, as quatro larguras e os dois temas.
- `simplify`, `revisao-spec`, `code-review` e `security-review`: o checklist antes de qualquer PR.
- `grilling`: se aparecer decisão nova de produto, como a Q-01, se o grid próprio mudar o escopo.
