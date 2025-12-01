# svvy.sh website

Astro + React site for svvy.sh that showcases products and developer tools.

## Tech stack
- Astro 5 with React islands
- Tailwind CSS v4 (class-based, no config file)
- TypeScript + Biome + Prettier
- Deployed as a static build (SSG)

## Quick start
1) Install dependencies (Node 20+ recommended):
```sh
pnpm install
```
2) Run the dev server:
```sh
pnpm dev
```
3) Build and preview the static output:
```sh
pnpm build
pnpm preview
```

## Linting and formatting
```sh
pnpm lint    # prettier check for .astro + biome check
pnpm format  # prettier + biome format
```

## GitHub API token (optional)
Repo cards on the home page fetch stars, tags, and versions from the GitHub API. To avoid rate limits, set `GITHUB_TOKEN` in `.env.local`:
```sh
GITHUB_TOKEN=ghp_your_token_here
```
If absent, the site still renders but may fall back to basic card data.

## Project structure
- `src/pages` — Astro routes (`index.astro` is the landing page)
- `src/components` — UI building blocks and sections
- `src/layouts` — shared page chrome, theme toggling, and fonts
- `src/lib` — helper utilities (GitHub fetching, constants)
- `public` — static assets (favicons, etc.)
