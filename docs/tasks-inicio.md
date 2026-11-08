# Tarefas: Início montável

Fonte: docs/sdd-inicio.md · PRD: docs/prd-inicio.md · Código: `INI` · Label: `início`

Repositório: `erickhwk/judisys-demo` (pasta `~/code/judisys`). Referência visual: canvas https://claude.ai/artifact/GLuzrvfvB5HY7Wy1je9sbr (SDD §11).

**Branch de agregação:** `ini-redesign`, criada a partir da `main`. A `main` publica a demo a cada push e o início fica incompleto entre as tarefas, então todos os PRs das tarefas vão para a `ini-redesign`. Só no fim, na INI-10, ela é mergeada na `main`.

**Lotes sugeridos**

| Lote | Tarefas | Observação |
|---|---|---|
| 1 | INI-01, INI-02, INI-04, INI-05 | Independentes. Divisão de arquivos abaixo. |
| 2 | INI-03 | Grade, Personalizar e moldura do quadro (precisa da INI-02 e da INI-04). |
| 3 | INI-06, INI-07, INI-08, INI-09 | Quadros, em paralelo sobre a moldura (INI-03) e os gráficos (INI-05). |
| 4 | INI-10 | Fechamento e PR para a `main`. |

**Divisão de arquivos do lote 1** (evita conflito):

- **INI-01:** `tokens.css`, `Layout`, `MenuLateral` (inclusive o rótulo "Início"), `MenuConta`, `BotaoTema` e `CabecalhoPagina`, além dos e2e que clicam no link "Dashboard" do menu.
- **INI-02:** `src/modulos/inicio/montagem.ts` e `persistencia.ts`, `src/dados/boot.tsx`, `scripts/indicadores.ts` e o script no `package.json`. O script importa o `indicadores.ts` de onde ele estiver; quem mergear por último entre a INI-02 e a INI-04 acerta o caminho.
- **INI-04:** a mudança de `src/modulos/dashboard/` para `src/modulos/inicio/`, sem os arquivos da INI-02. Inclui `e2e/apoio.ts` e os e2e que esperam o título "Dashboard".
- **INI-05:** só `src/ui/graficos/`.

**Execução em paralelo** (args fixos do `workflow-lote.js` da skill `execucao-paralela`; o orquestrador acrescenta só o que é do lote)

- `teste`: os mesmos da `tasks-demo.md`.
- **Base das worktrees:** a branch `ini-redesign`, e não a `main`.
- `contexto`, a parte fixa:
  - Vale a parte fixa da `tasks-demo.md` (pt-BR, rotas por módulo, autonomia, pegadinhas e guarda de cores). O SDD prevalece sobre o PRD.
  - Nesta feature, o `src/ui/MenuLateral.tsx` é da INI-01 e o `src/modulos/inicio/montagem.ts` é da INI-02. As outras tarefas não editam esses arquivos sem virar dúvida.
  - Referência visual: os artboards do canvas da SDD §11. Os valores de cor do canvas são aproximações; na implementação valem os tokens.
  - Número do seed usado em ficha, caso ou teste sai do `pnpm indicadores` (INI-02). Cálculo novo em `indicadores.ts` entra também na saída do script.
  - Capturas (SDD §10: 1280 com o menu aberto, 1440, 834 e 390, nos dois temas): `capturar.sh --url http://localhost:432{n}/ --login-clique "Entrar como Advogado" --relogio 2026-11-07T10:00:00 --rolagem-interna --viewports 1280x800,1440x900,834x1112,390x844 --tema claro,escuro --tema-chave tema --tela <nome>='#/<rota>'`, com o preview na porta 432{n}, derrubado no fim.
  - O modo Personalizar (faixa, recusa e arrasto) depende de estado e sai do `node scripts/capturar-personalizar.mjs http://localhost:432{n}/ docs/capturas/<COD>/depois`. Tarefa que muda a moldura ou a edição recaptura com ele; acrescente ali os estados novos.

