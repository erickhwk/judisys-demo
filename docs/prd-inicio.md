# PRD — Início montável do Judisys

**Status:** em revisão (2026-11-07)
**Código do pedido:** `INI` (cards e tarefas `INI-NN`, board Trello "Judisys")
**Repositório alvo:** `judisys-demo` (`~/code/judisys`)
**Referência visual (aprovada em 2026-11-07):** canvas "Judisys — propostas do dashboard", https://claude.ai/artifact/GLuzrvfvB5HY7Wy1je9sbr. Valem as linhas "INI · Casca e início" e "INI · Fichas"; as linhas de cima (propostas A, B, C e A2) são histórico.
**Decisões:** fechadas no grilling de 2026-11-07 (Q1 a Q22), resumidas na seção 4.

---

## 1. Problema

O interior da demo parece amador, e o dashboard, que é a primeira tela depois da entrada, é pouco impressionante:

- os números do topo aparecem soltos, sem comparação, tendência ou proporção, então a tela não tem cara de dashboard;
- tudo é grande e arredondado (título de 34px, número de 48px, cartão dentro de cartão), e cabe pouca informação;
- o dourado está em todo lugar (item ativo, ícones, selos), e nada se destaca;
- a entrada tem uma ideia visual forte, mas o interior não herdou nada dela.

A demo é vitrine comercial, e a tela inicial é a que vende o produto.

## 2. Objetivo

1. Trocar o dashboard por um **início** na direção "Pauta do dia": tela clara e sóbria, focada no que vence, com métricas e gráficos de tipos variados.
2. Deixar o início **montável**: cada informação é um quadro, num mosaico de tamanho fixo que o usuário reorganiza.
3. Dar à **casca da área logada** (menu lateral e cabeçalho), em todas as páginas, o mesmo tratamento visual.
4. Manter a polidez visual em qualquer largura: cada quadro tem um desenho próprio para desktop, tablet e celular, sem ser espremido.

### Não-objetivos

- Tornar montável outra página que não seja o início.
- Redesenhar as tabelas, os formulários e as demais telas. Eles só herdam a casca e os tokens.
- Montar o início com teclado ou com toque.
- Quadros de largura ou altura variáveis pelo usuário (redimensionar).

---

## 3. Público e roteiro

O mesmo da demo (PRD da demo, seção 3). O roteiro ganha um passo: depois de entrar, o visitante vê o início do seu papel, troca de papel e percebe que o início muda com quem usa. No desktop, pode clicar em Personalizar e rearrumar os quadros.

---

## 4. Decisões

| # | Decisão |
|---|---|
| D-01 | A casca nova (menu lateral e cabeçalho) vale para todas as páginas da área logada. O grid montável existe só no início (Q1). |
| D-02 | A montagem fica salva por usuário fictício e é apagada pelo "Resetar demo" (Q2). |
| D-03 | Cada papel tem a sua montagem padrão (Q3, Q17). |
| D-04 | A montagem é feita só com mouse, sem montagem por teclado (Q4). Remover e adicionar são botões comuns, acessíveis por teclado. |
| D-05 | O grid tem 4 unidades no desktop, 2 no tablet e 1 no celular. Cada quadro tem tamanho fixo e um desenho próprio para cada largura (Q5, Q8). |
| D-06 | A altura também é fixa, em unidades, no desktop e no tablet (mosaico de bordas retas). No celular a altura é livre (Q9, Q16). |
| D-07 | Posição livre: o quadro vai para onde é solto. Se não couber, o grid avisa e recusa. Os demais quadros descem para abrir espaço, e o início cresce para baixo, sem limite de altura (Q10). |
| D-08 | O Personalizar existe só no desktop. Tablet e celular mostram a montagem do desktop em ordem de leitura (Q11, revista pela Q20). |
| D-09 | O catálogo da v1 tem 12 quadros (Q6), com os tamanhos da seção 7.4 (Q12). |
| D-10 | "Dashboard" passa a se chamar **Início**. O título vira uma saudação com a data e uma frase-resumo calculada (Q7). |
| D-11 | A Carteira por fase mostra todas as fases do RF-14 da demo (Q13). |
| D-12 | O Passivo por classe soma a relação do AJ das RJ ativas, como o RF-09 da demo (Q14). |
| D-13 | A casca segue o artboard aprovado (Q15). |
| D-14 | Adicionar pelo catálogo é por clique. O quadro entra no primeiro lugar livre onde cabe, ou no fim (Q18). |
| D-15 | As mudanças só valem no Concluir. Cancelar descarta, e Restaurar padrão só se confirma no Concluir (Q19). |
| D-16 | O visual foi aprovado no canvas antes do SDD, e o SDD aponta para os artboards como referência (Q21). |

