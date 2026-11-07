# SDD — Demo do Judisys

**Status:** **aprovado** em 2026-11-07. Decisões técnicas fechadas com o usuário em 2026-11-07 (T-01 a T-19). As decisões de implementação marcadas com **(SDD)** foram tomadas na redação deste documento e entram na aprovação dele.
**Base:** [`prd-demo.md`](prd-demo.md) (aprovado em 2026-11-07). Este documento não repete o PRD: ele fixa decisões técnicas, a arquitetura, invariantes e casos (felizes, de borda e tristes) que guiam os testes e a implementação. Onde diverge do PRD, a seção 2 explica o motivo, e **este documento prevalece**.
**Código:** `DMO`. Tarefas em `tasks-demo.md` (a gerar).

## Como usar este documento

- Cada caso tem um ID estável (`PRZ-03`, `AGC-12`…) e referencia o RF do PRD quando houver. Testes devem citar o ID no nome ou em comentário.
- Formato dos casos: **Dado** (estado) · **Quando** (ação) · **Então** (resultado observável). Tipo: **F** feliz, **B** borda, **T** triste (erro ou entrada inválida).
- "Hoje" nos casos é o valor de `hoje()` (T-19). Datas `D+6` significam "hoje mais 6 dias".
- Quem for escrever os testes deve ler a seção 9 (notas de testabilidade) antes de começar.

---

## 1. Fatos verificados

Conferidos em 2026-11-07.

| # | Fato | Onde |
|---|---|---|
| F-01 | Ambiente local: Node 22.22, npm 10.9, pnpm 11.0. `gh` autenticado como `erickhwk`. Repositório alvo: `erickhwk/judisys-demo`. | `node -v`, `pnpm -v`, `gh api user` |
| F-02 | `~/code/judisys` ainda não é repositório git; tem só `docs/`. | `ls` |
| F-03 | Guia visual: `mcaa-app/docs/design/judisys/` tem `DESIGN.md` (tokens, tipografia, estrutura do dashboard e do login), `login.html`, `dashboard.html`, `telas/processo-novo.html`, `telas/processos-lista.html`, capturas em `referencias/` e 4 SVGs de logo em `assets/`. As telas usam SVG inline para ícones. | `ls -R` |
| F-04 | Os tokens do guia estão em `DESIGN.md` §Identidade (navy-900 `#0A1F4D`, gold-500 `#C8993F`, card com raio 18px etc.). Fontes: Inter e Poppins pelo Google Fonts. | `DESIGN.md` |
| F-05 | Lei 11.101/2005, texto compilado do Planalto (com a Lei 14.112/2020), conferido dispositivo a dispositivo para as regras da demo. O que diverge do PRD está na seção 2 (C-01 a C-09). Confirmados sem ressalva: art. 7º §§1º e 2º (o prazo de 45 dias conta **do fim** dos 15 dias), art. 8º (inclui impugnação contra "ausência de qualquer crédito"), art. 37 §2º, art. 41, art. 45 §§1º a 3º, art. 53, art. 56 §1º, art. 58 §1º, art. 189 §1º, I. | planalto.gov.br, `l11101.htm` |

---

## 2. Correções e complementos ao PRD

| # | PRD diz | Este documento fixa | Por quê |
|---|---|---|---|
| C-01 | RF-26: classes da falência terminam em "subordinados". | Acrescenta a classe **IX — juros vencidos após a decretação** (art. 83, IX, c/c art. 124). Lista completa: I trabalhistas (até 150 salários mínimos por credor) e acidentários; II garantia real (até o valor do bem); III tributários; VI quirografários (inclui saldos que excedem I e II e créditos com privilégio, §6º); VII multas; VIII subordinados; IX juros. IV e V estão revogados. Extraconcursais (art. 84) à parte. | F-05. |
| C-02 | RF-22: "Falência · Arrecadação · Início da realização do ativo: 60 dias · art. 99, §3º". | Duas linhas no lugar dela: **(a)** "Falência · Decretada · Plano detalhado de realização dos ativos: 60 dias · art. 99, §3º"; **(b)** "Falência · Arrecadação · Realização dos ativos: até 180 dias · art. 99, §3º". | A lei conta os 60 dias do termo de nomeação do AJ e os 180 dias de cada auto de arrecadação. A demo usa a data do marco "Decretada" como aproximação do termo de nomeação (C-06). |
| C-03 | RF-22: "Plano homologado · Fim da fiscalização: até 2 anos · art. 61". | Título "Fim do prazo de supervisão judicial: 2 anos", contado do marco "Plano homologado" (concessão da RJ). | O art. 61 é faculdade do juiz e vale para obrigações vencidas em até 2 anos da concessão; "fim da fiscalização" sugeria prazo do AJ. |
| C-04 | RF-22: objeções contam do plano apresentado ou da relação do AJ, o que for posterior. | Mantém a regra, registrando que é aproximação: a lei conta da publicação da relação do AJ (art. 55) ou, se o aviso de recebimento do plano (art. 53, p.ú.) sair depois, da publicação desse aviso. A demo usa a data do marco "Plano apresentado" no lugar do aviso. | F-05. |
| C-05 | RF-22: stay period de 180 dias. | Mantém. O prazo é prorrogável uma vez, por igual período (art. 6º, §4º); na demo a prorrogação se faz editando o vencimento do prazo, sem tela própria. | F-05. |
| C-06 | RF-22: relatório do AJ na falência em 40 dias do marco "Decretada". | Mantém, com a nota de que a lei conta da assinatura do termo de compromisso e permite prorrogar por igual período (art. 22, III, "e"). | F-05; mesma aproximação da C-02. |
| C-07 | RF-26: "Não sujeito (ex.: fiduciário, art. 49, §3º)". | Mantém a classe; o seed usa fiduciário, arrendador mercantil e vendedor com reserva de domínio. | O art. 49, §3º cobre os três. |
| C-08 | RF-36, requisito 3: "mais de 1/3 dos credores, computados como no art. 45". | Fixa a leitura: nas classes **I e IV**, mais de 1/3 dos presentes **por cabeça**; nas classes **II e III**, mais de 1/3 do **valor** presente **e** mais de 1/3 por cabeça. | "Computados na forma dos §§1º e 2º do art. 45" replica o critério de cada classe. |
| C-09 | RF-33: "percentual do valor presente e se passa de 50%". | A base é o valor total dos créditos **com direito a voto** da classe (RF-32); o numerador é o valor dos presentes. | Art. 37, §2º: "mais da metade dos créditos de cada classe, computados pelo valor". |
| C-10 | Seção 12: "aprovação do plano por termo de adesão, sem AGC (art. 45-A)". | Texto: "aprovação do plano por adesão de credores, sem AGC (arts. 45-A e 56-A)". | O art. 45-A fala em comprovação de adesão; o termo aparece no art. 56-A. |

