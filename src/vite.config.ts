import { resolve } from "path";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				main: resolve(fileURLToPath(new URL('.', import.meta.url)), "index.html"),
				oauth: resolve(fileURLToPath(new URL('.', import.meta.url)), "oauth.html"),
				streamlined: resolve(fileURLToPath(new URL('.', import.meta.url)), "streamlined-oauth.html"),
				debug: resolve(fileURLToPath(new URL('.', import.meta.url)), "debug.html"),
			},
			output: {
				// Manual chunks for better code splitting
				manualChunks: (id) => {
					// Vendor libraries from node_modules
					if (id.includes('node_modules')) {
						if (id.includes('phaser')) return 'vendor-phaser';
						if (id.includes('pusher-js')) return 'vendor-pusher';
						if (id.includes('webfontloader')) return 'vendor-webfont';
						// Group other vendor dependencies
						return 'vendor';
					}
					// Game-specific modules
				if (id.includes('/game.ts') || id.includes('/score.ts')) return 'game';
				if (id.includes('/kick.ts') || id.includes('/avatar.ts')) return 'kick';
				if (id.includes('/streamlined-oauth.ts') || id.includes('/central-config.ts')) return 'streamlined-oauth';
				if (id.includes('/util.ts') || id.includes('/emitter.ts') || id.includes('/constants.ts')) return 'utils';
					// Return undefined for other modules to use default chunking
					return undefined;
				},
				// Optimize chunk size
				chunkFileNames: 'assets/[name]-[hash].js',
				entryFileNames: 'assets/[name]-[hash].js',
				assetFileNames: (assetInfo) => {
					// Ensure TypeScript files are output as JavaScript
					if (assetInfo.name && assetInfo.name.endsWith('.ts')) {
						return 'assets/[name]-[hash].js';
					}
					return 'assets/[name]-[hash].[ext]';
				}
			}
		},
		target: "esnext",
		// Performance optimizations
		chunkSizeWarningLimit: 300, // Reduce warning limit to 300KB
		reportCompressedSize: false, // Disable gzip reporting for faster builds
		// Enable CSS code splitting
		cssCodeSplit: true,
		// Minification options
		minify: 'esbuild',
		// Source maps only for development
		sourcemap: process.env.NODE_ENV === 'development'
	},
	// Dependency optimization
	optimizeDeps: {
		// Pre-bundle these dependencies for better performance
		include: ['phaser', 'pusher-js', 'webfontloader'],
		// Force re-bundling when needed
		force: false
	},
	// Development server settings
	server: {
		// Enable CORS for development
		cors: true,
		// Server host configuration
		host: true,
		// Port configuration
		port: 3000
	}
});
