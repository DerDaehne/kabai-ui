import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Ticket #544: Versionsquelle in Prioritätsreihenfolge. Release-Builds
// reichen den Tag als APP_VERSION herein (release.yml --build-arg), denn
// .dockerignore schließt .git aus — git describe ist im Image-Build nicht
// möglich. Lokale Checkouts nutzen git describe; ganz ohne beides "dev".
function resolveAppVersion(): string {
	if (process.env.APP_VERSION) return process.env.APP_VERSION;
	try {
		return execSync('git describe --tags --always', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return 'dev';
	}
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	define: {
		__APP_VERSION__: JSON.stringify(resolveAppVersion())
	}
});
