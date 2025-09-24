#!/usr/bin/env node

import { parseArgs } from "util";
import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

import { fileURLToPath } from "url";
import { dirname } from "path";
import * as colors from "./utils/colors.js";
import yoctoSpinner from "./utils/spinner.js";

const __filename = fileURLToPath(import.meta.url);

const __dirname = dirname(__filename);
const COMPONENTS_DIR = join(__dirname, "components");
const CONFIG_FILE = "norns.json";

interface NornsConfig {
	components: string;
	includeTypes?: boolean;
}

const DEFAULT_CONFIG: NornsConfig = {
	components: "components",
	includeTypes: true,
};

async function loadConfig(): Promise<NornsConfig | null> {
	try {
		if (!existsSync(CONFIG_FILE)) {
			return null;
		}
		const configContent = await readFile(CONFIG_FILE, "utf8");
		return JSON.parse(configContent);
	} catch (error) {
		console.error(colors.red(`✗ Failed to load ${CONFIG_FILE}:`), error);
		return null;
	}
}

async function saveConfig(config: NornsConfig): Promise<void> {
	const spinner = yoctoSpinner({ text: `Saving ${CONFIG_FILE}` }).start();
	try {
		await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
		spinner.success(`Saved ${CONFIG_FILE}`);
	} catch (error) {
		spinner.error(`Failed to save ${CONFIG_FILE}`);
		console.error(error);
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
	console.log(colors.yellow("∅ Initializing norns project..."));

	// Check if components.json already exists
	if (existsSync(CONFIG_FILE)) {
		console.log(colors.blue(`▸ ${CONFIG_FILE} already exists`));
		const overwrite = await promptUser(
			"Would you like to overwrite it? (y/N)",
			"n",
		);
		if (overwrite.toLowerCase() !== "y" && overwrite.toLowerCase() !== "yes") {
			console.log(colors.red("✗ Initialization cancelled"));
			return;
		}
	}

	console.log(colors.blue("\n▸ Setting up your components configuration...\n"));

	// Get component directory path
	const componentsPath = await promptUser(
		"Where would you like to install your components?",
		DEFAULT_CONFIG.components,
	);

	// Get TypeScript types preference
	const includeTypesResponse = await promptUser(
		"Include TypeScript definitions for React JSX? (Y/n)",
		"y",
	);
	const includeTypes =
		includeTypesResponse.toLowerCase() !== "n" &&
		includeTypesResponse.toLowerCase() !== "no";

	// Create the configuration
	const config: NornsConfig = {
		components: componentsPath,
		includeTypes,
	};

	// Create components directory if it doesn't exist
	if (!existsSync(componentsPath)) {
		const dirSpinner = yoctoSpinner({
			text: `Creating ${componentsPath} directory`,
		}).start();
		await mkdir(componentsPath, { recursive: true });
		dirSpinner.success(`Created ${componentsPath} directory`);
	}

	// Save the configuration
	await saveConfig(config);

	console.log(
		colors.green(
			"\n✓ norns project initialized! You can now add components with:",
		),
	);
	console.log(colors.cyan("  npx norns@latest add <component-name>"));
	console.log(
		colors.blue(`\n▸ Components will be installed to: ${componentsPath}`),
	);
}

async function addComponent(componentName: string | undefined) {
	if (!componentName) {
		console.error(colors.red("✗ Please specify a component name"));
		console.log(colors.cyan("Usage: npx norns@latest add <component-name>"));
		process.exit(1);
	}

	console.log(colors.blue(`▸ Adding component: ${componentName}`));

	// Load configuration
	let config = await loadConfig();

	// If no config exists, ask user to run init first or use defaults
	if (!config) {
		console.log(colors.blue("▸ No norns.json found."));
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
			console.log(colors.blue("▸ Using default configuration..."));
			config = DEFAULT_CONFIG;
		}
	}

	if (!config) {
		console.error(colors.red("✗ Failed to initialize configuration"));
		process.exit(1);
	}

	const componentsDir = config.components;

	// Create components directory if it doesn't exist
	if (!existsSync(componentsDir)) {
		const dirSpinner = yoctoSpinner({
			text: `Creating ${componentsDir} directory`,
		}).start();
		await mkdir(componentsDir, { recursive: true });
		dirSpinner.success(`Created ${componentsDir} directory`);
	}

	try {
		const sourceComponentPath = join(COMPONENTS_DIR, `${componentName}.js`);

		if (!existsSync(sourceComponentPath)) {
			console.error(colors.red(`✗ Component '${componentName}' not found`));
			console.log(colors.blue("Available components:"));
			console.log(colors.cyan("  - connect-wallet"));
			console.log(colors.cyan("  - contract-call"));
			process.exit(1);
		}

		const installSpinner = yoctoSpinner({
			text: `Installing ${componentName} component`,
		}).start();

		const componentCode = await readFile(sourceComponentPath, "utf8");
		const componentPath = join(componentsDir, `${componentName}.js`);

		await writeFile(componentPath, componentCode, "utf8");

		// Copy TypeScript definitions if enabled
		if (config.includeTypes !== false) {
			const typesSourcePath = join(
				COMPONENTS_DIR,
				"../custom-elements-jsx.d.ts",
			);
			const typesDestPath = "custom-elements-jsx.d.ts"; // Install at project root

			if (existsSync(typesSourcePath)) {
				const typesContent = await readFile(typesSourcePath, "utf8");
				await writeFile(typesDestPath, typesContent, "utf8");
				console.log(
					colors.blue(`▸ Added TypeScript definitions to ${typesDestPath}`),
				);
			}
		}

		installSpinner.success(`Added ${componentName} to ${componentPath}`);
		console.log(colors.blue(`▸ You can now use it in your HTML:`));
		console.log(
			colors.cyan(`   <script src="components/${componentName}.js"></script>`),
		);
		console.log(colors.cyan(`   <${componentName}></${componentName}>`));
	} catch (error) {
		console.error(colors.red(`✗ Failed to add component: ${error}`));
		process.exit(1);
	}
}