---

## 3. Questões abertas

Nenhuma bloqueia a implementação.

**Q-01. Nome "Vértice Administração Judicial".** ~~Conferir se existe escritório real com esse nome.~~ Resolvida em 2026-11-07: o usuário pesquisou e só encontrou "Vértice Advocacia", nome diferente. O nome fica.

**Q-02. Curso das regras de negócio.** O usuário pediu, para depois, um material que explique as regras de RJ e falência usadas na demo. Fica fora das tarefas `DMO`.

---

## 4. Decisões

### 4.1 Decisões técnicas (fechadas com o usuário em 2026-11-07)

| # | Decisão |
|---|---|
| T-01 | **Dexie** sobre o IndexedDB, usado só dentro de `src/dados/`. |
| T-02 | **TanStack Query** sobre o repositório. Estado global só em Context (sessão e avisos). Sem Redux/Zustand. |
| T-03 | **React Router v8** com `createHashRouter`. (Revisado em 2026-11-07 na DMO-01: era v7; a v8 era a atual na instalação e mantém `createHashRouter`.) |
| T-04 | **react-hook-form + zod**. Os schemas zod validam formulários, o `seed.json` ao carregar e cada gravação no repositório. CPF, CNPJ e CNJ são refinamentos zod que chamam `src/regras/documentos.ts`. |
| T-05 | Datas sem hora: string `aaaa-mm-dd`, sem fuso. Carimbos (`criadoEm`, `atualizadoEm`, logs): ISO 8601 completo. Cálculo e formatação com **date-fns** e locale `ptBR`. |
| T-06 | `scripts/gerar-seed.ts` roda com `tsx` no build e grava `public/seed.json` (fora do git). O app baixa com `fetch` só quando precisa carregar. A versão do seed é um hash do conteúdo. Teste de determinismo. |
| T-07 | Devedoras e apelidos inventados à mão; credores com `@faker-js/faker` pt_BR e semente fixa (RF-47 ajustado no PRD). |
| T-08 | Tabela, calendário e diálogos (`<dialog>`) próprios; **cmdk** na busca; **lucide-react** nos ícones. |
| T-09 | PDF em `<iframe>` com URL de blob ou caminho público, e botão "Abrir em nova aba / baixar". |
| T-10 | **pnpm**, **Biome** (lint + formatação), TypeScript `strict`, Node 22 (`.nvmrc` e CI). |
| T-11 | Pastas da seção 5.1; estilos com **CSS Modules**. |
| T-12 | Repositórios genéricos com log automático na mesma transação; **serviços** para operações em várias coleções, cada um numa transação. |
| T-13 | `pode(papel, acao, modulo)` puro, aplicado na tela, na rota e no repositório/serviço. |
| T-14 | Filtro, busca e paginação em memória, dentro do repositório, com `normalizar()` compartilhado. Índice da busca global em memória, invalidado a cada gravação. |
| T-15 | CI com `actions/upload-pages-artifact` e `actions/deploy-pages`; Vite com `base: '/judisys-demo/'`. Playwright só com Chromium no CI. |
| T-16 | PDFs genéricos gerados por `scripts/gerar-pdfs.ts` (`pdf-lib`) e **commitados** em `public/anexos/`. |
| T-17 | Vitest em regras, repositórios e serviços (`fake-indexeddb`). Playwright: roteiro, analista e reset. Sem testes isolados de componentes. |
| T-18 | Versão gravada no navegador = `VERSAO_SCHEMA` + hash do seed. Qualquer diferença reseta. Sem migrações. |
| T-19 | `hoje()` e `agora()` únicos em `src/regras/relogio.ts`; nada chama `new Date()` fora dele. Regras recebem a data por parâmetro. Playwright usa `page.clock`. |

### 4.2 Decisões de implementação (SDD)