---

## 5. Relação com o PRD da demo

Este PRD **substitui a seção 7.3 (Dashboard executivo, RF-07 a RF-10)** do `prd-demo.md`. Os indicadores atuais (`src/modulos/dashboard/indicadores.ts`) são reaproveitados onde valem.

A **seção 7.1 (Moldura da demo)** continua valendo: a faixa da demo, o "Resetar demo" e o "Falar com a Draft" ficam como estão, acima da casca nova.

---

## 6. Requisitos funcionais

### 6.1 Casca da área logada

- **RF-01** Menu lateral claro em todas as páginas da área logada.
  - Logo no topo, com o botão de recolher.
  - Seções "Principal" (Início, Processos, Empresas, Informes, Agenda) e "Administração" (Usuários, Logs). As permissões por papel continuam as do RF-40 da demo.
  - O item ativo tem fundo azul-claro e ícone dourado, sem bloco dourado.
  - "Processos" mostra o total de processos. "Agenda" mostra um contador vermelho de prazos vencidos, que some quando não há vencidos.
  - No pé do menu ficam o interruptor de tema escuro e a conta (avatar, nome e papel), que abre o menu da conta atual (trocar de papel e sair).
- **RF-02** A busca global (⌘K) sai do topo flutuante e passa para o cabeçalho da página. O comportamento da busca não muda.
- **RF-03** No tablet e no celular, o menu lateral vira uma barra no topo com o botão do menu (que abre a gaveta atual), a logo, um botão de busca e o avatar.
- **RF-04** No modo escuro, o menu vira uma superfície escura um tom acima do fundo. Todas as cores saem de `tokens.css` (guarda AJ-17).

### 6.2 Cabeçalho do início

- **RF-05** O título é uma saudação com o primeiro nome do usuário. Ela muda com a hora do relógio da demo: "Bom dia" até 12h, "Boa tarde" até 18h e "Boa noite" depois.
- **RF-06** Acima da saudação vai a data por extenso ("Sábado, 7 de novembro").
- **RF-07** Abaixo da saudação vai uma frase-resumo calculada, que cita só o que existe, nesta ordem:
  - prazos vencidos, em destaque vermelho;
  - prazos que vencem hoje;
  - a próxima AGC, se for nos próximos 7 dias ("a AGC de Grupo Lontra Azul é na sexta").

  Sem nenhum desses, a frase diz que não há pendências para hoje.
- **RF-08** No desktop, o cabeçalho tem a busca e o botão **Personalizar**.

### 6.3 Grid do início

- **RF-09** Desktop: 4 colunas, com altura de unidade fixa. Cada quadro ocupa a posição e o tamanho salvos na montagem.
- **RF-10** Tablet: 2 colunas. Os quadros seguem a ordem de leitura da montagem do desktop (de cima para baixo, da esquerda para a direita), empacotados sem buracos. Quadro de 3 ou 4 unidades usa a variante de 2.
- **RF-11** Celular: 1 coluna, na mesma ordem de leitura. Cada quadro usa a variante de celular e tem a altura que o conteúdo pede.
- **RF-12** Os limites de largura (desktop, tablet e celular) ficam no SDD. Em tela muito larga, o grid para de crescer numa largura máxima.
- **RF-13** Cada quadro leva ao registro ou à lista de origem: o link no cabeçalho do quadro e os itens clicáveis dentro dele. Os destinos respeitam o RF-40 da demo: sem permissão, sem link.

### 6.4 Catálogo de quadros

Tamanhos em unidades (largura × altura) no desktop. No tablet, quadros de 1 ou 2 unidades mantêm o tamanho e a Carteira por fase vira 2×2. Detalhes visuais estão nas fichas do canvas.

