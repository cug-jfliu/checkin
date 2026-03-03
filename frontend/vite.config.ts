import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Serve .wasm files as static assets so ?url imports resolve correctly
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    // Prevent esbuild from pre-bundling typst packages — esbuild strips the
    // wasm-bindgen shims and breaks WASM loading
    exclude: [
      '@myriaddreamin/typst.ts',
      '@myriaddreamin/typst-ts-web-compiler',
      '@myriaddreamin/typst-ts-renderer',
    ],
  },
})
