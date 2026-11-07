# Handoff — Demo do Judisys (código DMO)

Data: 2026-11-07 (fim da noite). Responder sempre em pt-BR.

## Foco da próxima sessão

Duas frentes ao mesmo tempo:

1. **Lote 11 em segundo plano:** AJ-07, AJ-08 e AJ-09, com a `execucao-paralela`.
2. **Na conversa, com o usuário:** o domínio próprio `judisys-demo.draft.dev.br` para a DMO-25.

## Onde estamos

- Spec: `docs/prd-demo.md`, `docs/sdd-demo.md` (prevalece) e `docs/tasks-demo.md`. O cabeçalho deste último tem os lotes e o bloco **"Execução em paralelo"**, com os args fixos do workflow de lote, já com `--rolagem-interna` nas capturas.
- Repo público `erickhwk/judisys-demo` (`~/code/judisys`), publicado pelo CI em https://erickhwk.github.io/judisys-demo/ a cada push na `main`.
- `main` em `03f6dcf`, com 857 testes Vitest e 90 e2e verdes (suíte pós-merge). Não há worktrees nem branches locais além da `main`.
- Board: https://trello.com/b/ufNoQ9bK.
  - Concluído 🎉: DMO-01 a DMO-24 e AJ-01 a AJ-06. A DMO-24 tem o item RNF-02 (Firefox e Safari) desmarcado de propósito, com comentário: conferência manual do usuário, pendente.
  - Backlog: DMO-25.
  - A Fazer: AJ-07, AJ-08 e AJ-09. A spec de cada um é o próprio card (`trello.sh show AJ-0N`); AJ não tem seção no arquivo de tarefas.

## Frente 1: lote 11 (AJ-07 ∥ AJ-08 ∥ AJ-09)

| Card | O que é | Arquivos prováveis |
|---|---|---|
| AJ-07 https://trello.com/c/TywhVZpA | Busca de Credores perde caracteres (campo controlado pela URL). Bug, achado na DMO-23. | `src/modulos/credores/` (aba e busca), e2e de credores |
| AJ-08 https://trello.com/c/nwCyZ4cu | Trilha da `TelaCredor` num `nav` "Trilha". Conferir antes se o `CabecalhoPagina` da AJ-02 já resolveu; o card pode fechar sem código. | `src/ui/CabecalhoPagina.tsx`, `src/modulos/credores/TelaCredor.tsx`, `e2e/roteiro.spec.ts` (tirar o `getByRole('main')`) |
| AJ-09 https://trello.com/c/JyUV6mnp | Specs e2e antigos importam os helpers de `e2e/apoio.ts` (DMO-24). | `e2e/*.spec.ts`, `e2e/apoio.ts` |

- **Conflitos dentro do lote:** AJ-08 e AJ-09 podem se encontrar em `e2e/roteiro.spec.ts`, e AJ-07 e AJ-09 em `e2e/credores.spec.ts`. Fixe no `contexto` quem mexe em quê, ou ponha a AJ-09 em cadeia depois das outras.
- **Conflito com a frente 2:** se o domínio próprio mudar a base do Vite, ele mexe em `playwright.config.ts` e `e2e/apoio.ts`. A AJ-09 também mexe no `e2e/apoio.ts`. Faça a mudança de base depois do merge do lote, ou na própria sessão, num arquivo que nenhum agente toque.
- **Workflow:** copie o `workflow-lote.js` da skill para o scratchpad antes de disparar (pegadinha abaixo).
- **Tamanho:** são tarefas pequenas, de 6 a 9 min cada. Nenhuma precisa de `visual: true`, salvo se a AJ-08 mudar a trilha visualmente.

## Frente 2: domínio próprio da demo (DMO-25)

O que já se sabe (conferido em 2026-11-07):

- **O botão já existe no site:** "Quero testar o Judisys" está em `~/code/draft-site/index.html`, apontando para `https://judisys-demo.draft.dev.br`.
  - Está **sem commit**, na branch `ajustes-conteudo`, junto com outras mudanças de conteúdo do usuário.
  - O commit e o deploy do site são do usuário.