function showHelp() {
	console.log(
		colors.yellow(`

                                 @
                                @@@@
                                  @@@@    @@@@@@@@@
                                    @@@@  @@@   @@@@@@
                                      @@@@         @@@@
                                    @@  @@@@        @@@@
                                  @@@@    @@@@       @@@
                   @@@@@@@      @@@@        @@@@    @@@
                 @@@@@@@@@@@  @@@@            @@@  @@@@
               @@@@         @@@@                 @@@@
              @@@         @@@@  @              @@@@  @
              @@@       @@@@   @@@@          @@@@   @@@@          @@@
              @@@     @@@@       @@@@      @@@@       @@@@      @@@@
               @@@  @@@@           @@@@  @@@@           @@@@  @@@@
                @@@@                 @@@@                 @@@@
                  @@@@                 @@@@                 @@@@
              @@@@  @@@@           @@@@  @@@@           @@@@  @@@
            @@@@      @@@@       @@@@      @@@@       @@@@     @@@
           @@@          @@@@   @@@@          @@@@   @@@@       @@@
                          @  @@@@              @  @@@@         @@@
                           @@@@                 @@@@         @@@@
                         @@@@  @@@            @@@@  @@@@@@@@@@@
                         @@@    @@@@        @@@@      @@@@@@
                        @@@       @@@@    @@@@
                        @@@@        @@@@  @@
                         @@@@         @@@@
                           @@@@@   @@@  @@@@
                             @@@@@@@@@    @@@@
                                            @@@@
                                              @
`),
	);
	console.log(
		colors.yellow(`\n∅ norns - web components for decentralized applications`),
		colors.cyan("\nhttps://github.com/stevedylandev/norns\n"),
	);
	console.log(colors.bold("Usage:"));
	console.log(
		colors.cyan(
			"  npx norns@latest init                    Initialize a new norns project with norns.json",
		),
	);
	console.log(
		colors.cyan(
			"  npx norns@latest add <component-name>    Add a component to your project",
		),
	);
	console.log(
		colors.cyan(
			"  npx norns@latest --help                  Show this help message\n",
		),
	);

	console.log(colors.bold("Examples:"));
	console.log(colors.green("  npx norns@latest init"));
	console.log(colors.green("  npx norns@latest add connect-wallet\n"));

	console.log(colors.bold("The init command will:"));
	console.log(colors.blue("  - Create a norns.json configuration file"));
	console.log(
		colors.blue("  - Set up your preferred component installation directory"),
	);
	console.log(colors.blue("  - Create necessary directories\n"));

	console.log(colors.bold("Available Components:"));
	console.log(
		colors.cyan("  - connect-wallet    A Web3 wallet connection component"),
	);
	console.log(
		colors.cyan(
			"  - contract-call     A Web3 contract interaction component\n",
		),
	);

	console.log(colors.bold("Configuration:"));
	console.log(
		colors.blue(
			"  The norns.json file controls where components are installed.",
		),
	);
	console.log(
		colors.blue(
			"  You can customize the installation directory during init or edit the file directly.",
		),
	);
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
				console.error(colors.red(`✗ Unknown command: ${command}`));
				showHelp();
				process.exit(1);
			}
	}
}
