import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相对路径：部署在 GitHub Pages 的 /neverland/ 子路径下也能找到资源
  base: './',
  plugins: [react()],
  server: { port: 5173, host: true },
})
