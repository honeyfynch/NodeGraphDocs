// @ts-nocheck — `process.env` is provided by Node when Vite loads this file (no @types/node in project).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: `https://<user>.github.io/<repo>/`
// In GitHub Actions, `GITHUB_REPOSITORY` is `owner/repo` — base must match `repo` or assets 404 (blank page).
// Only apply that base on GitHub Actions runners; if `GITHUB_REPOSITORY` is exported locally, a wrong base
// would break `vite` / Simple Browser at `/` (scripts load from `/repo/...` and 404).
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = isGithubActions ? process.env.GITHUB_REPOSITORY?.split('/')[1] : undefined;
const base = repoName ? `/${repoName}/` : '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
});
