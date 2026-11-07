# PRD — Demo do Judisys

**Status:** aprovado (2026-11-07)
**Código do pedido:** `DMO` (cards e tarefas `DMO-NN`, board Trello "Judisys", a criar na etapa de tarefas)
**Repositório alvo:** `judisys-demo` (GitHub, pasta local `~/code/judisys`), publicado no GitHub Pages.
**Origem:** painel administrativo do `mcaa-app` (`/admin`), que serve de ponto de partida funcional e visual (`mcaa-app/docs/design/judisys`).

---

## 1. Problema

O Judisys nasceu como o painel administrativo do site da MCAA e vai virar um produto à parte para administradores judiciais (AJs). Hoje ele é, na prática, um CMS de publicação: cadastra processos, empresas e informes para o site público, mas não ajuda no trabalho do AJ (credores, prazos, assembleia). Também não há como mostrar o produto a um AJ interessado sem expor dados reais de clientes.

## 2. Objetivo

1. Ter uma **demo navegável e editável** do Judisys, acessível pelo site da Draft (`draft.dev.br`, seção `#judisys`), sem backend.
2. Mostrar o Judisys como **gestor de recuperação judicial e falência**, não só como publicador: a história completa processo → credores → prazos → AGC.
3. Usar só **dados fictícios**, do escritório fictício **Vértice Administração Judicial**.

### Não-objetivos

- Backend, autenticação real ou persistência fora do navegador.
- Compatibilidade com o código ou os dados do `mcaa-app`. A demo é um projeto novo que reaproveita ideias e identidade visual, não código.
- Exatidão jurídica de nível de produção. As regras da Lei 11.101/2005 (com a Lei 14.112/2020) devem estar certas nos casos da demo, mas casos-limite (seção 12) ficam de fora.

---

## 3. Público e roteiro da demo

**Público:** administradores judiciais e equipes de escritórios de AJ.

**Roteiro que a demo precisa contar em ~5 minutos** (guia o seed e a ordem das telas):

1. Entra como AJ e vê o dashboard: carteira, passivo sob administração, prazos vencendo, AGC na semana que vem.
2. Abre o processo vitrine (grupo econômico em RJ com consolidação substancial), vê a timeline de fases e os prazos.
3. Abre os credores: classes, os três valores de cada crédito, uma impugnação pendente (art. 8º); registra a decisão que acolhe a impugnação e vê o valor do QGC mudar.
4. Abre a AGC (marcada para daqui a 6 dias; a demo permite conduzi-la antes da data, com aviso, RF-31): marca presença, roda um cenário de votação, vê o painel do art. 45 e a verificação de cram down, registra o resultado e encontra a ata nos informes.
5. Usa a busca global (⌘K) para pular para um credor ou empresa.

---

## 4. Decisões