| # | Decisão | Motivo |
|---|---|---|
| T-20 | Duas camadas de armazenamento: `Armazenamento` (interface mínima: tabelas, `get`, `put`, `delete`, `porIndice`, `todos`, `transacao`) com duas implementações, `ArmazenamentoDexie` e `ArmazenamentoMemoria`; repositórios e serviços são escritos **uma vez** sobre a interface. | Log, permissão e validação ficam num só código; a suíte de repositório roda igual nas duas (PRD §10). |
| T-21 | IDs são strings. Seed: prefixo + número fixo (`prc-001`, `crd-0001`). Criados na demo: `crypto.randomUUID()`. | Seed determinístico e legível nos testes. |
| T-22 | Depois de **qualquer** gravação, `queryClient.invalidateQueries()` sem filtro. | Com este volume, recarregar tudo é imperceptível e elimina a classe de bug "tela que não atualizou". |
| T-23 | Exclusões: **processo** exclui em cascata marcos, prazos, credores, pedidos, AGCs (com presenças e votos) e informes, numa transação, gravando **um** log do processo com a contagem do que saiu. **Empresa** vinculada a processo não pode ser excluída (mensagem com os processos). **Credor** que votou em AGC encerrada não pode ser excluído; nos demais casos, presenças e votos dele em AGCs abertas saem junto. **Usuário** responsável por processo não pode ser excluído, e ninguém exclui a si mesmo. | Evita órfãos e 600 logs por exclusão; protege atas já registradas. |
| T-24 | Formato de data no seed: string `"@-12"` (data, D−12) e `"@-3T14:22"` (carimbo, D−3 às 14:22, horário local). O carregador troca toda string que case com `^@[+-]\d+(T\d{2}:\d{2})?$`. | Explícito, e o mesmo arquivo serve a qualquer "hoje" (D-04). |
| T-25 | Marcador de versão em `localStorage` (`judisys:versao`), lido antes de abrir o Dexie. Sem `localStorage` disponível, trata como versão diferente e recarrega o seed. | Permite apagar o banco antes de abrir com schema novo (T-18). |
| T-26 | Valor que vale para voto, instalação e quadro-resumo: `valorVigente(credor) = valorQgc ?? valorAj ?? 0`. Valor da relação do devedor nunca vota. | RF-32. |
| T-27 | "Avançar fase" oferece só fases **posteriores** à atual na ordem do RF-14 (pode pular fases) e, na RJ, as finais alternativas. Fase final (encerrada, convolada, desistência) não avança. A data do marco não pode ser anterior à do último marco. | Mantém a pilha de marcos (RF-15) em ordem. |
| T-28 | Prazos automáticos de marcos pulados **não** são criados. Ex.: avançar de "processamento deferido" direto para "plano apresentado" não cria os prazos do edital. | Prazo sem marco não tem data-base. |
| T-29 | Cenários da mesa de votação (RF-34) são funções puras com RNG injetável. Quando as presenças não permitem o cenário (ex.: cram down com uma única classe presente), nada muda e aparece "Este cenário não é possível com as presenças atuais". | Testável e sem resultado enganoso. |
| T-30 | O resumo da ata (RF-37) é gravado num campo `resumo` do informe (texto estruturado), exibido na tela do informe acima do PDF genérico. | O PDF anexado é genérico; o resumo é o que tem o resultado real. |
| T-31 | Requisito 1 do cram down (art. 58, §1º, I): a base é o valor dos votos sim + não dos presentes; abstenções e presentes sem voto ficam fora, como no art. 45 da demo (D-16). Decidido com o usuário em 2026-11-07 (DMO-05). | Coerência com a D-16; a letra do inciso ("todos os créditos presentes") incluiria as abstenções. |
| T-32 | Em 2ª convocação a AGC instala com qualquer número de presentes votantes, mas não com zero (DMO-05). | Sem presentes não há votação a registrar. |
| T-33 | Presente sem voto conta como abstenção nas regras puras (`resultadoAgc`); a tela bloqueia "Registrar resultado" enquanto houver presente sem voto (DMO-17). | Painel ao vivo continua simples e uma votação incompleta não vira aprovação. |
| T-34 | Na carga (DMO-08), depois de converter as datas relativas, cada RMA aberto vai para um dia 15 sem mudar de situação em relação a hoje: o que está em dia vence no primeiro dia 15 a partir de hoje; o vencido, no último dia 15 antes de hoje. A cadeia de cumpridos não muda (DMO-07, 2026-11-07; revisado na DMO-08: recalcular a partir do último cumprido deixava quase todo RMA vencido). | O deslocamento fixo do T-24 só acerta o dia 15 quando a demo é aberta na data-base do seed; a vitrine precisa manter as RJs de RMA vencido que o gerador projetou (SED-05). |
| T-35 | "Toda fase de cada tipo aparece" (RF-46, SED-03) vale para o histórico de marcos: com 8 RJs e 4 falências, algumas fases ficam sem processo parado nelas e aparecem com zero no funil do dashboard (DMO-07). | 19 fases para 12 processos. |
| T-36 | Revisão da T-23 (DMO-11, 2026-11-07): credor com **presença ou voto** em AGC encerrada não pode ser excluído; ao excluir um credor, os pedidos de crédito ligados a ele saem junto, cada um com seu log; quem não edita AGC (analista) não exclui credor com presença ou voto em AGC aberta ("Seu papel não permite esta ação"). | Excluir um presente mudaria a instalação de uma ata registrada; pedido sem credor ficaria órfão; INV-02. |
| T-37 | Título de prazo automático não é editável (só o vencimento, C-05/PRZ-11); o RMA é reconhecido por origem `automatico` + título. Desfazer "encerrada" recria o RMA no mês seguinte ao último vencimento, mesmo que já vencido (DMO-11). | Renomear um RMA quebraria a INV-05; RMA vencido mostra pendência real. |
| T-38 | Processo novo nasce na fase inicial do tipo ("Pedido" na RJ, "Decretada" na falência), com uma data só; as demais fases vêm por "Avançar fase". Exige ao menos uma empresa. O tipo não muda na edição. As empresas da criação entram num log `criou` do processo (DMO-12, 2026-11-07). | A pilha de marcos (T-27/T-28) fica simples de explicar; fases e marcos dependem do tipo; não aparece uma edição que o usuário não fez. |
| T-39 | Pedidos de crédito (DMO-15, 2026-11-07): a relação do AJ conta como publicada a partir do marco "Relação do AJ publicada" (RJ) ou "Quadro de credores" (falência), olhando os marcos; divergência ou habilitação ainda pendente depois da publicação só pode ser **rejeitada** (a relação publicada não muda, CRD-04, art. 8º); pedido de requerente de fora da lista cujo documento já é de um credor do processo é aplicado a esse credor. | Coerente com o seed e com o CRD-04. |
| T-40 | Documento do credor único por processo e classe (art. 41), decidido com o usuário em 2026-11-07 (AJ-04): o repositório recusa credor com CPF/CNPJ de outro do mesmo processo **na mesma classe** ("Já existe credor com este CPF/CNPJ nesta classe do processo"); em outra classe é aceito. O aviso do CRD-08 e o acolhimento de pedido de requerente fora da lista (T-39) só consideram o credor da classe pedida; sem ele, o acolhimento cria o credor nessa classe. Acolher pedido que reclassificaria um credor da lista para uma classe em que o mesmo documento já tem linha é recusado com mensagem própria ("Este credor já tem crédito na classe X deste processo; ajuste o valor na linha existente."), decidido com o usuário em 2026-11-07; somar na linha existente fica para a reescrita. | O mesmo credor pode ter créditos em classes diferentes (ex.: banco com garantia real até o valor do bem e o saldo quirografário), e o modelo grava uma linha por classe; o seed tem 18 casos assim nas falências. |

---

## 5. Arquitetura

### 5.1 Pastas