| # | Quadro | Desktop | Conteúdo |
|---|---|---|---|
| Q-01 | Prazos em aberto | 1×1 | Total em aberto, vencidos e de hoje. Barra segmentada por urgência (vencidos, hoje, 7 dias, 30 dias, depois) e legenda. |
| Q-02 | Próxima AGC | 1×1 | Data em destaque, processo, quantos dias faltam e as datas da 1ª e da 2ª convocação. |
| Q-03 | Pedidos de crédito | 1×1 | Rosca de pendentes, acolhidos e rejeitados, com os pendentes no centro. |
| Q-04 | Próximos prazos | 1×2 | Seis prazos, vencidos primeiro, com data e data relativa ("há 2 dias", "hoje", "em 5 dias"). O rodapé leva à agenda com quantos sobram. |
| Q-05 | Calendário do mês | 1×2 | Mês corrente, com dias de prazo, de AGC, de vencidos e hoje marcados, e um destaque do que vence hoje. |
| Q-06 | Atividade recente | 1×2 | Seis últimas ações dos logs (quem, o quê, onde, quando). |
| Q-07 | Últimos informes | 1×2 | Cinco informes com categoria, título, processo e data. |
| Q-08 | Passivo sob administração | 2×1 | Total no cabeçalho, com barras dos quatro maiores processos e a nota dos processos sem relação do AJ. |
| Q-09 | Informes publicados | 2×1 | Colunas de informes por mês nos últimos 12 meses, com os meses de pico destacados. |
| Q-10 | Prazos cumpridos | 2×1 | Linha de prazos cumpridos por mês nos últimos 12 meses, com o recorde marcado. |
| Q-11 | Passivo por classe (RJ) | 2×1 | Barra 100% e legenda por classe, somando a relação do AJ das RJ ativas (mesma base do RF-09 da demo). |
| Q-12 | Carteira por fase | 4×1 | As fases do RF-14 da demo, por tipo, com a contagem de processos. As fases vazias ficam apagadas e as finais alternativas (convolada, desistência) ficam de fora. Clicar numa fase abre Processos filtrada por ela. |

- **RF-14** Variantes por largura, nas fichas do canvas:
  - **Q-08:** no celular, nome e valor em cima e barra embaixo.
  - **Q-09:** no celular, só os últimos 6 meses.
  - **Q-11:** no celular, legenda em uma coluna.
  - **Q-05:** no celular, células de pelo menos 38px.
  - **Q-12:** faixas no desktop, grade de fases no tablet e lista no celular.
  - Os demais quadros mantêm o desenho e só mudam de largura.
- **RF-15** Cada quadro tem um estado vazio próprio, por exemplo "Nenhuma AGC agendada" ou "Nenhum prazo nos próximos 30 dias", com o link para a tela de origem.
- **RF-16** Gráficos em cores chapadas dos tokens, sem degradê, nos dois temas. Todo gráfico tem um texto alternativo com os valores.

### 6.5 Montagem padrão por papel

- **RF-17** Padrões no desktop (colunas 1 a 4, de cima para baixo):

**AJ:**
```
| Carteira por fase ─────────────────────────────── |
| Passivo ─────────────── | Prazos   | AGC          |
| Prazos cumpridos ────── | Próximos | Atividade    |
| Passivo por classe ──── | prazos   | recente      |
```
**Advogado:**
```
| Prazos   | AGC      | Próximos | Calendário |
| Informes publicados | prazos   | do mês     |
| Passivo ─────────── | Passivo por classe ─── |
| Carteira por fase ───────────────────────── |
```
**Analista:**
```
| Pedidos  | Prazos   | Últimos  | Atividade  |
| Passivo por classe  | informes | recente    |
| Passivo ─────────── | Próximos | Calendário |
| Informes publicados | prazos   | do mês     |
```

Os quadros que não estão no padrão de um papel ficam no catálogo dele.

### 6.6 Personalizar

- **RF-18** O botão **Personalizar** (só no desktop) entra no modo de edição:
  - aparece uma faixa com o texto de ajuda, **Restaurar padrão**, **Cancelar**, **Concluir** e o catálogo dos quadros que estão fora, cada um com o seu tamanho;
  - o grid mostra as células como guias tracejadas;
  - cada quadro ganha uma alça de arrastar e um botão de tirar (×), e os links dos quadros ficam desligados.
- **RF-19** Arrastar com o mouse mostra a sombra do lugar de destino:
  - se o quadro cabe, os demais descem para abrir espaço;
  - se não cabe (por exemplo, um quadro de 2 unidades solto na 4ª coluna), a sombra fica vermelha, aparece o aviso "Não cabe aqui: este quadro ocupa N colunas", e soltar devolve o quadro ao lugar de origem.