| # | Decisão |
|---|---|
| D-01 | SPA estático: **Vite + React + TypeScript**, roteamento por hash (`#/processos/12`), sem backend. |
| D-02 | CSS próprio com os tokens, fontes (Inter, Poppins) e logos de `mcaa-app/docs/design/judisys`. Sem Bootstrap, Tailwind ou biblioteca de componentes. Gráficos com **Recharts**. |
| D-03 | Dados: `seed.json` gerado por **script determinístico** versionado no repo. Na primeira visita, o seed é carregado no **IndexedDB**; toda leitura e escrita passa por uma camada de repositório com interface de API assíncrona (`processos.list()`, `credores.update()`…), para que um backend real substitua só essa camada. |
| D-04 | **Datas relativas:** o seed guarda datas como deslocamento em dias a partir de "hoje"; elas viram datas absolutas no carregamento inicial e em cada reset. |
| D-05 | **Versão do seed:** se a versão gravada no navegador for diferente da publicada, a demo reseta sozinha e mostra o aviso "A demo foi atualizada e os dados foram restaurados." |
| D-06 | **Reset manual** ("Resetar demo") na faixa da demo e no menu da conta, com confirmação. Sem reset automático por tempo. |
| D-07 | CRUD completo em todos os módulos, salvo no navegador. |
| D-08 | Um único escritório fictício (**Vértice Administração Judicial**). O modelo de dados já tem `escritorioId` em tudo, mas não há troca de escritório na v1. |
| D-09 | Entrada sem senha: tela de login com cartões "Entrar como…" para os 3 papéis (D-10). |
| D-10 | Três papéis fixos, sem matriz por usuário: **Administrador(a) judicial**, **Advogado(a)**, **Analista** (permissões em 7.9). |
| D-11 | Nenhuma referência a MCAA ou Ethos. Marca Judisys, escritório fictício, crédito "por Draft" no rodapé. |
| D-12 | Saem da v1 os módulos de site público do `mcaa-app`: **Perfis, Documentos, Alertas**. Ficam Usuários e Logs. |
| D-13 | Desktop-first, funcional no celular (menu recolhido, tabelas com rolagem horizontal). |
| D-14 | Sem analytics. `noindex` em todas as páginas. Nenhum dado sai do navegador. |
| D-15 | Prazos em **dias corridos** (art. 189, §1º, I), sem feriados. |
| D-16 | Abstenções na AGC ficam **fora da base de cálculo** (prática majoritária; a lei não trata expressamente). |
| D-17 | Publicação por GitHub Action a cada push na `main` (testes → build → Pages). Endereço padrão do Pages na v1; domínio próprio depois. |

---

## 5. Arquitetura

```
seed.json (gerado por scripts/gerar-seed.ts)
   │  primeira visita, reset, ou versão diferente (D-05)
   ▼
IndexedDB  ◄──►  camada de repositório (src/dados/)  ◄──►  telas React
                    │
                    └─ regras de domínio puras (src/regras/): prazos, fases, votação, QGC
```

- **Regras de domínio** ficam em funções puras, sem React e sem IndexedDB, para serem testadas isoladamente (seção 10).
- **Anexos:** PDFs genéricos estáticos em `public/` (7.6); uploads do visitante viram blobs no IndexedDB.
- **Sessão:** o papel escolhido no login fica no `sessionStorage`; trocar de papel é sair e entrar de novo.
- **Hash router:** dispensa configuração de rotas no GitHub Pages.

---

## 6. Modelo de dados

Coleções no IndexedDB. Todos os registros têm `id`, `escritorioId`, `criadoEm`, `atualizadoEm`.

| Coleção | Campos principais |
|---|---|
| `escritorios` | nome |
| `usuarios` | nome, e-mail, papel (`aj` \| `advogado` \| `analista`) |
| `empresas` | razão social, nome fantasia, CNPJ, porte (`me` \| `epp` \| `demais`), cidade, UF, CNAE |
| `processos` | apelido, número CNJ, tipo (`rj` \| `falencia`), comarca, UF, vara, e-mail, `empresaIds[]`, consolidação (`nenhuma` \| `processual` \| `substancial`), passivo declarado, responsável (`usuarioId`), honorários (percentual, valor), fase atual |
| `marcosDeFase` | `processoId`, fase, data. O histórico de fases do processo. |
| `prazos` | `processoId`, título, base legal, vencimento, origem (`automatico` \| `manual`), status (`aberto` \| `cumprido`), `marcoId` de origem |
| `credores` | `processoId`, nome, CPF/CNPJ, classe, natureza do crédito, valor na relação do devedor, valor na relação do AJ, valor no QGC |
| `pedidosDeCredito` | `processoId`, `credorId` (opcional: vazio quando o requerente não está na lista), nome e CPF/CNPJ do requerente (quando sem `credorId`), tipo (`habilitacao` \| `divergencia` \| `impugnacao`), valor pedido, classe pedida, status (`pendente` \| `acolhido` \| `rejeitado`), data |
| `agcs` | `processoId`, data da 1ª e da 2ª convocação, pauta, status (`agendada` \| `instalada` \| `encerrada`), convocação em que instalou |
| `presencas` | `agcId`, `credorId` |
| `votos` | `agcId`, `credorId`, voto (`sim` \| `nao` \| `abstencao`) |
| `informes` | `processoId`, título, categoria, fase, folhas inicial e final, data da AGC (só "Atas de AGC"), publicado no site (sim/não), anexos |
| `logs` | usuário, ação (`criou` \| `editou` \| `excluiu`), coleção, `registroId`, `processoId` (quando houver), mudanças (`{campo, de, para}[]`), data |

