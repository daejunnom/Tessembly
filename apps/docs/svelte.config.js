import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ strict: true }),
    paths: { base: process.env.BASE_PATH ?? '/Tessembly' },
    prerender: { handleHttpError: 'fail' }
  }
};