```
judisys-demo/
  .github/workflows/ci.yml
  .nvmrc                      22
  biome.json
  index.html                  meta robots noindex, fontes
  vite.config.ts              base '/judisys-demo/'
  playwright.config.ts
  public/
    robots.txt                Disallow: /
    anexos/*.pdf              T-16, commitados
    seed.json                 gerado no build, no .gitignore
  scripts/
    gerar-seed.ts
    gerar-pdfs.ts
    seed/                     listas de nomes, processos à mão, fábricas
  src/
    main.tsx, app.tsx, rotas.tsx    rotas.tsx junta os modulos/*/rotas.tsx (AJ-05)
    dados/
      armazenamento.ts        interface Armazenamento (T-20)
      dexie.ts                ArmazenamentoDexie + VERSAO_SCHEMA
      memoria.ts              ArmazenamentoMemoria
      schemas.ts              tipos e schemas zod de cada coleção
      repositorio.ts          repositório genérico (permissão, validação, log)
      servicos/               avancarFase, desfazerMarco, cumprirPrazo, decidirPedido,
                              registrarResultadoAgc, excluirProcesso, ...
      carga.ts                boot: versão, reset, fetch do seed, conversão de datas
      busca.ts                índice da busca global
      contexto.tsx            DadosProvider, hooks useRepo/useServico
    regras/
      relogio.ts, datas.ts, fases.ts, prazos.ts, votacao.ts, qgc.ts,
      documentos.ts, normalizar.ts, csv.ts, permissoes.ts, diff.ts
    modulos/
      entrada/ dashboard/ processos/ empresas/ credores/ agc/ prazos/
      informes/ usuarios/ logs/ busca/
                              cada um com rotas.tsx: rotas e conteúdo das abas do processo
    ui/
      Layout, MenuLateral, FaixaDemo, Rodape, Tabela, Paginacao, Filtros,
      Campo, Formulario, Dialogo, Confirmacao, Selo, Vazio, Erro, VisualizadorPdf
    estilos/
      tokens.css, global.css, impressao.css
  e2e/
    roteiro.spec.ts, analista.spec.ts, reset.spec.ts
```

### 5.2 Camadas e fluxo

```
tela (modulos/) ──useQuery/useMutation──► repositório / serviço (dados/) ──► Armazenamento (Dexie | memória)
                                              │
                                              ├─ pode() ............ regras/permissoes.ts
                                              ├─ schema.parse() .... dados/schemas.ts
                                              ├─ diff() + log ...... regras/diff.ts
                                              └─ cálculos .......... regras/*.ts (puras)
```

- **`src/regras/`** não importa nada de `dados/`, `modulos/`, React ou Dexie.
- **`src/modulos/`** não importa Dexie nem `Armazenamento`; fala só com repositórios e serviços via `dados/contexto.tsx`.
- **Contexto de gravação:** todo repositório e serviço é criado com `{ usuario, papel, agora }` da sessão; é daí que saem o autor do log e a checagem de permissão.

### 5.3 Interfaces

```ts
// dados/armazenamento.ts
interface Armazenamento {
  get<T>(tabela: Tabela, id: Id): Promise<T | undefined>;
  put<T>(tabela: Tabela, registro: T): Promise<void>;
  delete(tabela: Tabela, id: Id): Promise<void>;
  porIndice<T>(tabela: Tabela, indice: string, valor: unknown): Promise<T[]>;
  todos<T>(tabela: Tabela): Promise<T[]>;
  transacao<R>(tabelas: Tabela[], fn: () => Promise<R>): Promise<R>;
  limpar(): Promise<void>;
}

// dados/repositorio.ts
interface Filtro<T> {
  onde?: Partial<Record<keyof T, unknown>>;   // igualdade, usa índice quando houver
  busca?: string;                             // normalizada, nos campos de busca da coleção
  ordem?: { campo: keyof T; direcao: 'asc' | 'desc' };
  pagina?: number;                            // 1-based
  porPagina?: number;                         // padrão 50
}
interface Pagina<T> { itens: T[]; total: number; pagina: number; paginas: number }

interface Repositorio<T extends Registro> {
  listar(filtro?: Filtro<T>): Promise<Pagina<T>>;
  todos(filtro?: Omit<Filtro<T>, 'pagina' | 'porPagina'>): Promise<T[]>;   // CSV, resumos
  buscar(id: Id): Promise<T | undefined>;
  criar(dados: Novo<T>): Promise<T>;
  atualizar(id: Id, mudancas: Partial<Novo<T>>): Promise<T>;
  excluir(id: Id): Promise<void>;
}
```

`Registro` = `{ id, escritorioId, criadoEm, atualizadoEm }`. `Novo<T>` omite esses quatro campos; o repositório os preenche.

### 5.4 Schema do IndexedDB (Dexie)

`VERSAO_SCHEMA = 1`. Índices (sintaxe do Dexie; o primeiro é a chave):

| Tabela | Índices |
|---|---|
| `escritorios` | `id` |
| `usuarios` | `id, papel` |
| `empresas` | `id, cnpj` |
| `processos` | `id, tipo, faseAtual, responsavelId` |
| `processoEmpresas` | `id, processoId, empresaId` |
| `marcosDeFase` | `id, processoId` |
| `prazos` | `id, processoId, vencimento, status` |
| `credores` | `id, processoId, classe, documento` |
| `pedidosDeCredito` | `id, processoId, credorId, status` |
| `agcs` | `id, processoId, status` |
| `presencas` | `id, agcId, credorId, [agcId+credorId]` |
| `votos` | `id, agcId, credorId, [agcId+credorId]` |
| `informes` | `id, processoId, categoria, data` |
| `arquivos` | `id` (blobs de uploads) |
| `logs` | `id, data, usuarioId, colecao, processoId` |

- `processoEmpresas` substitui o `empresaIds[]` do PRD §6 para indexar "processos da empresa" (RF-17). Não vira coleção visível nem gera log próprio: segue o log do processo.
- **Anexo** de informe: `{ origem: 'publico', caminho: 'anexos/edital.pdf', nome }` (seed) ou `{ origem: 'local', arquivoId, nome, tipo, tamanho }` (upload).

### 5.5 Carga e reset

Boot (`dados/carga.ts`), antes de renderizar as rotas:

1. Ler `judisys:versao` do `localStorage`.
2. Baixar `seed.json` **só** se for preciso carregar; para comparar a versão, ler `seed-versao.json` (gerado junto, poucos bytes).
3. Versão igual e banco abre → segue.
4. Versão diferente ou ausente → `Dexie.delete`, abrir, converter datas (T-24), validar com zod, gravar tudo numa transação, gravar a versão. Se havia versão anterior (não é primeira visita), mostrar o aviso do RF-03.
5. IndexedDB não abre → `ArmazenamentoMemoria` com o seed e o aviso na faixa (PRD §13).

Reset manual (RF-02): `limpar()` + passos 4 e volta ao dashboard, sem o aviso de versão.

### 5.6 Rotas

