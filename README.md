# Judisys · demo

Demonstração estática do painel administrativo do Judisys. Roda só no navegador, sem backend: os dados vêm de um seed gerado no build e ficam no IndexedDB de quem abre a página.

**Endereço publicado:** https://judisys-demo.draft.dev.br (domínio próprio; o endereço antigo, https://erickhwk.github.io/judisys-demo/, redireciona para ele)

## Desenvolvimento

Requisitos: Node 22 (`.nvmrc`) e pnpm (versão fixada em `packageManager` no `package.json`; com Corepack, `corepack enable`).

```sh
pnpm install --frozen-lockfile
pnpm dev          # servidor local em http://localhost:5173/
```

| Comando | O que faz |
|---|---|
| `pnpm lint` | Biome (formatação e lint) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest |
| `pnpm seed` | Gera `public/seed.json` e `public/seed-versao.json` (fora do repositório), determinísticos, com datas relativas a hoje |
| `pnpm pdfs` | Regera os PDFs genéricos de `public/anexos/` (commitados); rode quando mudar `scripts/seed/anexos.ts` |
| `pnpm build` | Build de produção em `dist/` |
| `pnpm e2e` | Playwright (Chromium) contra `vite preview` na porta `PORTA_E2E` (padrão 4173); localmente faz o build antes |

## CI e publicação

O workflow `.github/workflows/ci.yml` roda em todo PR e em todo push na `main`:

1. `pnpm install --frozen-lockfile`
2. `biome ci`
3. `tsc --noEmit`
4. Vitest
5. Seed
6. `vite build`
7. Playwright (só Chromium) contra `vite preview`

Só no push na `main`, se tudo passou, o `dist/` é publicado no GitHub Pages (`actions/upload-pages-artifact` + `actions/deploy-pages`). PR nunca publica.

### Passo manual (uma vez)

No GitHub, em **Settings → Pages** do repositório `erickhwk/judisys-demo`, escolha a fonte **GitHub Actions** em "Build and deployment". Sem isso o job de publicação falha.

Na mesma tela, em **Custom domain**, fica `judisys-demo.draft.dev.br`, com **Enforce HTTPS** ligado. O DNS do `draft.dev.br` (registro.br) tem o CNAME `judisys-demo` → `erickhwk.github.io`. Com publicação por Actions, quem vale é essa configuração, não o arquivo `public/CNAME`, que fica no repositório só como registro. Por isso a base do Vite é `/`.
