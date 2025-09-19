#!/usr/bin/env bun

import { parseArgs } from "util";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COMPONENTS_DIR = join(__dirname, "components");

async function init() {
	console.log("🧙 Initializing norns project...");

	const componentsDir = "components";

	if (!existsSync(componentsDir)) {
		await mkdir(componentsDir, { recursive: true });
		console.log(`✅ Created ${componentsDir} directory`);
	} else {
		console.log(`📁 ${componentsDir} directory already exists`);
	}

	console.log("🎉 norns project initialized! You can now add components with:");
	console.log("  npx norns@latest add <component-name>");
}

async function addComponent(componentName: string | undefined) {
	if (!componentName) {
		console.error("❌ Please specify a component name");
		console.log("Usage: npx norns@latest add <component-name>");
		process.exit(1);
	}

	console.log(`🔄 Adding component: ${componentName}`);

	const componentsDir = "components";
	if (!existsSync(componentsDir)) {
		console.log("📁 Components directory doesn't exist. Creating it...");
		await mkdir(componentsDir, { recursive: true });
	}

	try {
		const sourceComponentPath = join(COMPONENTS_DIR, `${componentName}.js`);

		if (!existsSync(sourceComponentPath)) {
			console.error(`❌ Component '${componentName}' not found`);
			console.log("Available components:");
			console.log("  - connect-wallet");
			process.exit(1);
		}

		const componentCode = await Bun.file(sourceComponentPath).text();
		const componentPath = join(componentsDir, `${componentName}.js`);

		await Bun.write(componentPath, componentCode);

		console.log(`✅ Added ${componentName} to ${componentPath}`);
		console.log(`📝 You can now use it in your HTML:`);
		console.log(`   <script src="./components/${componentName}.js"></script>`);
		console.log(`   <${componentName}></${componentName}>`);
	} catch (error) {
		console.error(`❌ Failed to add component: ${error}`);
		process.exit(1);
	}
}

function showHelp() {
	console.log(`
🧙 norns - Web Component Library CLI

Usage:
  npx norns@latest init                    Initialize a new norns project
  npx norns@latest add <component-name>    Add a component to your project
  npx norns@latest --help                  Show this help message

Examples:
  npx norns@latest init
  npx norns@latest add connect-wallet

Available Components:
  - connect-wallet    A Web3 wallet connection component
`);
}

// Parse command line arguments using Bun's parseArgs
// Bun.argv includes [bun_path, script_path, ...actual_args]
// We need to slice from index 2 to get the actual command arguments
const { values, positionals } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		help: { type: "boolean", short: "h" },
	},
	strict: false,
	allowPositionals: true,
});

const command = positionals[0];
const componentName = positionals[1];

if (values.help) {
	showHelp();
} else {
	switch (command) {
		case "init":
			await init();
			break;
		case "add":
			await addComponent(componentName);
			break;
		case "help":
			showHelp();
			break;
		default:
			if (!command) {
				showHelp();
			} else {
				console.error(`❌ Unknown command: ${command}`);
				showHelp();
				process.exit(1);
			}
	}
}
