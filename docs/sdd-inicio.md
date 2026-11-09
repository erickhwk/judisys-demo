# SDD — Início montável do Judisys

**Status:** em revisão (2026-11-07). As decisões marcadas com **(SDD)** foram tomadas na redação deste documento e entram na aprovação dele.
**Base:** [`prd-inicio.md`](prd-inicio.md) (aprovado em 2026-11-07). Este documento não repete o PRD: fixa a arquitetura, os algoritmos, as invariantes e os casos que guiam os testes e a implementação. Onde diverge do PRD, a seção 2 explica o motivo, e **este documento prevalece**.
**Código:** `INI`. Tarefas em `tasks-inicio.md` (a gerar).
**Referência visual:** canvas https://claude.ai/artifact/GLuzrvfvB5HY7Wy1je9sbr, linhas "INI · Casca e início" e "INI · Fichas" (seção 11).

## Como usar este documento

- Cada caso tem um ID estável (`GRD-03`, `PRS-07`…) e cita o RF do PRD quando houver. Os testes devem citar o ID no nome ou em comentário.
- Formato dos casos: **Dado** · **Quando** · **Então**. Tipo: **F** feliz, **B** borda, **T** triste.
- "Hoje" é o `hoje()` de `src/regras/relogio.ts`. Nos testes, o relógio fixo de `e2e/apoio.ts` (2026-11-07 10:00).
- Coordenadas do grid: `x` é a coluna e `y` a linha, ambas a partir de 0. `w` e `h` são a largura e a altura em unidades.

---

## 1. Fatos verificados

Conferidos em 2026-11-07.

| # | Fato | Onde |
|---|---|---|
| F-01 | O dashboard atual é `src/modulos/dashboard/` (`Dashboard.tsx` com 496 linhas, `indicadores.ts`, `GraficoPassivo.tsx` em recharts). A rota é `/`, e o título "Dashboard" aparece em 17 lugares de `src/` e `e2e/` (8 specs). | `grep` |
| F-02 | O recharts só é usado pelo `GraficoPassivo.tsx`. | `grep -rl recharts src` |
| F-03 | O menu vira gaveta abaixo de 901px (`PONTO_GAVETA = 900`). O Layout tem hoje um topo com a busca global, o `BotaoTema` e o `MenuConta`. | `src/ui/Layout.tsx` |
| F-04 | O tema é preferência do navegador (`localStorage['tema']`) e sobrevive ao reset. O reset (`resetar()` em `carga.ts`) regrava as tabelas do IndexedDB e não toca no `localStorage`, a não ser no marcador de versão. | `src/ui/tema.ts`, `src/dados/carga.ts` |
| F-05 | O IndexedDB tem `VERSAO_SCHEMA = 1`. Acrescentar uma tabela exige subir a versão, o que recarrega o seed de todo visitante (com o aviso de versão). | `src/dados/dexie.ts`, SDD da demo §5.5 |
| F-06 | Todo `criar` e `atualizar` do repositório grava log (INV-01 da demo). | `src/dados/repositorio.ts` |
| F-07 | Prazo tem `status: 'aberto' \| 'cumprido'`, mas não tem data de cumprimento. AGC tem só datas (`dataPrimeira`, `dataSegunda`), sem horário. | `src/dados/schemas.ts` |
| F-08 | A lista de Processos já lê `?fase=` (e `?tipo=`) da URL. A Agenda já lê `?periodo=vencidos` e `?periodo=7-dias`. | `ListaProcessos.tsx`, `Dashboard.tsx` |
| F-09 | `react-grid-layout` 2.3.0 (out/2026) é a versão em TypeScript, com peer `react >= 16.3`. Expõe `useContainerWidth`, `gridConfig` (`cols`, `rowHeight`, `margin`), `dragConfig` (`handle`, `bounded`, `threshold`), `compactor` (`verticalCompactor`, `noCompactor`, `getCompactor`) e `onDragStart`/`onDrag`/`onDragStop`. Ao arrastar, o `x` é limitado a `cols - w`: o item nunca sai do grid sozinho. | README do pacote |
| F-10 | Seed com o relógio de 2026-11-07: 19 prazos em aberto (3 vencidos, 1 hoje), 114 cumpridos; 50 pedidos (8 pendentes, 25 acolhidos, 17 rejeitados); 44 informes nos últimos 12 meses; passivo por classe das RJ ativas de R$ 389,5 mi. | `public/seed.json` |

---

## 2. Correções e complementos ao PRD

