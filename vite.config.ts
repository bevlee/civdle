import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// @types/node isn't installed; this is all the config needs from it.
declare const process: { env: Record<string, string | undefined> };

const port = Number(process.env.PORT) || undefined;

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Fully client-side (see src/routes/+layout.ts), so the build is plain
			// static files that nginx serves in the container image.
			adapter: adapter()
		})
	],
	server: {
		// The preview tool passes the port it expects in PORT.
		port,
		strictPort: port !== undefined,
		// The `skaffold dev` pod is reached through the ingress under this host,
		// which Vite would otherwise reject.
		allowedHosts: ['civdle-dev.bevsoft.com']
	}
});