- **`judisys-demo.draft.dev.br` não tem DNS:** nem CNAME, nem A.
- **O GitHub Pages não tem domínio próprio:** `gh api repos/erickhwk/judisys-demo/pages` dá `cname: null`.
- **A demo só roda sob `/judisys-demo/`:** o caminho está fixo em vários lugares:
  - `vite.config.ts` (`base`);
  - `playwright.config.ts` (`baseURL` e `webServer.url`);
  - `e2e/apoio.ts` (a checagem da INV-09 aceita só o que está sob a base);
  - `README.md`;
  - `src/ui/catalogo/Catalogo.tsx` (comentário);
  - o SDD, na T-15 e na §5.1.

Passos, a confirmar com o usuário (o DNS é com ele):

1. Saber em que provedor está o DNS de `draft.dev.br` e criar o **CNAME** `judisys-demo` → `erickhwk.github.io`.
2. Num AJ novo (próximo número livre: `trello.sh next AJ`, provavelmente AJ-10), mudar a base para `/`:
   - `base: '/'` no `vite.config.ts`;
   - `public/CNAME` com `judisys-demo.draft.dev.br`;
   - `playwright.config.ts` e `e2e/apoio.ts` acompanhando;
   - README;
   - SDD (T-15 e §5.1), num commit `docs`.
3. Configurar o domínio no Pages (`gh api -X PUT repos/erickhwk/judisys-demo/pages -f cname=judisys-demo.draft.dev.br`) e ligar o HTTPS depois que o certificado sair. É ação externa: confirmar com o usuário antes.
4. Conferir que `https://judisys-demo.draft.dev.br` abre a demo. O endereço antigo do github.io passa a redirecionar.
5. DMO-25: marcar os itens do card quando o botão do site estiver no ar e abrindo a demo. Mover para Concluído 🎉 com o ok do usuário.

Se o DNS demorar a propagar, a alternativa já discutida é trocar o link do botão pelo endereço do github.io.

## Decisões anteriores que continuam valendo

O detalhe está nos corpos dos PRs #24 a #31 e no SDD (T-40):

- AGC encerrada recalcula o resultado na tela, e a ata é o registro oficial.
- O documento do credor é único por processo e classe.
- RNF-03 vale no Fast 4G.
- Os itens marcados "a rever na reescrita" estão nos PRs.
- Sem meta de cobertura de testes no CI (memória `feedback_cobertura`).

## Pegadinhas

- **PR empilhado:** mergear o de baixo **apagando a branch**, senão o de cima entra nela, e não na `main`. Aconteceu com o #28 e o #29; os PRs #30 e #31 corrigiram.
- Este `docs/handoff.md` fica sem commit na `main`. Commite junto com a primeira branch da próxima sessão.
- Copie o `workflow-lote.js` da skill para o scratchpad **de novo** a cada lote. O primeiro disparo do lote 10 usou uma cópia velha.
- **Teste intermitente:** uma falha em 821 apareceu uma vez na `main` e não voltou em 10 rodadas. A suíte pós-merge agora grava log; se repetir, o log diz qual é.
- O `/code-review` em fork pode voltar vazio. Nesse caso revise à mão ou rode de novo; não trate como "sem achados".
- No fim do lote: `pgrep -fl preview`, `git worktree prune` e remover as branches `worktree-wf_*`. Os `http.server` nas portas 8000 e 8765 não são do judisys; não derrube.

## Skills sugeridas

Leia este arquivo no início da sessão.

- `execucao-paralela`: lote 11 (AJ-07 a AJ-09).
- `sdd-para-trello`:
  - mover os cards dos AJ;
  - criar o AJ do domínio;
  - atualizar a DMO-25 (Concluído com o ok do usuário).
- `simplify`, `revisao-spec`, `code-review`, `security-review`: checklist antes do PR do AJ do domínio, que é feito na sessão, fora do workflow. Diff pequeno, então os passos 1, 2 e 4 podem ir numa passada só.
- `comparacao-visual`: só se a AJ-08 mudar a trilha visualmente (com `--rolagem-interna`).
- `retro` ao fim do lote 11; `handoff` ao encerrar.
