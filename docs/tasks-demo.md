# Tarefas: Demo do Judisys

Fonte: docs/sdd-demo.md · PRD: docs/prd-demo.md · Código: `DMO` · Label: `demo`

Repositório: `erickhwk/judisys-demo` (pasta `~/code/judisys`), exceto a DMO-25 (`~/code/draft-site`). Sem banco: o pré-requisito de `TEST_ENV_NUMBER` da execução paralela não se aplica; cada worktree tem seu próprio IndexedDB de teste (`fake-indexeddb`).

**Lotes sugeridos**

| Lote | Tarefas | Observação |
|---|---|---|
| 1 | DMO-01 | Sozinha: cria o repo e a estrutura. |
| 2 | DMO-02, DMO-03, DMO-09 | CI, regras básicas e componentes de interface. |
| 3 | DMO-04, DMO-05, DMO-06 | Regras de domínio e camada de dados, todas sobre a DMO-03. |
| 4 | DMO-07, DMO-11 | Seed e serviços de processo. |
| 5 | DMO-08 | Carga e reset (precisa do seed). |
| 6 | DMO-10 | Casca do app. |
| 7 | DMO-12, DMO-13, DMO-14, DMO-15, DMO-19, DMO-20, DMO-21 | Telas, em paralelo sobre a casca. |
| 8 | DMO-16, DMO-18, DMO-22 | Dependem de credores (DMO-15) ou das listas. |
| 9 | DMO-17 | Votação e ata (precisa de DMO-16 e DMO-19). |
| 10 | DMO-23, DMO-24 | Fechamento. |
| depois | DMO-25 | Outro repo, depois da demo no ar. |

---

## DMO-01 · Montar o projeto
- **Tipo:** Chore
- **Depende de:** —
- **SDD:** §4.1 (T-10, T-11), §5.1
- **Descrição:** Criar o repositório `judisys-demo` com Vite + React + TypeScript strict, pnpm, Biome, Vitest e Playwright configurados e a estrutura de pastas do SDD vazia. Commitar `docs/` (PRD, SDD, tarefas). Os comandos que mudam o ambiente (`git init`, `gh repo create`, `pnpm create`, `pnpm add`) são executados pelo usuário.
- **Critérios de aceite:**
  - [ ] Repo `erickhwk/judisys-demo` criado, com `main` e `docs/` commitados
  - [ ] Vite + React + TS com `strict: true`; `vite.config.ts` com `base: '/judisys-demo/'`
  - [ ] `.nvmrc` com 22; `packageManager` do pnpm no `package.json`
  - [ ] `biome.json`; scripts `lint`, `typecheck`, `test`, `e2e`, `build`, `seed`
  - [ ] Pastas `src/{dados,regras,modulos,ui,estilos}`, `scripts/`, `e2e/`, `tests/fixtures/`
  - [ ] `index.html` com `<meta name="robots" content="noindex">`, `lang="pt-BR"` e as fontes Inter e Poppins; `public/robots.txt` com `Disallow: /` (RF-49)
  - [ ] `public/seed.json` e `public/seed-versao.json` no `.gitignore`
  - [ ] Um teste Vitest e um Playwright de exemplo passando