| Rota | Tela | Permissão |
|---|---|---|
| `#/entrar` | Login (RF-05) | pública |
| `#/` | Dashboard | ler |
| `#/processos` · `/novo` · `/:id/editar` | Lista e formulário | ler · editar processos |
| `#/processos/:id/{visao-geral,empresas,credores,prazos,agc,informes,historico}` | Tela do processo (RF-13); aba AGC só em RJ | ler |
| `#/processos/:id/credores/:credorId` | Credor e pedidos (RF-27, RF-29) | ler credores |
| `#/processos/:id/agc/:agcId` | Presença, votação e resultado (RF-32 a RF-37) | ler agc |
| `#/processos/:id/qgc` | QGC para impressão (RF-30), sem layout | ler credores |
| `#/empresas` · `/novo` · `/:id` | Empresas | ler · editar empresas |
| `#/informes` · `/novo` · `/:id` | Informes | ler · editar informes |
| `#/agenda?vista=lista\|calendario` | Agenda (RF-25) | ler prazos |
| `#/usuarios` | Usuários (RF-39) | ler usuarios |
| `#/logs` | Logs (RF-42) | ler logs |
| qualquer outra | "Página não encontrada" | — |

Rota sem sessão → `#/entrar`. Rota sem permissão → "Seu papel não permite esta ação" (RF-40).

### 5.7 Funções puras principais (`src/regras/`)

| Arquivo | Funções |
|---|---|
| `fases.ts` | `FASES_RJ`, `FASES_FALENCIA`, `FASES_FINAIS`, `fasesSeguintes(tipo, faseAtual)` (T-27) |
| `prazos.ts` | `prazosDoMarco(processo, marco, marcos)` (tabela do RF-22 corrigida por C-02/C-03), `proximoRma(dataReferencia)`, `situacao(prazo, hoje)` → `cumprido \| vencido \| urgente \| normal` |
| `votacao.ts` | `credoresVotantes(credores)`, `instalacao(votantes, presentes, convocacao)`, `resultadoClasse(classe, votos)`, `resultadoAgc(...)`, `cramDown(...)`, `cenario(nome, presentes, rng)` |
| `qgc.ts` | `valorVigente(credor)`, `resumoPorClasse(credores, coluna)`, `variacao(credor)` |
| `documentos.ts` | `validarCpf`, `validarCnpj`, `validarCnj`, `formatarCpf/Cnpj/Cnj` |
| `normalizar.ts` | `normalizar(texto)`: minúsculas, sem acentos, sem `.-/` e espaços extras |
| `csv.ts` | `gerarCsv(colunas, linhas)` (RF-44 do PRD, com BOM e escape) |
| `permissoes.ts` | `pode(papel, acao, modulo)` com a tabela do RF-39 |
| `diff.ts` | `diferencas(antes, depois)` → `{campo, de, para}[]`, ignorando `atualizadoEm` |
| `relogio.ts` | `hoje()`, `agora()` |

### 5.8 CI e publicação

`.github/workflows/ci.yml`:

- **Em PR e push na `main`:** `pnpm install --frozen-lockfile` → `biome ci` → `tsc --noEmit` → `vitest run` → `gerar-seed` → `vite build` → Playwright (Chromium) contra `vite preview`.
- **Só em push na `main`:** `upload-pages-artifact` (`dist/`) → `deploy-pages`.
- Passo manual, uma vez: em Settings → Pages do repositório, fonte **GitHub Actions**.

---

## 6. Invariantes

| # | Invariante |
|---|---|
| INV-01 | Toda criação, edição e exclusão feita por repositório ou serviço grava log na **mesma transação**. Se a gravação falha, não há log; se o log falha, não há gravação. |
| INV-02 | Nenhuma gravação passa sem `pode(papel, 'editar', modulo)` verdadeiro, mesmo chamada fora da tela. |
| INV-03 | Valores monetários são inteiros em centavos em todo o código e no armazenamento; só a formatação os converte. |
| INV-04 | Os marcos de um processo, ordenados por data, seguem a ordem de fases do RF-14; a fase atual é a do último marco. |
| INV-05 | Toda RJ fora das fases finais e já com "processamento deferido" tem exatamente **um** prazo de RMA aberto. |
| INV-06 | Credor da classe "Não sujeito", com valor vigente zero ou de classe extraconcursal nunca vota nem conta para instalação ou quórum. |
| INV-07 | O seed gerado duas vezes é idêntico byte a byte. |
| INV-08 | Nenhum código fora de `src/regras/relogio.ts` cria `Date` a partir do relógio do sistema. |
| INV-09 | Nenhuma requisição de rede além de: arquivos do próprio site (`seed.json`, `seed-versao.json`, `anexos/`), Google Fonts e o link do WhatsApp aberto pelo usuário. |

---

## 7. Comportamento por área

### 7.1 Carga, versão e reset — CAR

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| CAR-01 | F | primeira visita (sem `judisys:versao`) | abrir a demo | Baixa o seed, converte datas, grava, mostra o login. Sem aviso de versão. |
| CAR-02 | F | versão gravada igual à publicada | abrir | Não baixa `seed.json`; dados alterados antes continuam lá. |
| CAR-03 | F | versão gravada diferente (seed ou `VERSAO_SCHEMA` mudou) | abrir | Apaga o banco, recarrega, mostra "A demo foi atualizada e os dados foram restaurados." (RF-03). |
| CAR-04 | F | dados alterados | "Resetar demo" → confirmar | Banco volta ao seed com datas recalculadas para hoje; vai ao dashboard; uploads somem (RF-02). |
| CAR-05 | B | dados alterados | "Resetar demo" → cancelar | Nada muda. |
| CAR-06 | F | seed com `"@-12"` e `"@-3T14:22"`, hoje = 2026-11-07 | carga | `2026-10-26` e `2026-11-04T14:22` (horário local, ISO). |
| CAR-07 | B | seed com string que só parece data (`"@abc"`, `"email@x"`) | carga | Não convertida. |
| CAR-08 | T | `seed.json` inválido para o schema zod | carga | Tela de erro "Não foi possível carregar a demo", sem banco pela metade. |
| CAR-09 | T | falha de rede ao baixar o seed | carga | Mesma tela de erro, com botão "Tentar de novo". |
| CAR-10 | B | IndexedDB não abre | carga | Usa memória; faixa mostra "suas alterações não serão salvas nesta aba". |
| CAR-11 | T | cota cheia ao gravar um anexo | salvar informe | Só essa gravação falha, com "Não há espaço no navegador para este anexo. Resetar a demo libera o espaço."; o resto continua no IndexedDB. |
| CAR-12 | B | `localStorage` indisponível | abrir | Recarrega o seed a cada abertura (T-25); sem aviso de versão. |

