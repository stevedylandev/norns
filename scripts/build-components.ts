import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

async function buildComponents() {
	console.log("🔨 Building components...");

	// Ensure dist/components directory exists
	const distComponentsDir = "dist/components";
	if (!existsSync(distComponentsDir)) {
		await mkdir(distComponentsDir, { recursive: true });
	}

	// Copy connect-wallet.js as-is (no dependencies)
	await copyFile(
		"src/components/connect-wallet.js",
		"dist/components/connect-wallet.js",
	);
	console.log("✅ Copied connect-wallet.js");

	// Helper function to bundle and reorganize component with dependencies
	async function bundleComponent(componentName: string, className: string) {
		const result = await Bun.build({
			entrypoints: [`src/components/${componentName}.js`],
			target: "browser",
			format: "esm",
			minify: false,
			sourcemap: "none",
			splitting: false,
			outdir: "dist/components",
			naming: "[dir]/[name].[ext]",
			external: [], // Bundle all dependencies
			plugins: [
				{
					name: "Keep JSDocs",
					setup(build) {
						build.onLoad({ filter: /\.(js)$/ }, async ({ path }) => {
							let text = await Bun.file(path).text();
							// Replace '/**' with '/*! *' to mark comments as "important" for minifiers
							let contents = text.replaceAll("/**", "/*! *");
							return { contents, loader: "js" };
						});
					},
				},
			],
		});

		if (!result.success) {
			console.error(`❌ Build failed for ${componentName}:`);
			for (const log of result.logs) {
				console.error(log);
			}
			process.exit(1);
		}

		console.log(`✅ Bundled ${componentName}.js with dependencies`);

		// Read the bundled file
		const bundledContent = await readFile(
			`dist/components/${componentName}.js`,
			"utf8",
		);

		// Split content to move dependencies to bottom
		const lines = bundledContent.split("\n");
		const componentStartIndex = lines.findIndex((line) =>
			line.includes(`class ${className} extends HTMLElement`),
		);

		if (componentStartIndex > 0) {
			// Dependencies are at the top (before the component class)
			const dependencies = lines.slice(0, componentStartIndex).join("\n");
			const componentCode = lines.slice(componentStartIndex).join("\n");

			// Create new content with component first, then dependencies
			const newContent = `// User-editable ${componentName} component
// @noble/hashes are bundled at the bottom of this file

${componentCode}

// ==========================================
// BUNDLED DEPENDENCIES BELOW
// ==========================================

${dependencies}`;

			await writeFile(
				`dist/components/${componentName}.js`,
				newContent,
				"utf8",
			);
			console.log(
				`✅ Reorganized ${componentName}.js (component code first, dependencies at bottom)`,
			);
		}
	}

	// Bundle contract-call.js with its dependencies
	await bundleComponent("contract-call", "ContractCall");

	// Bundle contract-read.js with its dependencies
	await bundleComponent("contract-read", "ContractRead");

	console.log("🎉 Component build complete!");
}

buildComponents().catch(console.error);