Valores monetários em centavos (inteiros), para os totais não acumularem erro de ponto flutuante.

---

## 7. Requisitos funcionais

### 7.1 Moldura da demo

- **RF-01** Faixa fixa no topo, em todas as telas internas: "Ambiente de demonstração · dados fictícios", botão **Resetar demo** e botão **Falar com a Draft** (abre `https://wa.me/5511999606775` com mensagem pronta sobre o Judisys).
- **RF-02** Resetar pede confirmação, apaga o IndexedDB, recarrega o seed com as datas recalculadas (D-04) e volta ao dashboard.
- **RF-03** Aviso de reset automático por versão (D-05).
- **RF-04** Rodapé com "Judisys · por Draft" (link para `draft.dev.br`).

### 7.2 Entrada

- **RF-05** Tela de login no visual do guia de design (metade formulário, metade painel escuro com prévia decorativa), com três cartões "Entrar como…", um por papel, cada um com nome fictício e uma linha do que aquele papel pode fazer.
- **RF-06** Menu da conta com nome, papel, "Trocar de papel" (volta ao login) e "Resetar demo".

### 7.3 Dashboard executivo

- **RF-07** Números do topo: processos ativos (RJ e falência), passivo total sob administração (soma da relação do AJ dos processos ativos), total de credores, prazos vencidos e que vencem em 7 dias.
- **RF-08** Funil de processos por fase, separado por tipo.
- **RF-09** Passivo por classe de credor (RJ).
- **RF-10** Próximos prazos (os 8 mais próximos, vencidos primeiro), próximas AGCs, últimos informes e atividade recente (dos logs). Cada item leva ao registro.

### 7.4 Processos

- **RF-11** Lista com busca (apelido, número CNJ, empresa), filtro por tipo e por fase, paginação e exportação CSV.
- **RF-12** Formulário em seções (como `processo-novo.html` do guia de design): informações principais, detalhes jurídicos, localização e contato, empresas (multisseleção com busca), equipe e honorários.
- **RF-13** **Tela do processo**, que não existe no `mcaa-app`. Cabeçalho com apelido, número, tipo, fase atual e responsável, e abas: Visão geral (timeline de fases e próximos prazos), Empresas, Credores, Prazos, AGC (só RJ), Informes, Histórico (logs do processo).
- **RF-14** Fases fixas por tipo:
  - **RJ:** pedido → processamento deferido → edital de credores publicado → relação do AJ publicada → plano apresentado → prazo de objeções → AGC → plano homologado → fiscalização → encerrada. Fases finais alternativas: convolada em falência, desistência.
  - **Falência:** decretada → arrecadação → quadro de credores → realização do ativo → pagamentos → prestação de contas → encerrada.
- **RF-15** "Avançar fase": o usuário escolhe a próxima fase e informa a data do marco; o sistema grava o marco e cria os prazos automáticos daquela fase (7.7). **Desfazer marco:** só o último marco pode ser desfeito (pilha). Remove os prazos automáticos que ele criou e que ainda estão abertos; os cumpridos ficam como histórico. Pede confirmação listando o que será removido ("Desfazer 'Plano apresentado'? Serão removidos 1 prazo aberto: Objeções ao plano.") e a fase atual volta à do marco anterior. Grava log e segue a permissão de editar processos (AJ e advogado).

### 7.5 Empresas

- **RF-16** Lista com busca (razão social, nome fantasia, CNPJ) e exportação CSV; formulário com os campos de 6; CNPJ validado pelo dígito verificador.
- **RF-17** Na edição, a lista dos processos em que a empresa aparece.

### 7.6 Informes