### 7.2 Sessão e permissões — PER

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| PER-01 | F | — | "Entrar como Analista" | Sessão no `sessionStorage`; vai ao dashboard; menu da conta mostra nome e papel. |
| PER-02 | F | qualquer papel | "Trocar de papel" | Limpa a sessão e volta ao login (RF-06). |
| PER-03 | F | analista | tela de processo | Sem botões de criar, editar, excluir, avançar ou desfazer fase. Credores: botões de edição presentes. |
| PER-04 | T | analista | abrir `#/processos/novo` direto | "Seu papel não permite esta ação" (RF-40). |
| PER-05 | T | analista | chamar `processos.criar()` por código | Erro de permissão; nada gravado, nenhum log (INV-02). |
| PER-06 | F | advogado | `#/usuarios` | Lista e tabela de permissões, sem botões de edição. |
| PER-07 | F | analista | `#/logs`, aba Histórico, dashboard | Vê os três (PRD RF-39). |
| PER-08 | T | sem sessão | abrir qualquer rota interna | Vai para `#/entrar`. |
| PER-09 | B | sessão em uma aba | abrir outra aba | Nova aba pede login (sessão é por aba). |

### 7.3 Processos e fases — PRC

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| PRC-01 | F | RJ em "processamento deferido" | avançar para "edital de credores publicado" em D | Marco gravado; fase atual muda; prazos de habilitações (D+15) e relação do AJ (D+60) criados. |
| PRC-02 | F | RJ em "pedido" | avançar para "processamento deferido" em D | Stay (D+180), plano (D+60), AGC (D+150) e RMA (próximo dia 15 depois de D) criados. |
| PRC-03 | F | RJ com relação do AJ em D1 e plano em D2 > D1 | avançar para "plano apresentado" em D2 | Objeções em D2+30. |
| PRC-04 | B | plano em D1, relação do AJ publicada depois em D2 | avançar para "relação do AJ publicada" | Objeções em D2+30, criado pelo marco da relação. Vale só para a regra pura (`prazosDoMarco`): pela T-27 a relação nunca vem depois do plano, então a tela não gera este caso (decidido com o usuário em 2026-11-07, DMO-04). |
| PRC-05 | F | falência "decretada" em D | criar | Habilitações D+15, relatório do AJ D+40, plano de realização dos ativos D+60 (C-02). |
| PRC-06 | F | falência em "arrecadação" em D | avançar | Realização dos ativos D+180 (C-02). |
| PRC-07 | B | RJ em "processamento deferido" | avançar direto para "plano apresentado" | Só os prazos de "plano apresentado" são criados (T-28). |
| PRC-08 | T | último marco em D | avançar com data D−1 | Erro de validação "A data não pode ser anterior ao último marco." (T-27). |
| PRC-09 | T | processo "encerrada" ou "convolada em falência" | abrir "Avançar fase" | Botão ausente. |
| PRC-10 | F | último marco criou 2 prazos, 1 cumprido | desfazer | Confirmação lista 1 prazo; após confirmar, remove o marco e o prazo aberto; o cumprido fica; fase volta à anterior; log gravado (RF-15). |
| PRC-11 | B | processo com um único marco | abrir ações | "Desfazer" ausente (o primeiro marco é a criação). |
| PRC-12 | F | lista de processos | buscar "aurora" / número CNJ sem pontuação / razão social de empresa | Encontra o processo nos três casos (RF-11, T-14). |
| PRC-13 | F | processo com credores, prazos, AGC e informes | excluir → confirmar | Tudo em cascata numa transação; um log com a contagem (T-23). |
| PRC-14 | T | número CNJ com dígito verificador errado | salvar | Erro no campo. |
| PRC-15 | F | — | criar RJ sem marcar fase | Começa em "pedido", com marco na data informada. |

### 7.4 Prazos e agenda — PRZ

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| PRZ-01 | F | RMA aberto com vencimento 15/11 | marcar cumprido | RMA de 15/12 criado (PRD RF-22). |
| PRZ-02 | B | RMA de 15/12 | marcar cumprido | Próximo vence em 15/01 do ano seguinte. |
| PRZ-03 | B | processo foi para "convolada em falência" | marcar o RMA aberto como cumprido | Nenhum RMA novo (INV-05 só vale para RJ ativa). |
| PRZ-04 | F | RJ avança para "encerrada" | avançar | RMA aberto continua aberto; nenhum novo é gerado depois. |
| PRZ-05 | B | marco "processamento deferido" em 15/11 | criar prazos | RMA vence em 15/12 (o "próximo dia 15" é estritamente posterior à data do marco). |
| PRZ-06 | F | prazo aberto vencido ontem / vence em D+3 / vence em D+4 | listar | Vermelho / dourado / normal (RF-24). |
| PRZ-07 | B | prazo cumprido vencido | listar | Sem destaque, com selo "cumprido". |
| PRZ-08 | F | agenda | filtro "7 dias" | Prazos abertos com vencimento entre hoje e D+7, inclusive. "Vencidos" lista abertos com vencimento < hoje. |
| PRZ-09 | F | calendário de novembro | abrir | Cada dia mostra os prazos; clicar leva ao prazo; navegação mês a mês. |
| PRZ-10 | F | prazo manual sem base legal | salvar | Aceito; base legal opcional (RF-23). |
| PRZ-11 | B | prazo automático | editar vencimento | Permitido (é como se prorroga o stay, C-05); origem continua `automatico`; log grava de/para. |

