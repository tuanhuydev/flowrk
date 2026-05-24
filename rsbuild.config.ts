import { defineConfig } from "@rsbuild/core";
import { pluginSvelte } from "@rsbuild/plugin-svelte";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";

export default defineConfig({
	plugins: [
		pluginSvelte({
			svelteLoaderOptions: {
				compilerOptions: {
					compatibility: {
						componentApi: 4,
					},
				},
			},
		}),
		pluginModuleFederation({
			name: "flowrk",
			filename: "remoteEntry.js",
			exposes: {
				"./App": "./src/App.svelte",
			},
			shared: {
				svelte: {
					singleton: true,
					strictVersion: false,
					requiredVersion: "^5.0.0",
					eager: true,
				},
			},
			dts: false,
		}),
	],
	source: {
		entry: {
			index: "./src/main.ts",
		},
	},
	html: {
		template: "./public/index.html",
	},
	server: {
		port: 2002,
		open: false,
		historyApiFallback: true,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
			"Access-Control-Allow-Headers":
				"X-Requested-With, content-type, Authorization",
		},
	},
	output: {
		assetPrefix: "auto",
		distPath: {
			root: "dist",
		},
		cleanDistPath: true,
	},
	performance: {
		chunkSplit: {
			strategy: "split-by-experience",
		},
	},
	dev: {
		hmr: false,
		liveReload: false,
	},
});
