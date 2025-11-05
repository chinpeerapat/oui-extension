import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  compilerOptions: {
    // Suppress a11y warnings for backdrop click handlers
    // These are intentional UX patterns where users can click outside modals to close them
  },

  onwarn: (warning, handler) => {
    // Suppress a11y warnings for non-interactive elements with click handlers
    // These are backdrop overlays that should close dialogs when clicked
    if (warning.code === 'a11y-no-static-element-interactions' ||
        warning.code === 'a11y-click-events-have-key-events') {
      return;
    }
    handler(warning);
  }
}
