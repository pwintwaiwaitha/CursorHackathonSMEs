import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { aiAdviceDevPlugin } from './viteAiAdvicePlugin.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), aiAdviceDevPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