| # | PRD diz | Este documento fixa | Por quê |
|---|---|---|---|
| C-01 | Q-10: prazos cumpridos por mês. | Os cumpridos se contam pelo **mês do vencimento**. O subtítulo do quadro diz "por mês de vencimento". | F-07: não há data de cumprimento. |
| C-02 | RNF-04: capturas em 1440, 834 e 390px. | Capturas também em **1280px com o menu aberto**, a largura em que a unidade do desktop fica mais estreita (seção 5.3). | Notebook comum; é onde o desenho mais aperta. |
| C-03 | RF-24: montagem guardada "junto com os dados da demo". | Guardada no `localStorage`, numa chave por usuário, apagada pelo reset (seção 5.5). | F-05 e F-06: no IndexedDB, seria preciso subir a versão do schema (recarregando o seed de todos) e contornar o log do repositório. O PRD exige só o comportamento: guardar por usuário e apagar no reset. |
| C-04 | RF-16: gráficos em cores dos tokens. | Todos os gráficos passam a ser SVG próprio, e o **recharts sai** das dependências. | F-02. Menos bundle (RNF-03) e controle total das cores no guarda AJ-17. |
| C-05 | Q-04: seis prazos. | O `LIMITE_PRAZOS` do quadro passa a 6 (era 8 no dashboard). | Tamanho 1×2 aprovado. |
| C-06 | RF-12: limites de largura no SDD. | Os limites são medidos pela **largura do contêiner do grid**, não da janela (seção 5.3). | O menu aberto ou recolhido muda a área útil. |

---

## 3. Questões abertas

Nenhuma em aberto.

**Q-01. Recusa por cima do react-grid-layout.** *Resolvida na INI-03 (2026-11-08): grid próprio, ver S-11.* A biblioteca limita o `x` em vez de recusar (F-09). A recusa (RF-19) vem da posição do ponteiro (seção 5.6). A primeira tarefa de grid é uma prova de conceito: se a recusa não ficar estável, a alternativa é um grid próprio (CSS grid com arrastar por `pointer events`), avaliada na mesma tarefa.

A prova de conceito montou o `react-grid-layout` 2.3.0 com `noCompactor` e a recusa da seção 5.6 por cima, e rodou o arrasto com `page.mouse` (10 passos) no padrão do advogado em 1440px:

- **Recusa (PRS-04):** funcionou, mas só remontando o grid (`key` novo) no `onDragStop`. A biblioteca guarda o layout limitado no estado interno e não relê a prop `layout` se ela não mudou.
- **Arrastar para lugar livre (PRS-02):** falhou. Com `noCompactor`, cada quadro por onde o ponteiro passa é empurrado para baixo e não volta. Levar Prazos de (0, 0) para (0, 4) deixou Informes publicados, Passivo e Carteira empurrados para a linha 5, **um sobre o outro** (quebra o INV-01).
- **Empurrar (PRS-03):** funcionou no caso simples.

---

## 4. Decisões de implementação (SDD)

| # | Decisão |
|---|---|
| S-01 | O módulo `src/modulos/dashboard/` vira `src/modulos/inicio/`. A rota continua `/`, e a permissão continua `dashboard` em `permissoes.ts`, para não mexer na tabela do RF-39 da demo. |
| S-02 | A montagem salva guarda só `quadro`, `x` e `y`. A largura e a altura vêm sempre do catálogo, então mudar o tamanho de um quadro no código não deixa montagem velha quebrada. |
| S-03 | Tablet e celular não guardam montagem: são derivados da montagem do desktop a cada render (função pura, seção 5.4). |
| S-04 | O grid usa `noCompactor`: os quadros não sobem sozinhos para tapar buracos. O espaço vazio deixado de propósito fica (D-07). Colisão empurra para baixo, que é o comportamento da biblioteca sem `preventCollision`. |
| S-05 | O catálogo de cada papel é o conjunto dos quadros que o papel pode ler. Hoje os três papéis leem tudo o que os 12 quadros usam, mas o filtro existe para não quebrar se o RF-39 mudar. |
| S-06 | Os gráficos são componentes SVG genéricos em `src/ui/graficos/`: `Rosca`, `Colunas`, `Linha`, `Barra100` e `BarrasHorizontais`. Cores só por tokens; texto alternativo obrigatório na prop `descricao`. |
| S-07 | Cada quadro é um componente que recebe `variante: 'desktop' \| 'tablet' \| 'celular'`. A moldura comum (`Quadro.tsx`) cuida do cabeçalho, do link, do modo de edição e do estado vazio. |
| S-08 | A busca global sai do topo do Layout e entra no `CabecalhoPagina`, à direita das ações da página. No tablet e no celular, ela vira o botão de lupa da barra do topo, que abre a mesma busca. |
| S-09 | Tokens novos em `tokens.css`, nos dois temas: `--cor-menu-fundo` (deixa de ser sempre escuro), `--cor-menu-ativo`, `--cor-menu-icone-ativo`, `--cor-grafico-1` a `--cor-grafico-4`, `--cor-quadro-guia` e `--cor-quadro-recusa`. Os tokens "sempre escuros" do menu saem. A faixa da demo e o painel da entrada continuam sempre escuros. |
| S-10 | O `react-grid-layout` só é importado pelo módulo do início. Como o início é a primeira tela depois da entrada, o modo de edição (catálogo e handlers) pode ficar num `lazy` se a medição do RNF-03 pedir. |
| S-11 | **Grid próprio no lugar do `react-grid-layout` (Q-01, INI-03).** CSS grid com a posição explícita de cada quadro (`grid-column` e `grid-row`), então os buracos ficam sem compactador (S-04). O arrasto usa `pointer events` na alça. A cada movimento, a prévia é calculada **a partir do rascunho de antes do arrasto**: o quadro vai para a célula do ponteiro, e quem ficaria por baixo desce em cascata (`soltar` em `arrasto.ts`). Assim, o caminho do ponteiro não deixa quadros empurrados. A recusa e a coluna pretendida seguem a seção 5.6. A largura do contêiner vem de um `ResizeObserver` próprio (`useLargura`), no lugar do `useContainerWidth`. Sem a biblioteca, o bundle não cresce, e o `lazy` do S-10 não é preciso. Onde este SDD cita a biblioteca (F-09, S-04, S-10, seções 5.1, 5.3 e 5.6), vale este grid. Motivo: na prova de conceito, a biblioteca com `noCompactor` acumulou os empurrões do caminho e chegou a sobrepor quadros (Q-01). |
| S-12 | **Personalizar só com ícone (INI-10, decidido com o usuário em 2026-11-08).** O botão Personalizar do `CabecalhoInicio` é um `BotaoIcone` (ícone `LayoutDashboard`) com `aria-label` e tooltip (`title`) "Personalizar". Motivo: preferência visual do usuário; de quebra, em 1280px com o menu aberto o botão e a busca cabem na linha da saudação, e o cabeçalho não muda de altura ao entrar no modo de edição. |
| S-13 | **`ResumoNoCorpo` só nos quadros com destaque (INI-10, decidido com o usuário em 2026-11-08).** No celular, o quadro que mostra um destaque no cabeçalho (os 2×1: Passivo, Informes publicados, Prazos cumpridos e Passivo por classe) passa esse número para o corpo, porque em 288px o título, o destaque e o link não cabem numa linha. Os quadros 1×1, os 1×2 e a Carteira não têm destaque no cabeçalho e ficam como estão: uma frase-resumo neles seria conteúdo novo, fora do canvas. |

