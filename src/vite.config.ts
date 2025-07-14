import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	const env = loadEnv(mode, process.cwd(), '');

	// Get current directory for ES modules
	const currentDir = fileURLToPath(new URL('.', import.meta.url));

	return {
		define: {
			'import.meta.env.VITE_CENTRAL_CLIENT_ID': JSON.stringify(env.VITE_CENTRAL_CLIENT_ID || '01JZWNP6AVSWRZSN7X648B1AQ2'),
			'import.meta.env.VITE_KICK_OAUTH_BASE_URL': JSON.stringify(env.VITE_KICK_OAUTH_BASE_URL || 'https://id.kick.com/oauth/authorize'),
			'import.meta.env.VITE_KICK_TOKEN_URL': JSON.stringify(env.VITE_KICK_TOKEN_URL || 'https://id.kick.com/oauth/token'),
			'import.meta.env.VITE_KICK_API_BASE_URL': JSON.stringify(env.VITE_KICK_API_BASE_URL || 'https://kick.com/api/v2'),
			'import.meta.env.VITE_OAUTH_PROXY_URL_DEV': JSON.stringify(env.VITE_OAUTH_PROXY_URL_DEV || 'http://localhost:3001'),
			'import.meta.env.VITE_OAUTH_PROXY_URL_PROD': JSON.stringify(env.VITE_OAUTH_PROXY_URL_PROD || 'https://drop-game-proxy.onrender.com'),
		},
		build: {
			rollupOptions: {
				input: {
					main: resolve(currentDir, "index.html"),
					streamlined: resolve(currentDir, "streamlined-oauth.html"),
					debug: resolve(currentDir, "debug.html"),
				},
				output: {
					entryFileNames: 'assets/[name]-[hash].js',
					chunkFileNames: 'assets/[name]-[hash].js',
					assetFileNames: 'assets/[name]-[hash].[ext]'
				}
			},
			target: "esnext",
			minify: 'esbuild',
			sourcemap: true
		},
		server: {
			cors: true,
			host: true,
			port: 3000
		}
	};
});