- **Testes:**
  - [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm e2e` verdes localmente

## DMO-02 · CI e publicação no GitHub Pages
- **Tipo:** Chore
- **Depende de:** DMO-01
- **SDD:** §5.8, T-15
- **Descrição:** Workflow que roda lint, tipos, Vitest, seed, build e Playwright (Chromium) em PR e push na `main`, e publica no Pages só no push na `main`.
- **Critérios de aceite:**
  - [ ] `.github/workflows/ci.yml` com os passos do §5.8, Node 22 e cache do pnpm
  - [ ] Publicação com `actions/upload-pages-artifact` e `actions/deploy-pages`, só em push na `main`
  - [ ] Playwright instala só o Chromium e roda contra `vite preview`
  - [ ] Passo de seed tolerante à ausência do script até a DMO-07 (ou o script de exemplo existe)
  - [ ] README com o endereço publicado e o passo manual de Settings → Pages → "GitHub Actions"
- **Testes:**
  - [ ] PR de teste roda o CI sem publicar
  - [ ] Push na `main` publica e a página abre no endereço do Pages
- **Deploy:** passo manual único do usuário: Settings → Pages → fonte "GitHub Actions".

## DMO-03 · Regras básicas: relógio, datas, documentos, normalização, CSV, diff e permissões
- **Tipo:** Feature
- **Depende de:** DMO-01
- **SDD:** §5.7, T-05, T-19, INV-08
- **Descrição:** Funções puras de `src/regras/` usadas por todo o resto: `relogio.ts`, `datas.ts` (somar dias, formatar `dd/mm/aaaa`, moeda `R$ 1.234,56`), `documentos.ts`, `normalizar.ts`, `csv.ts`, `diff.ts` e `permissoes.ts` com a tabela do RF-39.
- **Critérios de aceite:**
  - [ ] `hoje()` e `agora()` são o único acesso ao relógio do sistema (INV-08)
  - [ ] Validação e formatação de CPF, CNPJ e número CNJ (dígitos verificadores)
  - [ ] `normalizar()` tira acentos, maiúsculas, `.-/` e espaços extras
  - [ ] `gerarCsv()` com BOM, `;`, escape de aspas e quebras; formatadores de centavos (`1234,56`) e documentos
  - [ ] `diferencas()` ignora `atualizadoEm` e devolve `{campo, de, para}[]`
  - [ ] `pode(papel, acao, modulo)` reflete a tabela do RF-39 (analista lê logs)
- **Testes:**
  - [ ] CPF/CNPJ/CNJ válidos, inválidos, com e sem pontuação
  - [ ] CSV-02 · centavos `1234,56`
  - [ ] CSV-03 · escape de `;` e aspas
  - [ ] CSV-04 · CPF com zero à esquerda
  - [ ] BUS-02 · `normalizar("José Conceição") == normalizar("jose conceicao")`
  - [ ] BUS-03 · CNPJ com e sem pontuação normalizam igual
  - [ ] `pode()` para os 3 papéis × 8 módulos × 2 ações
  - [ ] `diferencas()` sem mudanças devolve lista vazia (base de LOG-02)

## DMO-04 · Regras de fases e prazos
- **Tipo:** Feature
- **Depende de:** DMO-03
- **SDD:** §5.7, §2 (C-02 a C-06), T-27, T-28
- **Descrição:** `fases.ts` (fases por tipo, `fasesSeguintes`) e `prazos.ts` (prazos automáticos de cada marco, próximo RMA, situação visual), puras e com `hoje` por parâmetro.
- **Critérios de aceite:**
  - [ ] Fases do RF-14, finais alternativas da RJ e fases finais que não avançam
  - [ ] Tabela de prazos do RF-22 com as correções C-02 e C-03 e base legal em cada prazo
  - [ ] Objeções pela data posterior entre os dois marcos
  - [ ] `proximoRma` estritamente depois da data de referência
  - [ ] `situacao()` → cumprido / vencido / urgente (≤ 3 dias) / normal
- **Testes:**
  - [ ] PRC-01 · edital → habilitações D+15 e relação do AJ D+60
  - [ ] PRC-02 · processamento deferido → stay, plano, AGC e RMA
  - [ ] PRC-03 · objeções contadas do plano
  - [ ] PRC-04 · objeções contadas da relação do AJ
  - [ ] PRC-05 · falência decretada → D+15, D+40, D+60
  - [ ] PRC-06 · arrecadação → D+180
  - [ ] PRC-07 · fase pulada não gera prazos
  - [ ] PRC-08 · data anterior ao último marco é recusada
  - [ ] PRC-09 · fase final não tem seguintes
  - [ ] PRZ-02 · RMA de dezembro → janeiro do ano seguinte
  - [ ] PRZ-05 · marco no dia 15 → RMA no dia 15 do mês seguinte
  - [ ] PRZ-06 · vencido / D+3 / D+4
  - [ ] PRZ-07 · cumprido vencido sem destaque

## DMO-05 · Regras de votação, cram down e QGC
- **Tipo:** Feature
- **Depende de:** DMO-03
- **SDD:** §5.7, §2 (C-01, C-08, C-09), T-26, T-29, INV-03, INV-06
- **Descrição:** `qgc.ts` (valor vigente, resumo por classe, variação) e `votacao.ts` (votantes, instalação, resultado por classe e geral, cram down, cenários com RNG injetável), em centavos.
- **Critérios de aceite:**
  - [ ] Classes RJ e falência (C-01), com extraconcursais à parte
  - [ ] `valorVigente = qgc ?? aj ?? 0`; não sujeito, extraconcursal e valor zero não votam
  - [ ] Instalação pela base do valor votante da classe (C-09)
  - [ ] Art. 45 com abstenções fora da base, empate como rejeição e classe só com abstenções como "não votou"
  - [ ] Cram down com os 3 requisitos marcados um a um (C-08)
  - [ ] Cenários "Aprovação folgada", "Classe III rejeita", "Aprovação por cram down", "Aleatório", "Limpar"
- **Testes:**
  - [ ] AGC-03 · 60% do valor em todas as classes instala
  - [ ] AGC-04 · exatamente 50% não instala
  - [ ] AGC-05 · 2ª convocação com um presente instala
  - [ ] AGC-06 · classe sem votantes não bloqueia
  - [ ] AGC-07 · classe I por cabeça
  - [ ] AGC-08 · classe III falha na cabeça
  - [ ] AGC-09 · classe II com 50% do valor rejeita
  - [ ] AGC-10 · abstenções fora da base
  - [ ] AGC-11 · só abstenções = não votou
  - [ ] AGC-12 · cram down com 4 classes
  - [ ] AGC-13 · 3 classes votantes, 2 aprovam
  - [ ] AGC-14 · 2 classes votantes, 1 aprova
  - [ ] AGC-15 · 4 classes, 2 aprovam: requisito 2 falha
  - [ ] AGC-16 · exatamente 1/3 por cabeça falha
  - [ ] AGC-17 · classe II com > 1/3 por cabeça e ≤ 1/3 por valor falha
  - [ ] AGC-18 · todas aprovam
  - [ ] AGC-19 · cenário cram down produz cram down (RNG fixo)
  - [ ] AGC-20 · cenário impossível com uma classe
  - [ ] AGC-24 · não sujeito e valor zero fora dos votantes
  - [ ] CRD-02 · variação entre devedor e AJ
  - [ ] CRD-13 · soma em centavos exata

## DMO-06 · Camada de dados: armazenamento, schemas e repositório genérico
- **Tipo:** Feature
- **Depende de:** DMO-03
- **SDD:** §5.2 a §5.4, T-01, T-04, T-12 a T-14, T-20, T-21, INV-01, INV-02
- **Descrição:** Interface `Armazenamento` com as implementações Dexie e memória, schemas zod de todas as coleções e o repositório genérico com permissão, validação, busca/filtro/paginação em memória e log na mesma transação.
- **Critérios de aceite:**
  - [ ] `ArmazenamentoDexie` com o schema do §5.4 e `VERSAO_SCHEMA = 1`; `ArmazenamentoMemoria` com o mesmo contrato
  - [ ] Schemas zod de todas as coleções do PRD §6 com as mudanças do SDD (`processoEmpresas`, `pedidosDeCredito` com requerente, anexos, `resumo` do informe)
  - [ ] Repositório: `listar`, `todos`, `buscar`, `criar`, `atualizar`, `excluir`; preenche `id`, `escritorioId`, `criadoEm`, `atualizadoEm`
  - [ ] Cada gravação checa `pode()`, valida com zod e grava o log na mesma transação
  - [ ] `DadosProvider` e hooks para as telas, com `invalidateQueries()` após toda gravação (T-22)
  - [ ] `.claude/` no `.gitignore` (worktrees dos agentes quebravam o `pnpm lint` local; decidido com o usuário no lote 2)
- **Testes:**
  - [ ] Suíte do repositório rodando nas duas implementações (`describe.each`, `fake-indexeddb`)
  - [ ] LOG-01 · edição grava log com de/para
  - [ ] LOG-02 · edição sem mudança não grava log
  - [ ] LOG-05 · validação falha, nada gravado e nenhum log
  - [ ] PER-05 · analista não cria processo por código
  - [ ] Paginação de 50, busca normalizada e ordem

## DMO-07 · Seed e PDFs genéricos
- **Tipo:** Feature
- **Depende de:** DMO-04, DMO-05, DMO-06
- **SDD:** §8 do PRD, T-06, T-07, T-16, T-24, INV-05, INV-07
- **Descrição:** `scripts/gerar-seed.ts` determinístico (faker pt_BR com semente fixa, nomes à mão para devedoras), com datas relativas e versão por hash, gerando `public/seed.json` e `public/seed-versao.json`. `scripts/gerar-pdfs.ts` com `pdf-lib` gerando os 6 a 8 PDFs genéricos, commitados.
- **Critérios de aceite:**
  - [ ] Conteúdo do RF-46: escritório, 6 usuários, 12 processos, vitrine, ~1.500 credores, ~40 empresas, ~80 informes, ~60 dias de logs
  - [ ] Prazos e marcos gerados pelas regras da DMO-04, não à mão
  - [ ] Datas no formato `@±N` e `@±NThh:mm` (T-24)
  - [ ] Versão = hash curto do conteúdo, em `seed-versao.json`
  - [ ] PDFs com a tarja "DOCUMENTO FICTÍCIO · DEMONSTRAÇÃO", commitados em `public/anexos/`
  - [ ] Seed válido pelos schemas zod da DMO-06
- **Testes:**
  - [ ] SED-01 · determinismo
  - [ ] SED-02 · documentos válidos
  - [ ] SED-03 · contagens e todas as fases
  - [ ] SED-04 · processo vitrine
  - [ ] SED-05 · prazos vencidos, hoje e na semana; RMA vencido
  - [ ] SED-06 · um RMA aberto por RJ ativa
  - [ ] SED-07 · logs coerentes

## DMO-08 · Carga, versão e reset
- **Tipo:** Feature
- **Depende de:** DMO-06, DMO-07
- **SDD:** §5.5, T-18, T-24, T-25
- **Descrição:** `dados/carga.ts`: lê a versão, baixa o seed só quando precisa, converte datas, valida, grava numa transação, cai para memória sem IndexedDB e expõe o reset manual.
- **Critérios de aceite:**
  - [ ] Boot antes das rotas, com tela de carregamento
  - [ ] Reset automático por versão de schema ou seed, com o aviso do RF-03
  - [ ] Reset manual (`resetar()`) sem aviso de versão
  - [ ] Plano B em memória e erro de cota por operação (PRD §13)
  - [ ] Tela de erro com "Tentar de novo"
- **Testes:**
  - [ ] CAR-01 · primeira visita
  - [ ] CAR-02 · versão igual não baixa o seed
  - [ ] CAR-03 · versão diferente reseta com aviso
  - [ ] CAR-04 · reset manual
  - [ ] CAR-06 · conversão de datas relativas
  - [ ] CAR-07 · strings parecidas não convertidas
  - [ ] CAR-08 · seed inválido
  - [ ] CAR-09 · falha de rede
  - [ ] CAR-10 · sem IndexedDB usa memória
  - [ ] CAR-11 · cota cheia num anexo
  - [ ] CAR-12 · sem localStorage

## DMO-09 · Tokens e componentes de interface
- **Tipo:** Feature
- **Depende de:** DMO-01
- **SDD:** §5.1 (`ui/`, `estilos/`), T-08, T-11, RNF-01
- **Descrição:** Tokens do guia de design (`mcaa-app/docs/design/judisys`), CSS global e de impressão, e os componentes compartilhados: Tabela, Paginação, Filtros, Campo, Formulário em seções, Diálogo, Confirmação, Selo, Vazio, Erro e VisualizadorPdf.
- **Critérios de aceite:**
  - [ ] `tokens.css` com as cores, raios e tipografia do `DESIGN.md`; logos SVG copiados
  - [ ] Componentes com CSS Modules, foco dourado visível, alvos de 44px, `label` em campos e `aria-label` em botões só de ícone (RNF-01)
  - [ ] Tabela com rolagem horizontal no celular (D-13)
  - [ ] `<dialog>` nativo para diálogos e confirmações
  - [ ] VisualizadorPdf em iframe com "Abrir em nova aba / baixar" (T-09)
  - [ ] Formatação pt-BR de datas e moeda (RNF-04)
- **Testes:**
  - [ ] Página de catálogo dos componentes (rota só em dev) conferida visualmente
  - [ ] Contraste 4,5:1 conferido nos pares de cor usados

## DMO-10 · Casca do app: login, sessão, layout, rotas e moldura da demo
- **Tipo:** Feature
- **Depende de:** DMO-08, DMO-09, DMO-03
- **SDD:** §5.6, T-03, T-13; RF-01 a RF-06, RF-40
- **Descrição:** Login com os três cartões, sessão por aba, layout com menu lateral recolhível, faixa da demo (Resetar e Falar com a Draft), rodapé, menu da conta, roteador hash com guarda de sessão e de permissão, e página não encontrada.
- **Critérios de aceite:**
  - [ ] Login no visual do guia (metade formulário, metade painel escuro), um cartão por papel (RF-05)
  - [ ] Faixa fixa com "Ambiente de demonstração · dados fictícios", Resetar (com confirmação) e WhatsApp (RF-01, RF-02)
  - [ ] Aviso de versão (RF-03) e de modo memória na faixa
  - [ ] Rodapé "Judisys · por Draft" (RF-04)
  - [ ] Menu da conta com nome, papel, Trocar de papel e Resetar (RF-06)
  - [ ] Todas as rotas do §5.6 registradas (telas ainda vazias onde não houver tarefa feita)
  - [ ] Guarda de rota: sem sessão → login; sem permissão → "Seu papel não permite esta ação"
- **Testes:**
  - [ ] PER-01 · entrar como analista
  - [ ] PER-02 · trocar de papel
  - [ ] PER-04 · rota de edição bloqueada para analista
  - [ ] PER-08 · sem sessão vai ao login
  - [ ] PER-09 · sessão por aba
  - [ ] CAR-05 · cancelar o reset

## DMO-11 · Serviços de processo: fases, prazos e exclusão em cascata
- **Tipo:** Feature
- **Depende de:** DMO-04, DMO-06
- **SDD:** T-12, T-23, T-27, T-28, INV-04, INV-05
- **Descrição:** Serviços transacionais `avancarFase`, `desfazerMarco`, `cumprirPrazo` (com RMA seguinte) e `excluirProcesso` (cascata com um log), mais as regras de exclusão de empresa, credor e usuário.
- **Critérios de aceite:**
  - [ ] `avancarFase` grava marco, atualiza a fase e cria os prazos numa transação
  - [ ] `desfazerMarco` só no último marco; remove os prazos abertos que ele criou; devolve a lista para a confirmação
  - [ ] `cumprirPrazo` cria o RMA seguinte só em RJ ativa
  - [ ] `excluirProcesso` em cascata com um log de contagem
  - [ ] Empresa vinculada, credor que votou em AGC encerrada, usuário responsável e o próprio usuário não são excluídos (T-23)
- **Testes:**
  - [ ] PRC-01 · avançar fase grava marco e prazos
  - [ ] PRC-10 · desfazer mantém cumpridos e grava log
  - [ ] PRC-11 · primeiro marco não se desfaz
  - [ ] PRC-13 · exclusão em cascata com um log
  - [ ] PRZ-01 · cumprir RMA cria o seguinte
  - [ ] PRZ-03 · processo convolado não gera RMA
  - [ ] PRZ-04 · processo encerrado não gera RMA
  - [ ] CRD-14 · credor que votou em AGC encerrada
  - [ ] Empresa vinculada e usuário responsável não excluídos

## DMO-12 · Telas de processos
- **Tipo:** Feature
- **Depende de:** DMO-10, DMO-11
- **SDD:** §5.6; RF-11 a RF-15
- **Descrição:** Lista com busca, filtros e paginação; formulário em seções; tela do processo com cabeçalho e abas Visão geral, Empresas e Histórico; ações de avançar e desfazer fase.
- **Critérios de aceite:**
  - [ ] Lista com busca por apelido, CNJ e empresa, filtros por tipo e fase, paginação (RF-11)
  - [ ] Formulário em seções como `processo-novo.html`, com multisseleção de empresas (RF-12)
  - [ ] Tela do processo com as abas do RF-13 (Credores, Prazos, AGC e Informes ligadas nas tarefas próprias)
  - [ ] Timeline de fases e próximos prazos na Visão geral
  - [ ] Avançar fase (só fases seguintes, T-27) e desfazer com confirmação listando os prazos
  - [ ] Aba Histórico com os logs do processo
- **Testes:**
  - [ ] PRC-12 · busca por apelido, CNJ e empresa
  - [ ] PRC-14 · CNJ inválido
  - [ ] PRC-15 · RJ nova começa em "pedido"
  - [ ] PER-03 · analista sem botões de edição

## DMO-13 · Telas de empresas
- **Tipo:** Feature
- **Depende de:** DMO-10, DMO-11
- **SDD:** T-23; RF-16, RF-17
- **Descrição:** Lista com busca e formulário de empresa, com validação de CNPJ e a lista de processos da empresa na edição.
- **Critérios de aceite:**
  - [ ] Busca por razão social, nome fantasia e CNPJ (RF-16)
  - [ ] Campos do PRD §6, CNPJ validado
  - [ ] Processos da empresa na edição (RF-17)
  - [ ] Exclusão bloqueada para empresa vinculada, com os processos na mensagem
- **Testes:**
  - [ ] CNPJ inválido recusado
  - [ ] Exclusão de empresa vinculada recusada

## DMO-14 · Prazos e agenda
- **Tipo:** Feature
- **Depende de:** DMO-10, DMO-11
- **SDD:** §7.4; RF-23 a RF-25
- **Descrição:** Aba Prazos do processo, prazo manual, marcar cumprido e agenda geral em lista e calendário mensal.
- **Critérios de aceite:**
  - [ ] Prazo manual com base legal opcional (RF-23)
  - [ ] Marcar cumprido; cores de vencido e urgente (RF-24)
  - [ ] Agenda em lista com os filtros do RF-25 e calendário mensal navegável
  - [ ] Edição do vencimento de prazo automático (C-05)
- **Testes:**
  - [ ] PRZ-06 · cores na lista
  - [ ] PRZ-08 · filtros "7 dias" e "vencidos"
  - [ ] PRZ-09 · calendário mensal
  - [ ] PRZ-10 · prazo manual sem base legal
  - [ ] PRZ-11 · editar vencimento de prazo automático

## DMO-15 · Credores, pedidos de crédito e QGC
- **Tipo:** Feature
- **Depende de:** DMO-05, DMO-10, DMO-11
- **SDD:** §7.5; RF-26 a RF-30
- **Descrição:** Aba Credores com quadro-resumo e lista, tela do credor com os três valores, pedidos de crédito com o serviço `decidirPedido` e a página do QGC para impressão.
- **Critérios de aceite:**
  - [ ] Quadro-resumo por classe acima da lista; filtro por classe; busca; 50 por página (RF-28)
  - [ ] Os três valores e as variações no credor (RF-27)
  - [ ] Serviço `decidirPedido`: divergência e habilitação → relação do AJ; impugnação → QGC; requerente fora da lista vira credor só ao acolher
  - [ ] Depois da relação do AJ publicada, só impugnação é oferecida
  - [ ] Aviso de CPF/CNPJ existente com opção de vincular
  - [ ] QGC para impressão com `impressao.css` (RF-30)
  - [ ] Classes de falência com extraconcursais à parte
- **Testes:**
  - [ ] CRD-01 · quadro-resumo e paginação
  - [ ] CRD-03 · acolher divergência
  - [ ] CRD-04 · acolher impugnação
  - [ ] CRD-05 · habilitação de requerente fora da lista
  - [ ] CRD-06 · impugnação de requerente fora da lista
  - [ ] CRD-07 · rejeitar não cria credor
  - [ ] CRD-08 · CPF já existente
  - [ ] CRD-09 · pedido já decidido
  - [ ] CRD-10 · só impugnação após a relação do AJ
  - [ ] CRD-12 · QGC para impressão bate com o resumo
  - [ ] CRD-15 · falência com extraconcursais
  - [ ] CRD-16 · CPF inválido

## DMO-16 · AGC: cadastro, presença e instalação
- **Tipo:** Feature
- **Depende de:** DMO-05, DMO-15
- **SDD:** §7.6; RF-31 a RF-33
- **Descrição:** Aba AGC (só RJ) com cadastro de AGCs, lista de presença por credor e por classe e o painel de instalação.
- **Critérios de aceite:**
  - [ ] Cadastro com 1ª e 2ª convocação e pauta; várias por processo (RF-31)
  - [ ] Aviso "Simulação: a data da AGC ainda não chegou" para data futura
  - [ ] Presença credor a credor e "todos da classe"; não votantes desabilitados com motivo
  - [ ] Painel de instalação por classe e botão de instalar conforme a convocação
- **Testes:**
  - [ ] AGC-01 · AGC futura com aviso
  - [ ] AGC-02 · todos da classe
  - [ ] AGC-24 · não votantes desabilitados na tela

## DMO-17 · AGC: votação, painel do art. 45, cram down e registro
- **Tipo:** Feature
- **Depende de:** DMO-16, DMO-19
- **SDD:** §7.6, T-29, T-30; RF-34 a RF-37
- **Descrição:** Mesa de votação com cenários, painel ao vivo por classe, verificação de cram down e o serviço `registrarResultadoAgc`, que encerra a AGC e cria o informe da ata.
- **Critérios de aceite:**
  - [ ] Voto sim, não ou abstenção por presente; botões de cenário (RF-34)
  - [ ] Barras de cabeça e valor por classe e resultado geral (RF-35)
  - [ ] Cram down com os três requisitos marcados (RF-36)
  - [ ] `registrarResultadoAgc` numa transação: AGC encerrada, informe "Atas de AGC" com `resumo` e PDF genérico (RF-37)
  - [ ] AGC encerrada só leitura; registrar desabilitado sem instalação
  - [ ] "Registrar resultado" bloqueado (com aviso no painel) enquanto houver presente sem voto, usando `semVoto` de `resultadoClasse` (T-33)
- **Testes:**
  - [ ] AGC-19 · cenário cram down na tela
  - [ ] AGC-20 · cenário impossível mostra a mensagem
  - [ ] AGC-21 · registrar resultado cria a ata
  - [ ] AGC-22 · AGC encerrada só leitura
  - [ ] AGC-23 · registrar sem instalação desabilitado
  - [ ] Registrar com presente sem voto desabilitado (T-33)

## DMO-18 · Dashboard
- **Tipo:** Feature
- **Depende de:** DMO-10, DMO-11, DMO-15
- **SDD:** §7.7; RF-07 a RF-10
- **Descrição:** Dashboard executivo com os números do topo, funil por fase, passivo por classe (Recharts) e as listas de próximos prazos, AGCs, informes e atividade recente.
- **Critérios de aceite:**
  - [ ] Números do RF-07 com `data-stat`
  - [ ] Funil por fase separado por tipo (RF-08) e passivo por classe (RF-09)
  - [ ] Listas do RF-10, cada item com link
  - [ ] Visual do `dashboard.html` do guia
- **Testes:**
  - [ ] DSH-01 · números com o seed
  - [ ] DSH-02 · AGC do vitrine em D+6
  - [ ] DSH-03 · 8 prazos, vencidos primeiro
  - [ ] DSH-04 · dashboard reflete edição
  - [ ] DSH-05 · processo em fase final fora dos ativos

## DMO-19 · Informes e anexos
- **Tipo:** Feature
- **Depende de:** DMO-08, DMO-10
- **SDD:** §7.11, T-09, T-30; RF-18 a RF-21
- **Descrição:** Lista geral e aba do processo, formulário com as categorias, fase e "publicado no site", upload de anexos até 10 MB e visualizador de PDF.
- **Critérios de aceite:**
  - [ ] Categorias do RF-18; "Data da AGC" só em Atas de AGC
  - [ ] Fase preenchida com a do processo e selo "publicado no site" (RF-19)
  - [ ] Ordem por data, mais recente primeiro (RF-20)
  - [ ] Upload até 10 MB em `arquivos`; PDF no visualizador, outros tipos baixados (RF-21)
  - [ ] Tela do informe mostra o `resumo` quando houver (T-30)
- **Testes:**
  - [ ] INF-01 · fase preenchida
  - [ ] INF-02 · data da AGC só na categoria certa
  - [ ] INF-03 · PDF no visualizador
  - [ ] INF-04 · arquivo acima de 10 MB
  - [ ] INF-05 · outro tipo é baixado
  - [ ] INF-06 · ordem e selo

## DMO-20 · Busca global
- **Tipo:** Feature
- **Depende de:** DMO-10, DMO-06
- **SDD:** §7.8, T-08, T-14; RF-38
- **Descrição:** Busca com `cmdk` aberta por Ctrl/⌘+K e pelo ícone do topo, sobre um índice em memória de processos, empresas e credores, invalidado a cada gravação.
- **Critérios de aceite:**
  - [ ] Atalho e ícone; foco no campo
  - [ ] Resultados agrupados por tipo, até 5 por grupo, navegação por teclado
  - [ ] Busca normalizada (acentos, maiúsculas, pontuação de documentos)
  - [ ] Índice reconstruído após gravação
- **Testes:**
  - [ ] BUS-01 · atalho abre a busca
  - [ ] BUS-04 · no máximo 5 por grupo
  - [ ] BUS-05 · navegação por teclado
  - [ ] BUS-06 · credor recém-criado aparece

## DMO-21 · Usuários e logs
- **Tipo:** Feature
- **Depende de:** DMO-10, DMO-11
- **SDD:** §7.2, §7.9; RF-39, RF-41 a RF-43
- **Descrição:** Tela de usuários com a tabela de permissões e CRUD só para o AJ, e tela de logs com filtros e link para o registro.
- **Critérios de aceite:**
  - [ ] Lista de usuários e tabela papel × permissões (RF-39)
  - [ ] CRUD de usuários só para o AJ; exclusões bloqueadas pela T-23
  - [ ] Logs com filtros por usuário, módulo, processo e período (RF-42), com mudanças campo a campo
  - [ ] Link para o registro, ou "Registro não existe mais"
- **Testes:**
  - [ ] PER-06 · advogado vê usuários sem editar
  - [ ] PER-07 · analista vê logs, Histórico e atividade recente
  - [ ] LOG-03 · registro excluído
  - [ ] LOG-04 · histórico do seed e filtros

## DMO-22 · Exportações CSV
- **Tipo:** Feature
- **Depende de:** DMO-12, DMO-13, DMO-14, DMO-15
- **SDD:** §7.10; RF-44
- **Descrição:** Botão de exportação nas listas de processos, empresas, credores e prazos, com todas as linhas do filtro e o formato do RF-44.
- **Critérios de aceite:**
  - [ ] Exporta todas as linhas que passam no filtro, não só a página
  - [ ] Formato e nome de arquivo do RF-44 (credores com o apelido do processo)
- **Testes:**
  - [ ] CSV-01 · BOM, separador e nome do arquivo
  - [ ] CRD-11 · 600 credores filtrados pela classe III

## DMO-23 · Ajustes de celular e conferência de acessibilidade
- **Tipo:** Chore
- **Depende de:** DMO-12, DMO-15, DMO-17, DMO-18
- **SDD:** §4.1; D-13, RNF-01, RNF-02
- **Descrição:** Passada em todas as telas no celular (390px) e no desktop, conferindo menu recolhido, tabelas com rolagem, foco e contraste. Use a skill `comparacao-visual`.
- **Critérios de aceite:**
  - [ ] Todas as telas usáveis em 390×844 sem rolagem horizontal da página
  - [ ] Navegação só por teclado no roteiro inteiro
  - [ ] Capturas em `docs/capturas/DMO-23/`
- **Testes:**
  - [ ] Roteiro da seção 3 do PRD feito no celular (emulação)

## DMO-24 · Testes de ponta a ponta e critério de pronto
- **Tipo:** Chore
- **Depende de:** DMO-17, DMO-18, DMO-19, DMO-20, DMO-21, DMO-22
- **SDD:** §10, T-17, T-19, INV-09
- **Descrição:** Os três testes Playwright com relógio fixo e a conferência manual de Firefox e Safari antes de divulgar.
- **Critérios de aceite:**
  - [ ] `e2e/roteiro.spec.ts`, `analista.spec.ts` e `reset.spec.ts` verdes no CI
  - [ ] Roteiro do PRD §3 sem erro no console
  - [ ] Nenhuma requisição de rede fora das permitidas (INV-09), conferida no teste do roteiro
  - [ ] Conferência manual no Firefox e no Safari (RNF-02)
  - [ ] Primeira carga em até 3 s em 4G simulado (RNF-03)
- **Testes:**
  - [ ] Roteiro: AJ → vitrine → AGC → presença → cenário cram down → registrar → ata em Informes
  - [ ] Analista: botões de edição ausentes e rota direta bloqueada
  - [ ] Reset: alteração desfeita ao resetar

## DMO-25 · Botão "Ver demo" no site da Draft
- **Tipo:** Feature
- **Depende de:** DMO-24
- **SDD:** RF-50
- **Descrição:** No `~/code/draft-site`, acrescentar na seção `#judisys` o botão "Ver demo" apontando para o endereço publicado no Pages.
- **Critérios de aceite:**
  - [ ] Botão na seção `#judisys`, abrindo a demo em nova aba
  - [ ] Visual coerente com o site
- **Testes:**
  - [ ] Link abre a demo publicada