---

## 5. Arquitetura

### 5.1 Pastas

```
src/modulos/inicio/
  Inicio.tsx               tela: cabeçalho + grade
  CabecalhoInicio.tsx      saudação, data, resumo, busca, Personalizar
  resumo.ts                saudacao(hora), dataPorExtenso(data), resumoDoDia(...)
  montagem.ts              tipos, CATALOGO, PADROES, cabe(), primeiroLugarLivre(), empacotar(), normalizar()
  persistencia.ts          lerMontagem(), gravarMontagem(), apagarMontagens()
  GradeMontavel.tsx        react-grid-layout, modo de edição, sombra e recusa
  CatalogoEdicao.tsx       faixa do Personalizar
  indicadores.ts           (vindo do dashboard) + os cálculos novos (5.7)
  quadros/
    Quadro.tsx             moldura comum
    PrazosEmAberto.tsx … CarteiraPorFase.tsx  (um por quadro, Q-01 a Q-12)
src/ui/graficos/           Rosca, Colunas, Linha, Barra100, BarrasHorizontais
```

### 5.2 Modelo da montagem

```ts
type IdQuadro =
  | 'prazos' | 'agc' | 'pedidos' | 'proximos' | 'calendario' | 'atividade'
  | 'informes' | 'passivo' | 'publicados' | 'cumpridos' | 'classes' | 'carteira'

interface DefinicaoQuadro {
  id: IdQuadro
  titulo: string
  w: 1 | 2 | 3 | 4          // desktop
  h: 1 | 2                  // desktop e tablet
  wTablet: 1 | 2            // min(w, 2), salvo exceção
  hTablet: 1 | 2            // carteira: 2
  modulos: Modulo[]         // precisa ler todos (S-05)
}

interface ItemMontagem { quadro: IdQuadro; x: number; y: number }
type Montagem = ItemMontagem[]
```

`CATALOGO` tem os 12 quadros com os tamanhos do PRD §6.4. `PADROES: Record<Papel, Montagem>` tem as três montagens do RF-17, com coordenadas (`x` de 0 a 3).

### 5.3 Larguras (RF-09 a RF-12)

Medidas pela largura do contêiner do grid (`useContainerWidth`), com vão de 16px:

| Contêiner | Colunas | Unidade | Personalizar |
|---|---|---|---|
| ≥ 880px | 4 | a partir de 208px (cerca de 813px no ultrawide) | sim |
| 600 a 879px | 2 | 292 a 432px | não |
| < 600px | 1 (lista, sem a biblioteca) | largura toda | não |

