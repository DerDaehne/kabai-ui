import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			// Default to 'build' for the adapter-auto
			// This ensures the app can be deployed as a static site or to platforms like Vercel/Netlify
			out: 'build'
		}),
		alias: {
			$lib: './src/lib',
			$components: './src/lib/components'
		}
	},
	compilerOptions: {
		// Deaktiviere Runes für Legacy-Syntax ($: etc.)
		runes: false
	}
};

export default config;
