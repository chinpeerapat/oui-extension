import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        // Disable specific a11y warnings for backdrop click handlers
        // These are intentional UX patterns where clicking outside closes modals
      },
      onwarn: (warning, handler) => {
        // Suppress a11y warnings for backdrop overlays with click handlers
        if (
          warning.code === 'a11y-no-static-element-interactions' ||
          warning.code === 'a11y-click-events-have-key-events'
        ) {
          return;
        }
        // Let other warnings through
        if (handler) {
          handler(warning);
        }
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        dir: "dist/",
        entryFileNames: "main.js",
        assetFileNames: "style.css",
        chunkFileNames: "chunk.js",
        manualChunks: undefined,
      },
    },
  },
});