- **RF-18** Categorias atuais do `mcaa-app`: Atas de AGC, Editais, Notas Relevantes, Outros Documentos, PRJ, Relatórios, Relação de Credores. "Data da AGC" só aparece em Atas de AGC.
- **RF-19** Campos novos: **fase** (preenchida com a fase atual do processo, editável) e **publicado no site** (selo na lista).
- **RF-20** Ordem por data, mais recente primeiro (sai a reordenação manual).
- **RF-21** Anexos: o seed usa de 6 a 8 PDFs genéricos (edital, relação de credores, RMA, PRJ, ata de AGC, parecer, laudo, nota) reaproveitados; o visitante pode anexar arquivos de até **10 MB** cada. PDFs abrem num visualizador dentro do painel; outros tipos são baixados.

### 7.7 Prazos e agenda

- **RF-22** Prazos automáticos, criados pelo marco de fase indicado:

| Tipo | Marco | Prazo | Base legal |
|---|---|---|---|
| RJ | Processamento deferido | Stay period: 180 dias | art. 6º, §4º |
| RJ | Processamento deferido | Apresentação do plano: 60 dias | art. 53 |
| RJ | Processamento deferido | Realização da AGC: até 150 dias | art. 56, §1º |
| RJ | Processamento deferido | RMA: próximo dia 15 (ver abaixo) | art. 22, II, "c" |
| RJ | Edital de credores publicado | Habilitações e divergências: 15 dias | art. 7º, §1º |
| RJ | Edital de credores publicado | Relação do AJ: 45 dias após o fim das habilitações | art. 7º, §2º |
| RJ | Relação do AJ publicada | Impugnações: 10 dias | art. 8º |
| RJ | Plano apresentado ou relação do AJ publicada (o que for posterior) | Objeções ao plano: 30 dias | art. 55 |
| RJ | Plano homologado | Fim da fiscalização: até 2 anos | art. 61 |
| Falência | Decretada | Habilitações: 15 dias | art. 7º, §1º |
| Falência | Decretada | Relatório do AJ: 40 dias | art. 22, III, "e" |
| Falência | Arrecadação | Início da realização do ativo: 60 dias | art. 99, §3º |

  **RMA:** cada RJ ativa tem sempre um único RMA aberto, com vencimento no próximo dia 15 (a lei não fixa o dia, quem fixa é o juiz; o dia 15 é o padrão da demo, sem campo configurável). Marcar o RMA como cumprido cria o do mês seguinte; se não for cumprido, fica vencido. A geração para quando o processo vai para encerrada, convolada em falência ou desistência; na fiscalização continua. O seed traz alguns processos com RMA vencido.
- **RF-23** Prazos manuais: título, processo, vencimento, base legal (opcional).
- **RF-24** Marcar como cumprido; vencido e aberto aparece em vermelho; vence em até 3 dias aparece em dourado.
- **RF-25** Agenda geral com **lista** (filtros: vencidos, hoje, 7 dias, 30 dias, por processo, por responsável) e **calendário mensal**. Exportação CSV.

### 7.8 Credores e QGC

- **RF-26** Credores ficam dentro do processo (aba Credores). Classes:
  - **RJ:** I Trabalhista, II Garantia real, III Quirografário (inclui privilégio e subordinados), IV ME/EPP (art. 41), e **Não sujeito** (ex.: fiduciário, art. 49, §3º), que aparece mas não entra no QGC nem vota.
  - **Falência:** as classes do art. 83 vigentes após a Lei 14.112/2020 (trabalhistas até 150 salários mínimos, garantia real, tributários, quirografários, multas, subordinados) e os **extraconcursais** do art. 84, que aparecem separados.