### 7.5 Credores, pedidos e QGC — CRD

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| CRD-01 | F | processo vitrine | aba Credores | Quadro-resumo por classe (quantidade, valor, %) acima da lista; paginação de 50 (RF-28). |
| CRD-02 | F | credor com 100.000,00 / 120.000,00 / — | abrir | Os três valores e a variação "+20,00%" entre devedor e AJ; QGC "—" (RF-27). |
| CRD-03 | F | divergência pendente, relação do AJ não publicada | acolher | Valor e classe na relação do AJ atualizados; pedido `acolhido`; log com de/para (RF-29). |
| CRD-04 | F | impugnação pendente | acolher | Valor e classe no **QGC** atualizados; relação do AJ intacta. |
| CRD-05 | F | habilitação de requerente fora da lista | acolher | Credor criado: devedor 0, AJ = pedido, classe pedida; pedido vinculado ao novo credor. |
| CRD-06 | F | impugnação de requerente fora da lista | acolher | Credor criado: devedor 0, AJ 0, QGC = pedido. |
| CRD-07 | F | pedido de requerente fora da lista | rejeitar | Só o status muda; nenhum credor criado. |
| CRD-08 | B | requerente com CPF de credor já existente no processo e na mesma classe | registrar pedido | Aviso "Já existe credor com este CPF/CNPJ nesta classe do processo" e opção de vincular a ele. Com o documento só em outra classe, o pedido segue sem aviso (T-40). |
| CRD-09 | T | pedido já decidido | tentar decidir de novo | Ação ausente; por código, erro. |
| CRD-10 | B | relação do AJ já publicada | registrar pedido | Tipo oferecido é só "impugnação" (divergência e habilitação só antes). |
| CRD-11 | F | 600 credores, filtro classe III | exportar CSV | Todas as linhas da classe III, não só a página (PRD RF-44). |
| CRD-12 | F | QGC para impressão | abrir | Cabeçalho, grupos por classe, subtotais e total geral iguais ao quadro-resumo, em centavos (RF-30). |
| CRD-13 | B | soma de 3 créditos de R$ 0,10, R$ 0,20 e R$ 0,30 | total | R$ 0,60 exato (INV-03). |
| CRD-14 | T | credor que votou em AGC encerrada | excluir | Recusado com mensagem (T-23). |
| CRD-15 | F | falência | aba Credores | Classes C-01; extraconcursais em bloco separado, fora do total do QGC concursal. |
| CRD-16 | T | CPF com dígito inválido | salvar credor | Erro no campo. |

### 7.6 AGC — AGC

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| AGC-01 | F | AGC com data futura | abrir | Aviso "Simulação: a data da AGC ainda não chegou"; presença e votação habilitadas (RF-31). |
| AGC-02 | F | — | "todos da classe II" | Todos os credores votantes da classe II marcados presentes (RF-32). |
| AGC-03 | F | 1ª convocação; presentes com 60% do valor votante de cada classe | painel de instalação | Todas as classes "acima de 50%"; AGC pode ser instalada (RF-33, C-09). |
| AGC-04 | B | 1ª convocação; classe III com exatamente 50% | painel | Classe III não atinge; AGC não instala em 1ª. |
| AGC-05 | F | 2ª convocação, um único presente | instalar | Instala (art. 37, §2º). |
| AGC-06 | B | classe sem credores votantes no processo | painel | Classe aparece como "sem credores" e não bloqueia a instalação. |
| AGC-07 | F | classe I: 3 sim, 2 não | resultado | Aprovada por cabeça (RF-35). |
| AGC-08 | F | classe III: valor sim 60%, cabeça sim 2 de 5 | resultado | Rejeitada (falha na cabeça). |
| AGC-09 | B | classe II: valor sim exatamente 50% | resultado | Rejeitada (empate é rejeição). |
| AGC-10 | B | classe I: 2 sim, 1 não, 3 abstenções | resultado | Aprovada (abstenções fora da base, D-16). |
| AGC-11 | B | classe IV: todos os presentes se abstêm | resultado | "Não votou"; não conta como classe votante. |
| AGC-12 | F | 4 classes votam, III rejeita; total sim > 50% do valor presente; III com > 1/3 por valor e por cabeça | cram down | Três requisitos cumpridos; "passível de cram down" (RF-36, C-08). |
| AGC-13 | B | só 3 classes votam; 2 aprovam | cram down, requisito 2 | Cumprido. |
| AGC-14 | B | só 2 classes votam; 1 aprova | requisito 2 | Cumprido. |
| AGC-15 | T | 4 classes votam; 2 aprovam | requisito 2 | Não cumprido. |
| AGC-16 | B | classe IV rejeitou com exatamente 1/3 por cabeça | requisito 3 | Não cumprido ("mais de" 1/3). |
| AGC-17 | B | classe II rejeitou com > 1/3 por cabeça, mas ≤ 1/3 por valor | requisito 3 | Não cumprido (C-08). |
| AGC-18 | F | todas as classes votantes aprovam | painel | "Aprovado em todas as classes"; cram down não é mostrado. |
| AGC-19 | F | presenças do processo vitrine | cenário "Aprovação por cram down" | Votos preenchidos; painel mostra rejeição numa classe e cram down cumprido (T-29). |
| AGC-20 | T | só uma classe presente | cenário "Aprovação por cram down" | Nada muda; "Este cenário não é possível com as presenças atuais". |
| AGC-21 | F | votos lançados | "Registrar resultado" → confirmar | AGC encerrada; informe "Atas de AGC" criado com data, convocação, resultado por classe e cram down no `resumo`, com o PDF genérico de ata (RF-37, T-30). |
| AGC-22 | T | AGC encerrada | abrir | Presença e votos só leitura. |
| AGC-23 | T | AGC não instalada | "Registrar resultado" | Botão desabilitado com o motivo. |
| AGC-24 | B | credor da classe "Não sujeito" ou com valor zero | lista de presença | Aparece desabilitado, com o motivo (INV-06). |

### 7.7 Dashboard — DSH

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| DSH-01 | F | seed recém-carregado | abrir | Números do topo: processos ativos por tipo, passivo (soma dos valores na relação do AJ dos processos ativos), credores, prazos vencidos e em 7 dias, todos > 0 (RF-07, RF-46). |
| DSH-02 | F | seed | abrir | AGC do processo vitrine em "próximas AGCs", em D+6. |
| DSH-03 | F | seed | próximos prazos | 8 itens, vencidos primeiro, depois por data (RF-10). |
| DSH-04 | F | alterar um credor | voltar ao dashboard | Passivo e atividade recente refletem a mudança (T-22). |
| DSH-05 | B | processo em fase final | números | Fora de "ativos" e do passivo. |

### 7.8 Busca global — BUS

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| BUS-01 | F | — | Ctrl+K / ⌘K | Abre a busca com foco no campo (RF-38). |
| BUS-02 | F | credor "José Conceição" | digitar "jose conceicao" | Encontrado (sem acento, minúsculas). |
| BUS-03 | F | CNPJ `12.345.678/0001-90` | digitar `12345678000190` | Empresa encontrada. |
| BUS-04 | B | 30 credores casam | digitar | No máximo 5 por grupo. |
| BUS-05 | F | resultados | ↓ ↓ Enter | Navega até o registro. |
| BUS-06 | F | credor criado agora | buscar o nome | Encontrado (índice invalidado, T-14). |