- O grid não tem largura máxima: ocupa a coluna do conteúdo toda, em qualquer tela, e as ações do cabeçalho do início ficam na borda direita da grade. **Revisto na AJ-21 (2026-11-08):** o teto era 1240px (unidade de 298px), e num monitor de 2560px a grade ocupava metade da coluna, com a busca e o Personalizar soltos na borda da janela. O usuário quis os quadros ocupando a tela; 2200px preenche um monitor de 2560px com o menu aberto; com o menu recolhido, ou num ultrawide, sobra vazio à direita, e o cabeçalho continua alinhado à grade. **Revisto na AJ-22 (2026-11-08):** o teto deixou de ser só do início e passou a valer para o conteúdo de todas as telas, decidido com o usuário: o `main` do Layout (`.conteudo`) para em 2200px, sem contar o padding, alinhado à esquerda, e num ultrawide as ações do `CabecalhoPagina` ficam na borda direita do conteúdo. O valor mora num lugar só, `LARGURA_CONTEUDO` (`src/ui/larguras.ts`), aplicado como estilo no `main` do Layout; o `LARGURA_MAXIMA` de `arrasto.ts`, que dá a unidade do arrasto, é essa mesma constante, então a grade e as células não divergem. A tela do início não tem mais teto próprio. Até 2560px com o menu aberto nada muda: a coluna não chega a 2200px de conteúdo. **Revisto na AJ-26 (2026-11-09):** num monitor ultrawide (3440px), o teto de 2200px deixava o conteúdo em cerca de 2/3 da tela. Decidido com o usuário: sem teto em nenhuma tela, inclusive no início. O `main` do Layout ocupa a coluna toda, as ações do `CabecalhoPagina` e a marca do rodapé ficam na borda direita da coluna, e `LARGURA_CONTEUDO` e `LARGURA_MAXIMA` deixaram de existir: a unidade é o contêiner menos os vãos, dividido pelas colunas. Os quadros do início ficam mais largos, com a mesma altura de unidade (176px); o maior contêiner coberto é o de 3300px (3440px com o menu recolhido, unidade de cerca de 813px). Até 2560px com o menu aberto nada muda.
- Altura da unidade: 176px, com 16px de vão, nas faixas de 4 e de 2 colunas.
- **Limite das 4 colunas em 880px (decidido com o usuário na INI-03, 2026-11-08):** o SDD previa 976px, contando com o menu e as margens do canvas. Com o menu real de 280px e 44px de margem, 1280px com o menu aberto deixa cerca de 912px para a grade (menos com a barra de rolagem), e o notebook ficaria no desenho de tablet e sem o Personalizar. Baixar o limite para 880px mantém as 4 colunas ali.
- **Polidez (RNF-04):** cada variante de desktop precisa ficar correta com unidade de 208px até cerca de 813px (contêiner de 3300px, o ultrawide de 3440px com o menu recolhido; era 538px até a AJ-26). Cada variante de tablet, de 292 a 432px. Cada variante de celular, de 288 a 599px. As capturas de aceite cobrem os extremos: 1280px com o menu aberto (unidade de cerca de 216px), 1440px, 834px e 390px.

### 5.4 Funções puras de `montagem.ts`

- **`cabe(item, x, y, montagem, cols)`:** retorna `false` se `x < 0`, se `x + w > cols` ou se a área se sobrepõe a outro item da montagem (o próprio item é ignorado).
- **`primeiroLugarLivre(quadro, montagem, cols)`:** percorre as linhas de 0 até a base da montagem e, em cada linha, as colunas de 0 a `cols - w`. Devolve a primeira posição em que `cabe`. Se nenhuma servir, devolve `{ x: 0, y: base }`.
- **`ordemDeLeitura(montagem)`:** ordena por `y` e depois por `x`.
- **`empacotar(montagem, cols, tamanho)`:** percorre a montagem em ordem de leitura e põe cada quadro, com o tamanho da largura de destino, no `primeiroLugarLivre` da montagem que vai se formando. Gera a montagem de tablet (2 colunas) sem buracos que não sejam inevitáveis. O celular usa só a `ordemDeLeitura`.
- **`normalizar(montagemSalva, papel)`:** descarta itens de quadro inexistente, repetido ou sem permissão. Itens fora do grid (`x + w > 4`) ou que se sobrepõem são reposicionados pelo `primeiroLugarLivre` na ordem de leitura, para o usuário não perder o quadro (MNT-05). Se todos os itens de uma montagem salva forem descartados, vale o padrão do papel; a montagem salva vazia de propósito (PRS-11) continua vazia (MNT-08). Montagem inválida (JSON quebrado ou de outro formato) é tratada como ausente, e vale o padrão do papel.

### 5.5 Persistência (RF-24 a RF-26, C-03)