---

## INI-01 · Casca nova: tokens, menu claro e busca no cabeçalho
- **Tipo:** Feature
- **Depende de:** —
- **SDD:** §4 (S-08, S-09), §5.8, §7.1
- **Descrição:** a casca de todas as páginas internas muda, conforme os artboards "INI · Desktop claro/escuro" e "Tablet": menu lateral claro (item ativo discreto, contadores, tema e conta no pé), busca no `CabecalhoPagina` sem o topo do desktop, barra no topo abaixo de 901px (menu, logo, lupa e avatar) e tokens novos nos dois temas.
- **Critérios de aceite:**
  - [ ] Tokens novos da S-09 nos dois temas e os "sempre escuros" do menu removidos, com os pares novos no `tokens.test.ts` e o `cores.test.ts` verde.
  - [ ] Menu lateral com "Início" no lugar de "Dashboard", item ativo com fundo azul-claro e ícone dourado, contador de processos e de vencidos na Agenda.
  - [ ] Pé do menu com o interruptor de tema (`role="switch"`) e o botão da conta, que abre o `MenuConta` atual. Recolhido, só os ícones, com `aria-label`.
  - [ ] Topo antigo removido no desktop. A `BuscaGlobal` fica no `CabecalhoPagina`, à direita das ações, e o ⌘K continua funcionando.
  - [ ] Abaixo de 901px, barra no topo com o menu (gaveta atual), a logo, a lupa (abre a busca) e o avatar.
  - [ ] Capturas antes e depois de uma lista (Processos) e do dashboard atual, nas larguras e temas do SDD §10.
- **Testes:**
  - [ ] CAS-01 · menu claro com "Início", pé com tema e conta, sem o topo antigo
  - [ ] CAS-02 · contadores de Processos (12) e Agenda (3)
  - [ ] CAS-03 · Agenda sem contador quando não há vencidos
  - [ ] CAS-04 · busca global pelo cabeçalho e pelo ⌘K
  - [ ] CAS-05 · barra do topo em 834px
  - [ ] CAS-06 · menu no tema escuro e contraste dos pares
  - [ ] CAS-07 · pé do menu recolhido
  - [ ] CAS-08 · analista sem "Usuários"

## INI-02 · Montagem: modelo, regras de encaixe e persistência
- **Tipo:** Feature
- **Depende de:** —
- **SDD:** §4 (S-02, S-03, S-05), §5.2, §5.4, §5.5, §7.6, §10 (`pnpm indicadores`)
- **Descrição:** funções puras da montagem (o catálogo com os tamanhos, os padrões por papel, `cabe`, `primeiroLugarLivre`, `ordemDeLeitura`, `empacotar` e `normalizar`) e a persistência no `localStorage` por usuário, apagada pelo "Resetar demo". Sem tela: é a base da INI-03. Inclui o script `pnpm indicadores`, fonte única dos números do seed para fichas, casos e testes.
- **Critérios de aceite:**
  - [ ] `src/modulos/inicio/montagem.ts` com os tipos da §5.2, o `CATALOGO` (12 quadros, tamanhos do PRD §6.4, `modulos` por quadro) e os `PADROES` dos três papéis do RF-17.
  - [ ] As funções da §5.4, puras e com teste.
  - [ ] `persistencia.ts` com chave `judisys:inicio:<usuarioId>`, valor versionado e lido com zod, e `apagarMontagens()` por prefixo.
  - [ ] `resetarDemo` do `boot.tsx` chama `apagarMontagens()` depois de o reset dar certo.
  - [ ] Sem `localStorage`, a montagem fica em memória, sem erro.
  - [ ] `pnpm indicadores` (`scripts/indicadores.ts`, com tsx): carrega o seed com as datas do relógio fixo (2026-11-07 10:00, o mesmo dos e2e) e imprime os números das funções reais de `indicadores.ts`, por bloco e com rótulo.
