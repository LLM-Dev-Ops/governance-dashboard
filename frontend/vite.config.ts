import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 3000,
		proxy: {
			'/api': {
				target: 'http://localhost:8000',
				changeOrigin: true,
			},
		},
	},
	build: {
		target: 'esnext',
		minify: 'esbuild',
		cssMinify: true,
	},
	optimizeDeps: {
		include: ['@tanstack/svelte-query', 'chart.js', 'd3', 'date-fns'],
	},
});