- **Chave:** `judisys:inicio:<usuarioId>`. **Valor:** `{"versao":1,"itens":[{"quadro":"prazos","x":0,"y":0},…]}`. Lido com zod; versão desconhecida conta como ausente.
- **`gravarMontagem`** só é chamado no Concluir (RF-22).
- **`apagarMontagens()`** remove toda chave com o prefixo `judisys:inicio:`. É chamado pelo `resetarDemo` do `boot.tsx`, depois de o `resetar()` dar certo.
- **Sem `localStorage`** (CAR-12 da demo), a montagem vive só na memória da aba: o Concluir vale até recarregar, sem erro na tela.

### 5.6 Grade montável e recusa (RF-18 a RF-23)

- **Grid:** `ReactGridLayout` com `gridConfig = { cols, rowHeight: 176, margin: [16, 16], containerPadding: [0, 0] }`, `compactor = noCompactor` (S-04) e `dragConfig = { enabled: editando, handle: '[data-alca]', threshold: 4 }`. Sem redimensionar.
- **Rascunho:** ao entrar no modo, a montagem atual é copiada para um rascunho. Arrastar, tirar, adicionar e restaurar mexem só no rascunho. O Concluir grava o rascunho e o Cancelar o descarta.
- **Recusa:**
  1. No `onDragStart`, guardar o rascunho de antes e o deslocamento do ponteiro dentro do quadro.
  2. No `onDrag`, calcular a coluna pretendida pelo ponteiro: `round((clienteX − deslocamento − esquerdaDoGrid) / (unidade + 16))`.
  3. Se `colunaPretendida + w > cols`, ou se for menor que 0, ligar `recusa = { x: colunaPretendida, y, w, h }`. Esconder a sombra da biblioteca e mostrar a sombra própria, vermelha (`--cor-quadro-recusa`), com o aviso "Não cabe aqui: este quadro ocupa N colunas" em `role="status"`. A sombra é cortada na borda do grid. Se nada dela cai no grid (quadro todo fora), aparece uma faixa vermelha estreita na borda por onde ele saiu, com o aviso visível ao lado (decidido com o usuário na INI-03).
  4. No `onDragStop` com recusa, voltar ao rascunho de antes. Sem recusa, aceitar o layout da biblioteca.
- **Guias:** no modo de edição, o fundo do grid desenha as células (tracejado `--cor-quadro-guia`) até a base da montagem mais uma linha.

### 5.7 Cálculos novos de `indicadores.ts`

Todos puros, com `hoje` por parâmetro:

- **`prazosPorUrgencia(prazos, hoje)`:** abertos, contados em vencidos, hoje, até 7 dias, de 8 a 30 dias e depois. Para Q-01.
- **`pedidosPorStatus(pedidos)`:** pendentes, acolhidos e rejeitados, e o processo com mais pendentes. Para Q-03.
- **`proximaAgc(agcs, hoje)`:** a primeira AGC `agendada` com `dataPrimeira >= hoje`. Para Q-02.
- **`prazosDoMes(prazos, agcs, hoje)`:** mapa dia → tipo (vencido, hoje, prazo, AGC) do mês de `hoje`. Para Q-05.
- **`passivoPorProcesso(processos, credores)`:** os quatro maiores processos ativos pela relação do AJ e a contagem dos ativos sem relação. O total é a soma da relação do AJ dos credores dos processos ativos. Para Q-08.
- **`informesPorMes(informes, hoje)`:** os 12 meses até o mês de `hoje`, inclusive. Para Q-09.
- **`cumpridosPorMes(prazos, hoje)`:** os 12 meses fechados antes do mês de `hoje`, pelo vencimento (C-01). Para Q-10.
- **`carteiraPorFase(processos)`:** contagem por fase, para todas as fases de cada tipo do RF-14 da demo, sem as finais alternativas. Para Q-12.
- **`resumoDoDia(prazos, agcs, processos, hoje)`:** vencidos, de hoje e a AGC dos próximos 7 dias. Para o RF-07.

### 5.8 Casca (RF-01 a RF-04)

- **`MenuLateral`:** passa a usar `--cor-menu-fundo`, e o item ativo usa `--cor-menu-ativo` e o ícone `--cor-menu-icone-ativo`.
  - Ganha os contadores: total de processos e vencidos na Agenda, com as mesmas consultas do React Query.
  - O pé do menu tem o interruptor de tema (o comportamento do `BotaoTema`, agora como `role="switch"`) e o botão da conta (abre o `MenuConta` atual, para cima). Recolhido, o pé mostra só os ícones.
- **Layout:** o topo do desktop sai. Abaixo de 901px fica uma barra com o botão do menu, a logo, a lupa da busca e o avatar.
- **`CabecalhoPagina`:** recebe a `BuscaGlobal` à direita (S-08).
- O rótulo do item muda para "Início", e o ícone continua o `Gauge`.

---

## 6. Invariantes

