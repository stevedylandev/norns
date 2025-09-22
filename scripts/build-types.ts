#!/usr/bin/env bun

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const COMPONENTS_DIR = "src/components";
const OUTPUT_PATH = "dist/custom-elements-jsx.d.ts";

interface ComponentInfo {
	tagName: string;
	attributes: string[];
	events: string[];
}

function convertEventName(eventName: string): string {
	// Convert kebab-case events to React camelCase handlers
	const words = eventName.split("-");
	const camelCase = words
		.map((word, index) =>
			index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
		)
		.join("");
	return "on" + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

async function parseComponent(filePath: string): Promise<ComponentInfo | null> {
	const content = await readFile(filePath, "utf-8");

	// Extract tag name from customElements.define()
	const tagNameMatch = content.match(
		/customElements\.define\(['"`]([^'"`]+)['"`]/,
	);
	if (!tagNameMatch || !tagNameMatch[1]) return null;

	const tagName = tagNameMatch[1];

	// Extract attributes from observedAttributes
	const attributesMatch = content.match(
		/static get observedAttributes\(\)\s*\{\s*return\s*\[([\s\S]*?)\]/,
	);
	const attributes: string[] = [];
	if (attributesMatch && attributesMatch[1]) {
		const attributesStr = attributesMatch[1];
		const attrMatches = attributesStr.match(/['"`]([^'"`]+)['"`]/g);
		if (attrMatches) {
			attributes.push(...attrMatches.map((attr) => attr.slice(1, -1)));
		}
	}

	// Extract events from dispatchEvent calls
	const eventMatches = content.match(/new CustomEvent\(['"`]([^'"`]+)['"`]/g);
	const events: string[] = [];
	if (eventMatches) {
		for (const match of eventMatches) {
			const eventMatch = match.match(/['"`]([^'"`]+)['"`]/);
			if (eventMatch && eventMatch[1]) {
				events.push(eventMatch[1]);
			}
		}
	}

	// Remove duplicates
	const uniqueEvents = [...new Set(events)];

	return {
		tagName,
		attributes,
		events: uniqueEvents,
	};
}

function generateJSXTypes(components: ComponentInfo[]): string {
	const intrinsicElements = components
		.map((comp) => {
			const attributeProps = comp.attributes
				.map((attr) => `    '${attr}'?: string;`)
				.join("\n");

			const eventHandlers = comp.events
				.map((event) => {
					const handlerName = convertEventName(event);
					return `    ${handlerName}?: (event: CustomEvent) => void;`;
				})
				.join("\n");

			return `  '${comp.tagName}': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
${attributeProps}
${eventHandlers}
  }, HTMLElement>;`;
		})
		.join("\n");

	// Common CSS properties for EVM components
	const cssProperties = `  '--color-background'?: string;
  '--color-foreground'?: string;
  '--color-primary'?: string;
  '--color-secondary'?: string;
  '--border-radius'?: string;`;

	return `import type React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
${intrinsicElements}
    }
  }
  
  interface CSSProperties {
    // Norns UI CSS Custom Properties
${cssProperties}
  }
}

export interface CustomElements {
${intrinsicElements}
}

export interface CustomCssProperties {
${cssProperties}
}
`;
}

async function main() {
	try {
		console.log("🔧 Building JSX types...");

		// Read component files
		const files = await readdir(COMPONENTS_DIR);
		const jsFiles = files.filter((file) => file.endsWith(".js"));

		const components: ComponentInfo[] = [];

		for (const file of jsFiles) {
			const filePath = join(COMPONENTS_DIR, file);
			const componentInfo = await parseComponent(filePath);
			if (componentInfo) {
				components.push(componentInfo);
			}
		}

		console.log(`📦 Found ${components.length} custom elements`);

		// Generate JSX intrinsic elements types
		const jsxTypesCode = generateJSXTypes(components);
		await writeFile(OUTPUT_PATH, jsxTypesCode);
		console.log(`✅ Generated JSX types: ${OUTPUT_PATH}`);

		console.log("🎉 JSX types generated successfully!");
	} catch (error) {
		console.error("❌ Error generating JSX types:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