- **Testes:**
  - [ ] `cabe`: fora do grid à direita, `x` negativo, sobreposição e o próprio item ignorado
  - [ ] `primeiroLugarLivre`: buraco no meio, primeira linha cheia, sem lugar (vai para a base)
  - [ ] `empacotar`: o padrão do advogado em 2 colunas na ordem da GRD-05
  - [ ] Padrões dos três papéis sem sobreposição e dentro de 4 colunas (INV-01)
  - [ ] MNT-02 · `resetarDemo` apaga todas as chaves `judisys:inicio:` (unitário)
  - [ ] MNT-03 · JSON inválido vira o padrão do papel
  - [ ] MNT-04 · quadro inexistente ignorado
  - [ ] MNT-05 · itens sobrepostos ou fora do grid reposicionados
  - [ ] MNT-06 · sem `localStorage`, gravar e ler em memória
  - [ ] MNT-07 · mudança de versão do seed não apaga a montagem
  - [ ] MNT-08 · montagem com todos os quadros descartados vira o padrão do papel; vazia de propósito continua vazia
  - [ ] `pnpm indicadores` imprime os números do topo e o passivo por classe iguais aos do teste do dashboard (DSH-01)

## INI-03 · Grade montável: prova de conceito, Personalizar e moldura do quadro
- **Tipo:** Feature
- **Depende de:** INI-02, INI-04
- **SDD:** §3 (Q-01), §4 (S-04, S-07, S-10), §5.3, §5.6, §7.3, §7.5
- **Descrição:** primeiro, provar a recusa por cima do `react-grid-layout` 2.3 (Q-01); se não ficar estável, decidir pelo grid próprio na própria tarefa e registrar no SDD. Depois, entregar a grade nas três larguras com quadros provisórios (só moldura e título), o modo Personalizar completo e a moldura comum `Quadro.tsx`, que as tarefas de quadros usam.
- **Critérios de aceite:**
  - [ ] Q-01 decidida e registrada no SDD (§3 resolvida e §4 com a decisão), com o motivo.
  - [ ] Grade de 4, 2 e 1 colunas pela largura do contêiner (§5.3), com largura máxima de 1240px e altura de unidade de 176px.
  - [ ] `noCompactor`: buracos ficam e colisão empurra para baixo.
  - [ ] `Quadro.tsx` com cabeçalho (título, destaque opcional e link), modo de edição (alça e ×, links desligados), estado vazio e a prop `variante`.
  - [ ] Personalizar (só em 4 colunas): faixa com ajuda, Restaurar, Cancelar, Concluir e catálogo com tamanhos; guias das células; rascunho.
  - [ ] Recusa: sombra vermelha cortada na borda, aviso em `role="status"` e volta ao rascunho de antes ao soltar.
  - [ ] Concluir grava pela `persistencia.ts`, e Cancelar descarta.
  - [ ] O início usa a grade com os quadros provisórios no lugar do conteúdo antigo.
- **Testes:**
  - [ ] GRD-01 · padrão do advogado em 1440px
  - [ ] GRD-02 · padrão de cada papel
  - [ ] GRD-03 · 4 colunas a partir de 880px (inclui 1280px com o menu aberto)
  - [ ] GRD-04 · 2 colunas em 879px, empacotado
  - [ ] GRD-05 · ordem do advogado em 2 colunas
  - [ ] GRD-06 · uma coluna no celular
  - [ ] GRD-07 · link do cabeçalho do quadro leva à origem
  - [ ] GRD-08 · buraco continua
  - [ ] GRD-09 · largura máxima de 1240px
  - [ ] PRS-01 · entrar no Personalizar
  - [ ] PRS-02 · arrastar para lugar livre
  - [ ] PRS-03 · arrastar sobre outro empurra para baixo
  - [ ] PRS-04 · recusa com aviso e volta ao soltar
  - [ ] PRS-05 · adicionar pelo catálogo
  - [ ] PRS-06 · adicionar sem lugar livre vai para a base
  - [ ] PRS-07 · × tira o quadro
  - [ ] PRS-08 · Concluir grava e persiste ao recarregar
  - [ ] PRS-09 · Cancelar descarta
  - [ ] PRS-10 · Restaurar e depois Cancelar não muda nada
  - [ ] PRS-11 · tirar todos mostra o aviso
  - [ ] PRS-12 · sem Personalizar em 2 colunas
  - [ ] PRS-13 · contêiner encolhe durante a edição
  - [ ] PRS-14 · ordem de Tab no modo de edição

