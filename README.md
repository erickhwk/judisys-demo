# Judisys · demo

Demonstração estática do painel administrativo do Judisys. Roda só no navegador, sem backend: os dados vêm de um seed gerado no build e ficam no IndexedDB de quem abre a página.

**Endereço publicado:** https://erickhwk.github.io/judisys-demo/

## Desenvolvimento

Requisitos: Node 22 (`.nvmrc`) e pnpm (versão fixada em `packageManager` no `package.json`; com Corepack, `corepack enable`).

```sh
pnpm install --frozen-lockfile
pnpm dev          # servidor local em http://localhost:5173/judisys-demo/
```

| Comando | O que faz |
|---|---|
| `pnpm lint` | Biome (formatação e lint) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest |
| `pnpm seed` | Gera `public/seed.json` e `public/seed-versao.json` (até a DMO-07 é um placeholder que só registra no log) |
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