| ID | Invariante |
|---|---|
| INV-01 | Nenhuma montagem exibida tem item fora do grid, sobreposto, repetido ou de quadro que o papel não lê (vale depois do `normalizar`). |
| INV-02 | Largura e altura de um quadro sempre vêm do `CATALOGO`, nunca do que está salvo (S-02). |
| INV-03 | Nada é gravado fora do Concluir. |
| INV-04 | Toda cor de quadro, gráfico e casca vem de `tokens.css`, sem degradê (guarda `cores.test.ts`). |
| INV-05 | Todo gráfico tem texto alternativo com os valores. |
| INV-06 | Abaixo de 4 colunas não há Personalizar, alça nem arrastar. |

---

## 7. Casos

### 7.1 Casca — CAS

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| CAS-01 | F | qualquer papel, desktop | abrir qualquer página interna | Menu claro com "Início" no lugar de "Dashboard"; pé com o tema e a conta; sem o topo antigo (RF-01). |
| CAS-02 | F | seed | ver o menu | "Processos" mostra 12; "Agenda" mostra 3 em vermelho (RF-01). |
| CAS-03 | B | nenhum prazo vencido | ver o menu | Agenda sem contador. |
| CAS-04 | F | página com `CabecalhoPagina` | ⌘K ou clique na busca | A busca global abre como hoje (RF-02). |
| CAS-05 | F | 834px | abrir | Barra do topo com o menu, a logo, a lupa e o avatar; o menu abre a gaveta atual (RF-03). |
| CAS-06 | F | tema escuro | abrir | Menu escuro um tom acima do fundo; contraste dos pares conferido no `tokens.test.ts` (RF-04). |
| CAS-07 | F | menu recolhido | ver o pé | Só os ícones do tema e da conta, com `aria-label`. |
| CAS-08 | F | analista | ver o menu | Sem "Usuários", como hoje (RF-40 da demo). |

### 7.2 Cabeçalho do início — CAB

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| CAB-01 | F | 10h, Otávio | abrir o início | "Bom dia, Otávio" e "Sábado, 7 de novembro" (RF-05, RF-06). |
| CAB-02 | B | 12h00 e 18h00 | abrir | "Boa tarde" a partir de 12h; "Boa noite" a partir de 18h. |
| CAB-03 | F | seed | abrir | "3 prazos vencidos, 1 vence hoje e a AGC de Grupo Lontra Azul é na sexta." (RF-07). |
| CAB-04 | B | 1 vencido, nenhum hoje, sem AGC em 7 dias | abrir | "1 prazo vencido." (singular, sem as outras partes). |
| CAB-05 | B | AGC daqui a 8 dias | abrir | O resumo não cita a AGC. |
| CAB-06 | B | nada vencido, nada hoje, sem AGC | abrir | "Nenhuma pendência para hoje." |
| CAB-07 | B | AGC amanhã ou hoje | abrir | "…a AGC de X é amanhã" ou "…é hoje". |

### 7.3 Grid — GRD

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| GRD-01 | F | advogado sem montagem salva | abrir em 1440px | Os oito quadros do padrão do advogado nas posições do RF-17. |
| GRD-02 | F | cada papel | abrir | O padrão do papel (RF-17). |
| GRD-03 | F | contêiner de 880px (e 1280px com o menu aberto) | abrir | 4 colunas (5.3). |
| GRD-04 | B | contêiner de 879px | abrir | 2 colunas, montagem empacotada em ordem de leitura (RF-10). |
| GRD-05 | F | padrão do advogado | 2 colunas | Ordem: Prazos, AGC, Próximos, Calendário, Informes publicados, Passivo, Passivo por classe, Carteira (2×2). |
| GRD-06 | F | 390px | abrir | Uma coluna na mesma ordem, variantes de celular, altura livre (RF-11). |
| GRD-07 | F | qualquer quadro | clicar no link do cabeçalho | Vai à tela de origem (RF-13). |
| GRD-08 | B | montagem com buraco | abrir | O buraco continua (S-04). |
| GRD-09 | B | janela de 3440px, com o menu aberto e recolhido | abrir | Grid na coluna toda, sem teto; unidade de (contêiner − 48) / 4, altura de 176px; busca na borda direita da grade (5.3, AJ-21; sem os 2200px desde a AJ-26). |

