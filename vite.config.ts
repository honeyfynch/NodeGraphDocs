// @ts-nocheck — `process.env` is provided by Node when Vite loads this file (no @types/node in project).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: `https://<user>.github.io/<repo>/`
// In GitHub Actions, `GITHUB_REPOSITORY` is `owner/repo` — base must match `repo` or assets 404 (blank page).
// Local `vite` / `vite build` without that env uses `/` so dev and `vite preview` work at the server root.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = repoName ? `/${repoName}/` : '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
});
