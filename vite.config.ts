import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// GitHub Pages project site: `https://<user>.github.io/<repo>/` — must match the repo name.
export default defineConfig({
  base: '/nodegraphdocsite/',
  plugins: [react()],
})