### 7.4 Quadros — QDR

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| QDR-01 | F | seed | Q-01 | 19 em aberto, 3 vencidos, 1 hoje; barra com 3, 1, 1, 6 e 8 (faixas do §5.7; corrigido com o usuário na INI-06). |
| QDR-02 | F | seed | Q-02 | Grupo Lontra Azul, 13/11, "em 6 dias", 2ª convocação 20/11. |
| QDR-03 | B | sem AGC agendada | Q-02 | "Nenhuma AGC agendada" e o link para a agenda (RF-15). |
| QDR-04 | F | seed | Q-03 | Rosca 8, 25, 17 e "8 pendentes" no centro; nota do processo com mais pendentes. |
| QDR-05 | F | seed | Q-04 | Seis prazos, vencidos primeiro, com data relativa; rodapé "+ 13 prazos na agenda" (C-05). |
| QDR-06 | F | seed | Q-05 | Novembro de 2026 com 5 vencido, 7 hoje, 12, 15 e 27 prazo, 13 e 20 AGC. |
| QDR-07 | F | seed | Q-06 | Seis ações mais recentes, com quem, o quê e onde, cada uma levando ao registro. |
| QDR-08 | F | seed | Q-07 | Cinco informes, do mais novo ao mais antigo. |
| QDR-09 | F | seed | Q-08 | Total igual à soma da relação do AJ dos ativos; quatro barras; "4 processos sem relação do AJ". |
| QDR-10 | F | seed | Q-09 | 12 colunas com 1, 5, 3, 1, 3, 0, 3, 5, 5, 8, 8, 1 (dez/25 a nov/26); no celular, as 6 últimas. |
| QDR-11 | F | seed | Q-10 | 12 pontos (nov/25 a out/26): 3, 2, 2, 3, 5, 2, 1, 2, 5, 4, 6, 5; recorde em set. |
| QDR-12 | F | seed | Q-11 | Cinco classes somando R$ 389,5 mi, com os percentuais 56, 20, 13, 7 e 4 (maiores restos, somando 100, como a `Barra100`; corrigido com o usuário na INI-08). |
| QDR-13 | F | seed | Q-12 | RJ: Pedido 1, Deferido 1, Edital 1, Plano 1, Fiscalização 1, Encerrada 1, as demais 0 apagadas; Falência: Decretada 1, Arrecadação 1, Realização 1, Encerrada 1. |
| QDR-14 | F | Q-12 | clicar numa fase | `/processos?tipo=…&fase=…` (F-08). |
| QDR-15 | B | qualquer quadro sem dados | abrir | Estado vazio próprio (RF-15). |
| QDR-16 | F | cada quadro | renderizar as três variantes | Sem estouro de texto nos extremos de largura da seção 5.3 (teste de componente com larguras fixas e capturas). |
| QDR-17 | F | cada gráfico | ler com leitor de tela | Texto alternativo com os valores (INV-05). |
| QDR-18 | F | alterar um prazo | voltar ao início | Os quadros refletem a mudança (T-22 da demo). |

### 7.5 Personalizar — PRS

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| PRS-01 | F | 4 colunas | clicar em Personalizar | Faixa com ajuda, Restaurar, Cancelar, Concluir e catálogo com tamanhos; guias; alça e × em cada quadro; links desligados (RF-18). |
| PRS-02 | F | edição | arrastar Prazos para (2, 3) livre | O quadro vai para lá; nada mais se move. |
| PRS-03 | F | edição | arrastar sobre outro quadro | O outro desce (S-04). |
| PRS-04 | T | edição | arrastar Passivo (2×1) com o ponteiro na coluna 4 | Sombra vermelha cortada na borda e o aviso "Não cabe aqui: este quadro ocupa 2 colunas"; ao soltar, o rascunho volta ao de antes do arrasto (RF-19). |
| PRS-05 | F | edição, Pedidos fora | clicar em "Pedidos de crédito" no catálogo | Entra no primeiro lugar livre e sai do catálogo (RF-20). |
| PRS-06 | B | edição, sem lugar livre | adicionar | Entra em `(0, base)`. |
| PRS-07 | F | edição | clicar no × de um quadro | O quadro sai e volta ao catálogo (RF-21). |
| PRS-08 | F | rascunho alterado | Concluir | Grava; recarregar mostra a montagem nova (RF-22). |
| PRS-09 | F | rascunho alterado | Cancelar | Volta à montagem de antes, e nada é gravado (INV-03). |
| PRS-10 | F | montagem salva | Restaurar padrão e depois Cancelar | Nada muda. Restaurar e depois Concluir grava o padrão. |
| PRS-11 | B | edição | tirar todos | Aviso com o botão Restaurar padrão (RF-23); Concluir grava a montagem vazia, e o início mostra o mesmo aviso fora do modo. |
| PRS-12 | B | 2 colunas | abrir | Sem botão Personalizar (INV-06). |
| PRS-13 | B | em edição | o contêiner cai para menos de 880px | Sai do modo descartando o rascunho, com o aviso "Personalizar só em telas largas". |
| PRS-14 | F | edição | teclado | Tab passa por Restaurar, Cancelar, Concluir, catálogo e os ×; a alça não recebe foco (RNF-01, D-04). |

