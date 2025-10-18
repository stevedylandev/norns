#!/usr/bin/env bun

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const COMPONENTS_DIR = "src/components";
const OUTPUT_DIR = "dist";
const REACT_OUTPUT = "custom-elements-jsx.ts";
const SVELTE_OUTPUT = "custom-elements-svelte.ts";
const VUE_OUTPUT = "custom-elements-vue.ts";
const TYPESCRIPT_OUTPUT = "custom-elements.ts";

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

function generateReactTypes(components: ComponentInfo[]): string {
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

function generateSvelteTypes(components: ComponentInfo[]): string {
	const svelteHTMLElements = components
		.map((comp) => {
			const attributeProps = comp.attributes
				.map((attr) => `      '${attr}'?: string;`)
				.join("\n");

			const eventHandlers = comp.events
				.map((event) => {
					return `      'on:${event}'?: (event: CustomEvent) => void;`;
				})
				.join("\n");

			const allProps = [attributeProps, eventHandlers]
				.filter((p) => p)
				.join("\n");

			return `    '${comp.tagName}': {\n${allProps}\n    };`;
		})
		.join("\n");

	return `declare module 'svelte/elements' {
  export interface SvelteHTMLElements {
${svelteHTMLElements}
  }
}

export {};
`;
}

function generateTypeScriptTypes(components: ComponentInfo[]): string {
	const elementInterfaces = components
		.map((comp) => {
			const attributeProps = comp.attributes
				.map((attr) => `  setAttribute('${attr}', value: string): void;`)
				.join("\n");

			const eventHandlers = comp.events
				.map((event) => {
					return `  addEventListener(type: '${event}', listener: (event: CustomEvent) => void): void;`;
				})
				.join("\n");

			return `interface ${toPascalCase(comp.tagName)}Element extends HTMLElement {
${attributeProps}
${eventHandlers}
}`;
		})
		.join("\n\n");

	const htmlElementTagMap = components
		.map((comp) => {
			return `  '${comp.tagName}': ${toPascalCase(comp.tagName)}Element;`;
		})
		.join("\n");

	return `${elementInterfaces}

declare global {
  interface HTMLElementTagNameMap {
${htmlElementTagMap}
  }
}

export {};
`;
}

function generateVueTypes(components: ComponentInfo[]): string {
	const globalComponents = components
		.map((comp) => {
			const attributeProps = comp.attributes
				.map((attr) => `      '${attr}'?: string;`)
				.join("\n");

			const eventHandlers = comp.events
				.map((event) => {
					// Convert to camelCase for Vue's @event syntax
					const camelEvent = event
						.split("-")
						.map((word, i) =>
							i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
						)
						.join("");
					return `      'on${camelEvent.charAt(0).toUpperCase() + camelEvent.slice(1)}'?: (event: CustomEvent) => void;`;
				})
				.join("\n");

			const allProps = [attributeProps, eventHandlers]
				.filter((p) => p)
				.join("\n");

			return `    '${comp.tagName}': {\n${allProps}\n    };`;
		})
		.join("\n");

	return `declare module 'vue' {
  export interface GlobalComponents {
${globalComponents}
  }
}

export {};
`;
}

function toPascalCase(str: string): string {
	return str
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");
}

async function main() {
	try {
		console.log("🔧 Building type definitions...");

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

		// Generate React types
		const reactTypesCode = generateReactTypes(components);
		await writeFile(join(OUTPUT_DIR, REACT_OUTPUT), reactTypesCode);
		console.log(`✅ Generated React types: ${REACT_OUTPUT}`);

		// Generate Svelte types
		const svelteTypesCode = generateSvelteTypes(components);
		await writeFile(join(OUTPUT_DIR, SVELTE_OUTPUT), svelteTypesCode);
		console.log(`✅ Generated Svelte types: ${SVELTE_OUTPUT}`);

		// Generate Vue types
		const vueTypesCode = generateVueTypes(components);
		await writeFile(join(OUTPUT_DIR, VUE_OUTPUT), vueTypesCode);
		console.log(`✅ Generated Vue types: ${VUE_OUTPUT}`);

		// Generate TypeScript types
		const tsTypesCode = generateTypeScriptTypes(components);
		await writeFile(join(OUTPUT_DIR, TYPESCRIPT_OUTPUT), tsTypesCode);
		console.log(`✅ Generated TypeScript types: ${TYPESCRIPT_OUTPUT}`);

		console.log("🎉 Type definitions generated successfully!");
	} catch (error) {
		console.error("❌ Error generating type definitions:", error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
