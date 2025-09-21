#!/usr/bin/env node

import { parseArgs } from "util";
import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);
const COMPONENTS_DIR = join(__dirname, "components");
const CONFIG_FILE = "norns.json";

interface NornsConfig {
	components: string;
}

const DEFAULT_CONFIG: NornsConfig = {
	components: "components",
};

async function loadConfig(): Promise<NornsConfig | null> {
	try {
		if (!existsSync(CONFIG_FILE)) {
			return null;
		}
		const configContent = await readFile(CONFIG_FILE, "utf8");
		return JSON.parse(configContent);
	} catch (error) {
		console.error(`✗ Failed to load ${CONFIG_FILE}:`, error);
		return null;
	}
}

async function saveConfig(config: NornsConfig): Promise<void> {
	try {
		await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
	} catch (error) {
		console.error(`✗ Failed to save ${CONFIG_FILE}:`, error);
		throw error;
	}
}

async function promptUser(
	question: string,
	defaultValue?: string,
): Promise<string> {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	try {
		const prompt = defaultValue
			? `${question} (${defaultValue}): `
			: `${question}: `;

		const answer = await rl.question(prompt);
		return answer.trim() || defaultValue || "";
	} finally {
		rl.close();
	}
}

async function init() {
	console.log("⚡ Initializing norns project...");

	// Check if components.json already exists
	if (existsSync(CONFIG_FILE)) {
		console.log(`▸ ${CONFIG_FILE} already exists`);
		const overwrite = await promptUser(
			"Would you like to overwrite it? (y/N)",
			"n",
		);
		if (overwrite.toLowerCase() !== "y" && overwrite.toLowerCase() !== "yes") {
			console.log("✗ Initialization cancelled");
			return;
		}
	}

	console.log("\n▸ Setting up your components configuration...\n");

	// Get component directory path
	const componentsPath = await promptUser(
		"Where would you like to install your components?",
		DEFAULT_CONFIG.components,
	);

	// Create the configuration
	const config: NornsConfig = {
		components: componentsPath,
	};

	// Create components directory if it doesn't exist
	if (!existsSync(componentsPath)) {
		await mkdir(componentsPath, { recursive: true });
		console.log(`✓ Created ${componentsPath} directory`);
	}

	// Save the configuration
	await saveConfig(config);
	console.log(`✓ Created ${CONFIG_FILE}`);

	console.log(
		"\n✓ norns project initialized! You can now add components with:",
	);
	console.log("  npx norns@latest add <component-name>");
	console.log(`\n▸ Components will be installed to: ${componentsPath}`);
}

async function addComponent(componentName: string | undefined) {
	if (!componentName) {
		console.error("✗ Please specify a component name");
		console.log("Usage: npx norns@latest add <component-name>");
		process.exit(1);
	}

	console.log(`▸ Adding component: ${componentName}`);

	// Load configuration
	let config = await loadConfig();

	// If no config exists, ask user to run init first or use defaults
	if (!config) {
		console.log("▸ No norns.json found.");
		const shouldInit = await promptUser(
			"Would you like to run 'norns init' first? (Y/n)",
			"y",
		);

		if (
			shouldInit.toLowerCase() === "y" ||
			shouldInit.toLowerCase() === "yes" ||
			shouldInit === ""
		) {
			await init();
			config = await loadConfig();
		} else {
			console.log("▸ Using default configuration...");
			config = DEFAULT_CONFIG;
		}
	}

	if (!config) {
		console.error("✗ Failed to initialize configuration");
		process.exit(1);
	}

	const componentsDir = config.components;

	// Create components directory if it doesn't exist
	if (!existsSync(componentsDir)) {
		console.log(
			`▸ Components directory doesn't exist. Creating ${componentsDir}...`,
		);
		await mkdir(componentsDir, { recursive: true });
	}

	try {
		const sourceComponentPath = join(COMPONENTS_DIR, `${componentName}.js`);

		if (!existsSync(sourceComponentPath)) {
			console.error(`✗ Component '${componentName}' not found`);
			console.log("Available components:");
			console.log("  - connect-wallet");
			console.log("  - contract-call");
			process.exit(1);
		}

		const componentCode = await readFile(sourceComponentPath, "utf8");
		const componentPath = join(componentsDir, `${componentName}.js`);

		await writeFile(componentPath, componentCode, "utf8");

		console.log(`✓ Added ${componentName} to ${componentPath}`);
		console.log(`▸ You can now use it in your HTML:`);
		console.log(`   <script src="components/${componentName}.js"></script>`);
		console.log(`   <${componentName}></${componentName}>`);
	} catch (error) {
		console.error(`✗ Failed to add component: ${error}`);
		process.exit(1);
	}
}

function showHelp() {
	console.log(`
⚡ norns - Web Component Library CLI

Usage:
  npx norns@latest init                    Initialize a new norns project with norns.json
  npx norns@latest add <component-name>    Add a component to your project
  npx norns@latest --help                  Show this help message

Examples:
  npx norns@latest init
  npx norns@latest add connect-wallet

The init command will:
  - Create a norns.json configuration file
  - Set up your preferred component installation directory
  - Create necessary directories

Available Components:
  - connect-wallet    A Web3 wallet connection component
  - contract-call     A Web3 contract interaction component

Configuration:
  The norns.json file controls where components are installed.
  You can customize the installation directory during init or edit the file directly.
`);
}

// Parse command line arguments using Node's parseArgs
// process.argv includes [node_path, script_path, ...actual_args]
// We need to slice from index 2 to get the actual command arguments
const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
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
				console.error(`✗ Unknown command: ${command}`);
				showHelp();
				process.exit(1);
			}
	}
}