### 7.6 Persistência — MNT

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| MNT-01 | F | Otávio salvou | entrar como Helena | O padrão da AJ; ao voltar para Otávio, a montagem dele (RF-24). |
| MNT-02 | F | montagens salvas | Resetar demo | Todas apagadas; cada usuário vê o padrão (RF-25). |
| MNT-03 | T | JSON inválido na chave | abrir | O padrão do papel, sem erro na tela (RF-26). |
| MNT-04 | B | quadro inexistente na montagem salva | abrir | Ignorado (RF-26). |
| MNT-05 | B | itens sobrepostos ou fora do grid | abrir | `normalizar` reposiciona (INV-01). |
| MNT-06 | B | sem `localStorage` | Concluir | Vale até recarregar, sem erro (5.5). |
| MNT-07 | B | mudança de versão do seed | abrir | A montagem continua (só o reset apaga). |
| MNT-08 | B | montagem salva com todos os quadros descartados | abrir | O padrão do papel; salva vazia de propósito continua vazia. |

---

## 8. Fora de escopo

O mesmo do PRD §9, mais:

- grid próprio no lugar do react-grid-layout, a não ser que a prova de conceito (Q-01) mande;
- animação de entrada dos quadros;
- montagem por largura (S-03).

---

## 9. Matriz de rastreabilidade

| RF | Casos |
|---|---|
| RF-01 | CAS-01, CAS-02, CAS-03, CAS-07, CAS-08 |
| RF-02 | CAS-04 |
| RF-03 | CAS-05 |
| RF-04 | CAS-06 |
| RF-05, RF-06 | CAB-01, CAB-02 |
| RF-07 | CAB-03 a CAB-07 |
| RF-08 | PRS-01, PRS-12 |
| RF-09 a RF-12 | GRD-01 a GRD-06, GRD-08, GRD-09 |
| RF-13 | GRD-07, QDR-14 |
| RF-14 | QDR-10, QDR-16 |
| RF-15 | QDR-03, QDR-15 |
| RF-16 | QDR-17 |
| RF-17 | GRD-01, GRD-02 |
| RF-18 a RF-23 | PRS-01 a PRS-14 |
| RF-24 a RF-26 | MNT-01 a MNT-08 |
| Q-01 a Q-12 | QDR-01 a QDR-13 |

---

## 10. Notas de testabilidade

- **Funções puras:** `montagem.ts`, `resumo.ts`, `persistencia.ts` (com um `Storage` falso) e os cálculos novos de `indicadores.ts` têm teste unitário com casos tirados das tabelas acima.
- **Números do seed:** `pnpm indicadores` (`scripts/indicadores.ts`) roda as funções de `indicadores.ts` sobre o seed com o relógio fixo e imprime os resultados. É a fonte única dos números dos casos QDR e das fichas: nada de cálculo avulso fora do código do app.
- **Grade:** em jsdom não há layout. Os testes de componente da grade injetam a largura (prop `larguraForcada`, só para teste) em vez de medir.
- **Recusa:** a regra (`cabe`, coluna pretendida) tem teste unitário. O e2e do arrasto usa `page.mouse` com passos (`steps: 10`) e espera a tela parar de carregar antes de começar (pegadinha do hover registrada no handoff).
- **Capturas:** `comparacao-visual` em 1280 (menu aberto), 1440, 834 e 390, nos dois temas, para o início e para uma página de lista (a casca), mais o modo Personalizar com a recusa.
- **Renomear:** os e2e que esperam o título "Dashboard" (F-01) passam a usar a saudação. O helper `entrarComo` de `e2e/apoio.ts` passa a esperar o `h1` do início.

---

## 11. Referência visual

Canvas https://claude.ai/artifact/GLuzrvfvB5HY7Wy1je9sbr, aprovado em 2026-11-07:

| Artboard | O que fixa |
|---|---|
| INI · Desktop claro (advogado) | Casca, cabeçalho e padrão do advogado em 4 colunas |
| INI · Desktop escuro | Tokens escuros da casca e dos quadros |
| INI · Personalizar, arrastando para onde não cabe | Faixa do modo, guias, origem vazia, sombra de recusa |
| INI · Tablet (2 unidades) | Barra do topo, empacotamento, Carteira 2×2 |
| INI · Celular claro e escuro | Faixa enxuta, pilha e variantes de celular |
| INI · Fichas dos 12 quadros | Conteúdo e variantes de cada quadro |

Os valores de cor do canvas são aproximações dos tokens. Na implementação, valem os tokens (S-09). O "10h" das convocações no canvas é ilustrativo (PRD §9).

---

## 12. Ordem sugerida das tarefas

1. Tokens e casca: S-09, seção 5.8, CAS.
2. Montagem pura e persistência: seções 5.2, 5.4 e 5.5, MNT.
3. Prova de conceito da grade, com quadros provisórios: seção 5.6, Q-01, GRD, PRS.
4. Cabeçalho e renomear para Início: CAB e e2e.
5. Gráficos SVG e saída do recharts: S-06, C-04.
6. Quadros em lotes de tamanho: 1×1, 1×2, 2×1 e a Carteira, cada lote com as suas capturas.
7. e2e de ponta a ponta e capturas finais.

As tarefas 1, 2 e 5 são independentes e podem rodar em paralelo. A 3 depende da 2. A 6 depende da 3 e da 5.