## INI-04 · Início no lugar do dashboard: módulo e cabeçalho
- **Tipo:** Feature
- **Depende de:** —
- **SDD:** §4 (S-01), §5.1, §5.7 (`resumoDoDia`), §7.2, §10 (renomear)
- **Descrição:** o módulo `dashboard` vira `inicio`, com a rota `/` e a permissão `dashboard` mantidas. O título "Dashboard" dá lugar ao cabeçalho do início (saudação por hora, data por extenso, frase-resumo, busca e o lugar do botão Personalizar). O conteúdo antigo continua abaixo do cabeçalho até a INI-03.
- **Critérios de aceite:**
  - [ ] `src/modulos/dashboard/` movido para `src/modulos/inicio/`, com `Dashboard.tsx` renomeado para `Inicio.tsx` e os imports atualizados.
  - [ ] `resumo.ts` com `saudacao`, `dataPorExtenso` e `resumoDoDia` puros; `resumoDoDia` em `indicadores.ts` ou `resumo.ts`.
  - [ ] `CabecalhoInicio.tsx` conforme o artboard "INI · Desktop claro".
  - [ ] `e2e/apoio.ts` (`entrarComo`, `trocarPara`) e os specs que esperam o título "Dashboard" passam a esperar o `h1` do início.
  - [ ] Telas de aviso e textos que citam "dashboard" (por exemplo, "Voltar ao dashboard") passam a dizer "início".
- **Testes:**
  - [ ] CAB-01 · "Bom dia, Otávio" e "Sábado, 7 de novembro"
  - [ ] CAB-02 · limites de 12h e 18h
  - [ ] CAB-03 · resumo do seed
  - [ ] CAB-04 · só um vencido, no singular
  - [ ] CAB-05 · AGC daqui a 8 dias fica de fora
  - [ ] CAB-06 · nenhuma pendência
  - [ ] CAB-07 · AGC hoje ou amanhã

## INI-05 · Gráficos em SVG
- **Tipo:** Feature
- **Depende de:** —
- **SDD:** §4 (S-06), §2 (C-04), INV-04, INV-05
- **Descrição:** componentes SVG genéricos em `src/ui/graficos/` (`Rosca`, `Colunas`, `Linha`, `Barra100` e `BarrasHorizontais`), com cores por token e texto alternativo obrigatório. O recharts só sai na INI-10, quando o gráfico antigo deixar de ser usado.
- **Critérios de aceite:**
  - [ ] Os cinco componentes, com `descricao` obrigatória (vira `role="img"` e `aria-label`, ou título).
  - [ ] Cores só por tokens (`--cor-grafico-1` a `-4` da INI-01, ou os existentes enquanto a INI-01 não entra, com troca na INI-10), sem degradê.
  - [ ] Sem dependência nova.
  - [ ] Funcionam em qualquer largura (`viewBox` e `preserveAspectRatio` onde couber, traço que não escala).
  - [ ] Uma página de catálogo de componentes, se `src/ui/catalogo` for o padrão do projeto, com os cinco nos dois temas.
- **Testes:**
  - [ ] QDR-17 · cada gráfico expõe o texto alternativo com os valores
  - [ ] Rosca: segmentos somam 100% e valor zero não desenha segmento
  - [ ] Colunas e Linha: escala pelo máximo, série toda zero não quebra
  - [ ] Barra100: percentuais arredondados somam 100