### 7.9 Logs — LOG

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| LOG-01 | F | editar o valor AJ de um credor | salvar | Log com usuário, `credores`, id, `processoId`, mudança `{valorAj, de, para}` (RF-41). |
| LOG-02 | B | salvar sem mudar nada | salvar | Nenhum log. |
| LOG-03 | F | registro excluído | clicar no link do log | "Registro não existe mais", sem erro (RF-42). |
| LOG-04 | F | seed | tela de logs | ~60 dias de histórico; filtros por usuário, módulo, processo e período (RF-43). |
| LOG-05 | T | gravação falha na validação | salvar | Nenhum log (INV-01). |

### 7.10 Exportação CSV — CSV

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| CSV-01 | F | qualquer lista | exportar | Arquivo começa com BOM, separador `;`, nome `judisys-<módulo>-aaaa-mm-dd.csv`. |
| CSV-02 | B | valor 123456 centavos | exportar | `1234,56`. |
| CSV-03 | B | nome com `;` e aspas: `Silva; "Filho"` | exportar | `"Silva; ""Filho"""`. |
| CSV-04 | B | CPF `01234567890` | exportar | `012.345.678-90`. |

### 7.11 Informes e anexos — INF

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| INF-01 | F | novo informe num processo em "AGC" | abrir formulário | Fase preenchida com "AGC", editável (RF-19). |
| INF-02 | F | categoria "Atas de AGC" | formulário | Campo "Data da AGC" aparece; some nas outras categorias (RF-18). |
| INF-03 | F | upload de PDF de 2 MB | salvar e abrir | Abre no visualizador (RF-21, T-09). |
| INF-04 | T | upload de 11 MB | escolher arquivo | Recusado: "Arquivo acima de 10 MB." |
| INF-05 | F | anexo `.docx` | clicar | Baixa o arquivo. |
| INF-06 | F | lista | abrir | Ordem por data, mais recente primeiro; selo "publicado no site" quando marcado (RF-19, RF-20). |

### 7.12 Seed — SED

| ID | Tipo | Dado | Quando | Então |
|---|---|---|---|---|
| SED-01 | F | — | gerar o seed duas vezes | Arquivos idênticos (INV-07). |
| SED-02 | F | seed | validar | Todos os CPF, CNPJ e CNJ passam nos validadores. |
| SED-03 | F | seed | contar | 12 processos (8 RJ, 4 falências); toda fase de cada tipo aparece; ~1.500 credores; ~40 empresas; ~80 informes; 6 usuários (RF-46). |
| SED-04 | F | processo vitrine | conferir | Consolidação substancial, 4 a 6 empresas, ~600 credores em todas as classes RJ, fase "plano apresentado" com relação do AJ publicada, AGC em 1ª convocação em `@+6`, 3 impugnações pendentes. |
| SED-05 | F | seed | conferir | Ao menos um prazo aberto vencido, um vencendo hoje e um em `@+1..+7`; alguma RJ com RMA vencido. |
| SED-06 | F | seed | conferir | Cada RJ ativa com "processamento deferido" tem exatamente um RMA aberto (INV-05). |
| SED-07 | F | seed | conferir | Os logs referenciam registros existentes e usuários do escritório. |

---

## 8. Fora de escopo (registrado para não reabrir)

- Migração de dados entre versões (T-18).
- Testes isolados de componentes React (T-17).
- Firefox e Safari no CI (T-15); conferência manual antes de divulgar.
- Feriados, suspensões e prorrogação automática de prazos (PRD §12, C-05).
- Tratamento diferenciado na classe que rejeitou (art. 58, §2º) no cram down.
- Sincronização entre abas: alterações numa aba aparecem na outra só ao recarregar.

---

## 9. Matriz de rastreabilidade (RF → casos)

| RF | Casos |
|---|---|
| RF-01 a RF-04 | CAR-01 a CAR-12 |
| RF-05, RF-06 | PER-01, PER-02 |
| RF-07 a RF-10 | DSH-01 a DSH-05 |
| RF-11 a RF-15 | PRC-01 a PRC-15 |
| RF-16, RF-17 | T-23, CSV-01 |
| RF-18 a RF-21 | INF-01 a INF-06, CAR-11 |
| RF-22 a RF-25 | PRC-01 a PRC-07, PRZ-01 a PRZ-11 |
| RF-26 a RF-30 | CRD-01 a CRD-16 |
| RF-31 a RF-37 | AGC-01 a AGC-24 |
| RF-38 | BUS-01 a BUS-06 |
| RF-39, RF-40 | PER-03 a PER-09 |
| RF-41 a RF-43 | LOG-01 a LOG-05 |
| RF-44 | CSV-01 a CSV-04, CRD-11 |
| RF-45 a RF-47 | SED-01 a SED-07 |
| RF-48, RF-49 | §5.8, INV-09 |

---

## 10. Notas de testabilidade

- **Vitest, regras:** cada função de `src/regras/` recebe `hoje` por parâmetro; nada de mock de relógio nesses testes.
- **Vitest, repositórios e serviços:** a mesma suíte roda duas vezes, com `ArmazenamentoMemoria` e com `ArmazenamentoDexie` sobre `fake-indexeddb` (`describe.each`). Usar um seed pequeno de fixture (`tests/fixtures/seed-mini.ts`), não o seed completo.
- **Contexto de gravação:** os testes criam repositórios com `{ usuario, papel, agora }` explícitos; é assim que se testa PER-05 e LOG-01.
- **Playwright:** `page.clock.setFixedTime(new Date('2026-11-07T10:00:00'))` antes de abrir a página; cada teste começa com o armazenamento limpo (contexto novo do navegador).
- **Marcações estáveis para asserção:** `data-testid` só onde texto ou papel ARIA não bastam (números do dashboard: `data-stat="passivo"`; resultado por classe: `data-classe="III"` com `data-resultado="aprovada|rejeitada|nao-votou"`).
- **E2E do roteiro (PRD §10):** entrar como AJ → processo vitrine → AGC → "todos de cada classe" → cenário "Aprovação por cram down" → registrar → ver a ata em Informes. Usa só dados do seed.
- **SED-01:** gerar em memória duas vezes e comparar as strings; não depende de disco.