- **RF-27** Cada credor mostra os três valores (relação do devedor → relação do AJ → QGC) e a variação entre eles.
- **RF-28** Lista com filtro por classe, busca por nome ou CPF/CNPJ, **paginação de 50**, e quadro-resumo por classe (quantidade, valor e percentual) acima da lista. CPF/CNPJ validados pelo dígito verificador.
- **RF-29** Pedidos de crédito (versão simples de habilitações e divergências): no credor, registrar habilitação ou divergência com valor e classe pedidos. **Acolher** atualiza o valor e a classe na relação do AJ e grava log; **rejeitar** só muda o status. Depois da relação do AJ publicada, o pedido passa a ser **impugnação** (art. 8º, decidida pelo juiz): registrar a decisão que acolhe atualiza o valor e a classe no **QGC**, não na relação do AJ. **Requerente fora da lista:** o pedido guarda nome e CPF/CNPJ do requerente, e o credor só é criado quando o pedido é **acolhido** (rejeitar não cria nada). Habilitação ou divergência acolhida cria o credor com zero na relação do devedor e o valor pedido na relação do AJ; impugnação acolhida (pedido de inclusão, art. 8º) cria com zero nas duas relações e o valor no QGC. Se o CPF/CNPJ informado já pertence a um credor do processo, o formulário avisa e oferece vincular o pedido a ele.
- **RF-30** **QGC para impressão:** página com cabeçalho do processo, credores agrupados por classe, subtotais e total geral, com CSS de impressão (o navegador salva em PDF). Exportação CSV da lista de credores.

### 7.9 AGC (só RJ)

- **RF-31** Cadastro de AGC: data da 1ª e da 2ª convocação, pauta. Um processo pode ter várias. A demo permite conduzir a AGC (presença, votação, resultado) antes da data, com o aviso discreto "Simulação: a data da AGC ainda não chegou".
- **RF-32** **Presença:** marcar credor a credor ou "todos de uma classe". Só credores com valor no QGC (ou, sem QGC, na relação do AJ) e de classes I a IV votam e contam.
- **RF-33** **Instalação** (art. 37, §2º): em 1ª convocação, o painel mostra por classe o percentual do valor presente e se passa de 50%; instala se todas passarem. Em 2ª convocação, instala com qualquer número.
- **RF-34** **Mesa de votação:** voto sim, não ou abstenção por credor presente; botões de cenário: "Aprovação folgada", "Classe III rejeita", "Aprovação por cram down", "Aleatório", "Limpar".
- **RF-35** **Painel ao vivo** (art. 45), abstenções fora da base (D-16):
  - Classes **I e IV**: aprova com maioria simples dos credores presentes (por cabeça).
  - Classes **II e III**: aprova com mais da metade do valor presente **e** maioria simples por cabeça.
  - Classe sem credor presente não vota. Classe em que todos os presentes se abstêm também é tratada como classe que não votou (inclusive na contagem de classes do cram down).
  - **Empate é rejeição:** "mais da metade" exige estritamente mais de 50%, por cabeça e por valor; o mesmo vale para o requisito 1 do cram down e para o "mais de 1/3" do requisito 3.
  - Credor com valor zero (no QGC ou, sem QGC, na relação do AJ) não vota nem conta para a instalação (RF-32).
  - Barras de cabeça e valor por classe, e o resultado: aprovado em todas as classes, rejeitado, ou passível de cram down.
- **RF-36** **Cram down** (art. 58, §1º), conferido quando alguma classe rejeita, com cada requisito marcado como cumprido ou não:
  1. voto favorável de mais da metade do valor de todos os créditos presentes, independentemente da classe;
  2. aprovação de 3 classes; se só 3 classes votarem, de 2; se só 2 votarem, de 1;
  3. em cada classe que rejeitou, voto favorável de mais de 1/3 dos credores, computados como no art. 45.
- **RF-37** **Registrar resultado:** grava a votação, muda a AGC para encerrada, cria um informe "Atas de AGC" com o resumo (data, convocação, resultado por classe, cram down) e anexa o PDF genérico de ata.

### 7.10 Busca global

- **RF-38** Atalho **Ctrl/⌘+K** e ícone no topo. Busca processos (apelido, número CNJ), empresas (razão social, nome fantasia, CNPJ) e credores (nome, CPF/CNPJ); resultados agrupados por tipo, até 5 por grupo, navegação por teclado. A busca ignora acentos, maiúsculas e pontuação de documentos.

### 7.11 Usuários e permissões