## INI-06 · Quadros 1×1: prazos em aberto, próxima AGC e pedidos de crédito
- **Tipo:** Feature
- **Depende de:** INI-03, INI-05
- **SDD:** §5.7, §7.4, fichas Q-01 a Q-03 do canvas
- **Descrição:** Q-01, Q-02 e Q-03 sobre a moldura `Quadro.tsx`, com os cálculos `prazosPorUrgencia`, `proximaAgc` e `pedidosPorStatus` e as três variantes.
- **Critérios de aceite:**
  - [ ] Três quadros conforme as fichas, nas três variantes e nos dois temas.
  - [ ] Cálculos puros em `indicadores.ts`, com teste.
  - [ ] Links: Agenda (com `?periodo=vencidos` no número de vencidos), a AGC e os pedidos de crédito, respeitando a permissão.
  - [ ] Capturas dos três quadros nos extremos de largura do SDD §5.3.
- **Testes:**
  - [ ] QDR-01 · prazos em aberto do seed
  - [ ] QDR-02 · próxima AGC do seed
  - [ ] QDR-03 · sem AGC agendada
  - [ ] QDR-04 · rosca de pedidos do seed
  - [ ] QDR-15 · estado vazio dos três quadros
  - [ ] QDR-16 · três variantes sem estouro nos extremos de largura

## INI-07 · Quadros 1×2: próximos prazos, calendário, atividade e últimos informes
- **Tipo:** Feature
- **Depende de:** INI-03, INI-05
- **SDD:** §2 (C-05), §5.7, §7.4, fichas Q-04 a Q-07
- **Descrição:** Q-04 a Q-07 sobre a moldura, com `prazosDoMes` e o reaproveitamento de `proximosPrazos` (limite 6), `ultimosInformes` e da atividade recente do dashboard antigo.
- **Critérios de aceite:**
  - [ ] Quatro quadros conforme as fichas, nas três variantes e nos dois temas.
  - [ ] Calendário com células de pelo menos 38px no celular.
  - [ ] Cada item leva ao registro, respeitando a permissão.
  - [ ] Capturas nos extremos de largura.
- **Testes:**
  - [ ] QDR-05 · próximos prazos do seed e o rodapé "+ 13"
  - [ ] QDR-06 · calendário de novembro do seed
  - [ ] QDR-07 · atividade recente
  - [ ] QDR-08 · últimos informes
  - [ ] QDR-15 · estado vazio dos quatro quadros
  - [ ] QDR-16 · variantes sem estouro nos extremos de largura
  - [ ] QDR-18 · alterar um prazo reflete no início

## INI-08 · Quadros 2×1: passivo, informes publicados, prazos cumpridos e passivo por classe
- **Tipo:** Feature
- **Depende de:** INI-03, INI-05
- **SDD:** §2 (C-01), §5.7, §7.4, fichas Q-08 a Q-11
- **Descrição:** Q-08 a Q-11 sobre a moldura, com `passivoPorProcesso`, `informesPorMes`, `cumpridosPorMes` e o `passivoPorClasse` existente (agora com a `Barra100`).
- **Critérios de aceite:**
  - [ ] Quatro quadros conforme as fichas, nas três variantes e nos dois temas.
  - [ ] Informes publicados com 6 meses no celular; prazos cumpridos com o subtítulo "por mês de vencimento" (C-01).
  - [ ] Capturas nos extremos de largura.
  - [ ] Token `--cor-grafico-5` nos dois temas (com par no `tokens.test.ts`) para a 5ª série do Passivo por classe, que hoje usa a cor do trilho e some no tema claro (decidido no lote 1, INI-05).
- **Testes:**
  - [ ] QDR-09 · passivo do seed igual ao total do topo
  - [ ] QDR-10 · informes por mês do seed, 12 e 6 meses
  - [ ] QDR-11 · prazos cumpridos por mês do seed
  - [ ] QDR-12 · passivo por classe do seed (R$ 389,5 mi)
  - [ ] QDR-15 · estado vazio dos quatro quadros
  - [ ] QDR-16 · variantes sem estouro nos extremos de largura