- **RF-20** Clicar num quadro do catálogo o coloca no primeiro lugar livre onde ele cabe, ou no fim do início se não houver lugar. Cada quadro aparece no máximo uma vez.
- **RF-21** O × tira o quadro do início e o devolve ao catálogo.
- **RF-22** **Concluir** salva a montagem. **Cancelar** descarta tudo desde a entrada no modo. **Restaurar padrão** troca a montagem pela padrão do papel, que só se salva no Concluir.
- **RF-23** Com todos os quadros tirados, o início mostra um aviso com o botão Restaurar padrão.

### 6.7 Persistência

- **RF-24** A montagem é guardada por usuário fictício, no navegador, junto com os dados da demo.
- **RF-25** O "Resetar demo" (RF-02 da demo) apaga as montagens, e cada usuário volta ao padrão do papel.
- **RF-26** Usuário sem montagem salva vê o padrão do seu papel. Montagem salva que cite um quadro inexistente ignora esse quadro.

---

## 7. Requisitos não funcionais

- **RNF-01** Acessibilidade: vale o RNF-01 da demo, com uma exceção decidida (D-04): reorganizar por arrastar não tem alternativa de teclado. Tirar, adicionar, Concluir, Cancelar e Restaurar são botões acessíveis por teclado.
- **RNF-02** Cores só de `tokens.css`, sem degradê, nos dois temas (guarda `src/estilos/cores.test.ts`). Contraste de 4,5:1 em todo texto, inclusive nos rótulos dos gráficos.
- **RNF-03** A primeira carga continua no limite do RNF-03 da demo (3 s em 4G). A biblioteca do grid entra só no início, por carregamento sob demanda se for preciso.
- **RNF-04** Polidez visual: nenhum quadro é espremido abaixo do tamanho para o qual foi desenhado. O critério de aceite de cada quadro inclui capturas em 1440, 834 e 390px, nos dois temas.

---

## 8. Plano de testes

- **Unitários (Vitest):**
  - frase-resumo (com e sem vencidos, de hoje e AGC);
  - saudação por hora;
  - empacotamento em ordem de leitura para tablet e celular;
  - "cabe ou não cabe" na posição;
  - primeiro lugar livre ao adicionar;
  - leitura de montagem salva com quadro inexistente;
  - padrão por papel;
  - cálculos novos dos quadros (informes por mês, prazos cumpridos por mês, pedidos por status).
- **Componentes:** cada quadro renderiza nas três variantes e no estado vazio, e os links respeitam a permissão.
- **e2e (Playwright):**
  - entrar com cada papel e ver o padrão dele;
  - Personalizar: tirar, adicionar pelo catálogo, Cancelar descarta e Concluir salva (persiste ao recarregar);
  - o "Resetar demo" volta ao padrão;
  - o celular não mostra Personalizar;
  - o arrasto, incluindo a recusa, se o Playwright conseguir simular de forma estável. Se não, ele fica coberto pelo teste unitário de "cabe ou não cabe".
- **Visual:** capturas da `comparacao-visual` antes e depois, nas três larguras e nos dois temas.

---

## 9. Fora da v1

- Montagem por teclado e por toque.
- Personalizar no tablet e no celular, e montagem própria por largura.
- Redimensionar quadros e quadros de tamanho variável.
- Quadros configuráveis (escolher o processo, o período ou o filtro dentro do quadro).
- Horário das AGCs: o modelo de dados guarda só a data. O "10h" do canvas é ilustrativo e não entra.
- Outras páginas montáveis.

---

## 10. Riscos

- **Biblioteca do grid:** a montagem com posição livre, sombra e recusa depende de uma biblioteca de grid (a candidata é react-grid-layout). A recusa de quadro que não cabe pode precisar de lógica própria por cima dela. O SDD confirma isso antes de quebrar em tarefas.
- **Trabalho de variantes:** 12 quadros × 3 larguras × 2 temas é muito desenho para implementar e conferir. As tarefas devem vir em lotes de quadros, cada lote com as suas capturas.
- **e2e do arrasto:** arrastar com o Playwright costuma ser instável. Por isso a regra de encaixe tem teste unitário próprio.
- **Mudança de nome:** os e2e e os textos que citam "Dashboard" precisam mudar juntos.