- **RF-39** Tela de Usuários: lista dos usuários fictícios do escritório (uns 6) e a tabela papel × permissões abaixo. Só o AJ cria, edita e exclui usuários.

| | Administrador(a) judicial | Advogado(a) | Analista |
|---|---|---|---|
| Dashboard, busca, consultas | ✔ | ✔ | ✔ |
| Processos, empresas, informes, prazos | editar | editar | ler |
| Credores e pedidos de crédito | editar | editar | editar |
| AGC | editar | editar | ler |
| Usuários | editar | ler | — |
| Logs (tela de logs, aba Histórico, atividade recente) | ler | ler | ler |

- **RF-40** Ação sem permissão: botões escondidos; rota acessada direto mostra "Seu papel não permite esta ação".

### 7.12 Logs

- **RF-41** Toda criação, edição e exclusão grava log com usuário, coleção, registro, processo e as mudanças campo a campo ("de X para Y").
- **RF-42** Tela de logs com filtros por usuário, módulo, processo e período, e link para o registro (quando ainda existe).
- **RF-43** O seed traz uns **60 dias de histórico** coerente com os dados.

### 7.13 Exportações

- **RF-44** CSV (UTF-8 com BOM, separador `;`, para abrir direto no Excel em pt-BR) de processos, empresas, credores e prazos, com **todas as linhas que passam nos filtros da tela** (não só a página visível). Formato das células:
  - valores em reais como número com vírgula decimal e sem separador de milhar (`1234,56`), para o Excel somar;
  - CPF, CNPJ e número CNJ formatados com pontuação (`012.345.678-90`), para o Excel não tratar como número e perder zeros à esquerda;
  - datas `dd/mm/aaaa`;
  - campo com `;`, aspas ou quebra de linha vai entre aspas, com aspas internas duplicadas.
  - Nome do arquivo: `judisys-<módulo>-aaaa-mm-dd.csv`; credores incluem o apelido do processo (`judisys-credores-<apelido>-aaaa-mm-dd.csv`).

---

## 8. Seed

- **RF-45** Script `scripts/gerar-seed.ts` com gerador pseudoaleatório de semente fixa: rodar duas vezes gera o mesmo `seed.json`. O seed tem `versao` (D-05).
- **RF-46** Conteúdo:
  - Escritório Vértice Administração Judicial e uns 6 usuários (2 AJs, 2 advogados, 2 analistas).
  - **12 processos:** 8 RJ e 4 falências, distribuídos para que **toda fase de cada tipo** apareça em ao menos um processo.
  - **Processo vitrine:** grupo econômico em RJ com consolidação substancial (4 a 6 empresas), uns 600 credores em todas as classes, relação do AJ publicada, plano apresentado, **AGC em 1ª convocação daqui a 6 dias**, 3 impugnações pendentes.
  - Pelo menos 1 processo em fiscalização com AGC encerrada e ata registrada, e 1 falência em realização do ativo.
  - ~1.500 credores no total, ~40 empresas, ~80 informes.
  - Prazos espalhados para que o dashboard sempre tenha vencidos, vencendo hoje e na semana.
- **RF-47** Devedoras e apelidos de processos com nomes obviamente fictícios, inventados à mão; credores (uns 1.500) com nomes plausíveis gerados de listas e `@faker-js/faker` pt_BR com semente fixa, cobertos pelo aviso de dados fictícios (RF-01); CPFs e CNPJs com dígito verificador válido; números CNJ no formato correto; comarcas reais (só o nome da cidade).

---

## 9. Requisitos não funcionais

- **RNF-01** Acessibilidade do guia de design: foco visível dourado, alvos de 44px, `label` em todo campo, `aria-label` em botões só de ícone, contraste de 4,5:1.
- **RNF-02** Navegadores: Chrome, Edge, Firefox e Safari nas duas últimas versões.
- **RNF-03** Primeira carga em até 3 s numa conexão 4G; o seed é carregado sob demanda, não embutido no bundle principal.
- **RNF-04** Interface só em pt-BR; datas `dd/mm/aaaa`; moeda `R$ 1.234,56`.