## INI-09 · Quadro Carteira por fase
- **Tipo:** Feature
- **Depende de:** INI-03, INI-05
- **SDD:** §5.7 (`carteiraPorFase`), §7.4, ficha Q-12
- **Descrição:** Q-12 com as três variantes (faixas no desktop, grade 2×2 no tablet e lista no celular). Todas as fases do RF-14 da demo, as vazias apagadas, e cada fase leva a Processos filtrada.
- **Critérios de aceite:**
  - [ ] `carteiraPorFase` pura, com teste, substituindo o `funilPorFase` antigo.
  - [ ] Três variantes conforme a ficha, nos dois temas.
  - [ ] Clique na fase leva a `/processos?tipo=…&fase=…`.
  - [ ] Capturas nos extremos de largura.
- **Testes:**
  - [ ] QDR-13 · contagem por fase do seed
  - [ ] QDR-14 · clique na fase abre Processos filtrada
  - [ ] QDR-15 · estado vazio
  - [ ] QDR-16 · três variantes sem estouro nos extremos de largura

## INI-10 · Fechamento: limpeza, ponta a ponta, capturas e PR para a main
- **Tipo:** Chore
- **Depende de:** INI-06, INI-07, INI-08, INI-09
- **SDD:** §4 (S-12, S-13), §6, §7.6, §10, §12
- **Descrição:** remover o que sobrou do dashboard antigo (inclusive o `GraficoPassivo` e o recharts), trocar cores provisórias pelos tokens de gráfico, rodar os e2e de ponta a ponta do início e da persistência, fazer as capturas finais e a medição do RNF-03, e abrir o PR `ini-redesign` → `main`.
- **Critérios de aceite:**
  - [ ] Nenhum resto do dashboard antigo: sem `GraficoPassivo`, sem `funilPorFase` não usado, recharts fora do `package.json`.
  - [ ] Quadros provisórios da INI-03 removidos; os 12 quadros reais no catálogo.
  - [ ] Primeira carga dentro do RNF-03 da demo (3 s em 4G), medida e registrada no PR. Se passar, o modo de edição vai para `lazy` (S-10).
  - [ ] Capturas finais: início em 1280 (menu aberto), 1440, 834 e 390, nos dois temas; o Personalizar com a recusa; uma lista com a casca nova.
  - [ ] `--cor-grafico-4` com contraste de pelo menos 3:1 sobre a superfície nos dois temas, com o par no `tokens.test.ts` (decidido com o usuário no lote 3; hoje 1,6:1 no claro e 2,1:1 no escuro).
  - [ ] Decidir com o usuário se os quadros 1×1, 1×2 e a Carteira adotam no celular o `ResumoNoCorpo` dos quadros 2×1 (lote 3).
  - [ ] Personalizar só com ícone e tooltip (S-12): `BotaoIcone` com `aria-label` e `title` "Personalizar"; em 1280px com o menu aberto, o botão e a busca ficam na linha da saudação, sem o cabeçalho mudar de altura no modo de edição.
  - [ ] Handoff atualizado e PR `ini-redesign` → `main` aberto, com a seção "Revisão automática".
- **Testes:**
  - [ ] MNT-01 · montagem por usuário (e2e, trocando de papel)
  - [ ] MNT-02 · Resetar demo volta todos ao padrão (e2e)
  - [ ] PRS-04 · recusa no arrasto (e2e com `page.mouse`, se estável; senão, registrar no PR)
  - [ ] PRS-08 · Concluir persiste ao recarregar (e2e)
  - [ ] GRD-02 · padrão de cada papel (e2e)
  - [ ] GRD-06 · celular em uma coluna e sem Personalizar (e2e)
  - [ ] INV-01 a INV-06 conferidas