---

## 10. Plano de testes

- **Vitest**, nas regras puras de `src/regras/`:
  - cálculo de cada prazo automático da tabela de RF-22, inclusive o de objeções (data posterior entre dois marcos) e o RMA seguinte criado ao cumprir o atual (e não criado em processo encerrado);
  - avanço e desfazer de fase (RF-15);
  - quórum de instalação (RF-33);
  - votação do art. 45 por classe, com abstenções, classe sem presentes, classe só com abstenções, empate em 50% e credor com valor zero (RF-35);
  - cada requisito do cram down e as variações de 2 e 3 classes votantes (RF-36);
  - totais do QGC por classe, em centavos (RF-28, RF-30);
  - acolher pedido de crédito: divergência altera a relação do AJ, impugnação altera o QGC; requerente fora da lista só vira credor ao ser acolhido (RF-29);
  - conversão de datas relativas do seed (D-04) e reset por versão (D-05);
  - validação de CPF e CNPJ;
  - mesma suíte de testes da camada de repositório rodando contra a implementação em memória e a do IndexedDB (`fake-indexeddb`), para garantir que se comportam igual.
- **Playwright**, um teste de ponta a ponta: entrar como AJ → abrir o processo vitrine → abrir a AGC → marcar presença → rodar o cenário "Aprovação por cram down" → registrar → ver a ata em Informes.
- **Critério de pronto:** testes verdes no GitHub Action, build publicado, roteiro da seção 3 executável do começo ao fim sem erro no console.

---

## 11. Publicação

- **RF-48** GitHub Action na `main`: instala, roda Vitest e Playwright, faz o build e publica no GitHub Pages (D-17). Mudanças entram por PR.
- **RF-49** `<meta name="robots" content="noindex">` e `robots.txt` bloqueando tudo.
- **RF-50** No `draft-site`, botão "Ver demo" na seção `#judisys` apontando para o endereço publicado. É uma tarefa separada, no repo do `draft-site`, depois que a demo estiver no ar.

---

## 12. Fora da v1

- Módulos: habilitações e divergências completas (fluxo com parecer e prazos próprios), habilitação retardatária (art. 10), RMA (conteúdo do relatório), cumprimento do plano, ativos da falência, honorários (além do campo informativo) e portal do credor.
- Troca de escritório na interface.
- Feriados e suspensões no cálculo de prazos.
- Casos-limite de votação: credor sem direito a voto por o plano não alterar seu crédito (art. 45, §3º), voto por procurador, credor em mais de uma classe, sindicato votando por trabalhadores, sócios, controladores e partes relacionadas (art. 43, participam sem votar nem compor quórum).
- Aprovação do plano por termo de adesão, sem AGC (art. 45-A).
- Outros idiomas.
- Integração com tribunais (PJe, DJe, consulta processual).
- Backend, autenticação real, sincronização entre dispositivos.
- Domínio próprio.

---

## 13. Riscos

| Risco | Mitigação |
|---|---|
| CPF/CNPJ gerado coincidir com o de alguém real | Nomes obviamente fictícios; aviso de dados fictícios em toda tela (RF-01). |
| Regra jurídica simplificada ser lida como erro por um AJ | Base legal citada em cada prazo e no painel da AGC; decisões explícitas (D-15, D-16) e lista do que está fora (seção 12). |
| IndexedDB indisponível ao abrir (armazenamento bloqueado; as abas anônimas atuais já têm IndexedDB) | Detectar uma vez, ao abrir; carregar o seed no **repositório em memória** (o mesmo usado nos testes) e mostrar na faixa da demo "suas alterações não serão salvas nesta aba". |
| Cota cheia durante o uso (anexos) | Limite de 10 MB por arquivo (RF-21). Se a gravação falhar por cota, só aquela operação falha, com a mensagem "Não há espaço no navegador para este anexo. Resetar a demo libera o espaço." Não troca para memória no meio da sessão. |
| Nome "Vértice Administração Judicial" existir de fato | Conferir antes da publicação; trocar é editar o seed. |
