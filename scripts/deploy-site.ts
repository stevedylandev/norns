import { $ } from "bun";

// Create new dist
await $`cp -r site site-dist`;
// Compile tailwindcss
await $`bunx @tailwindcss/cli -i ./site/input.css -o ./site-dist/output.css `;
// Copy components over
await $`cp -r src/components site-dist/components`;

// Read index file
const htmlContent = await Bun.file("site-dist/index.html").text();
// Update script tags and css link
const updatedHtml = htmlContent
	.replace(
		`<script src="../src/components/connect-wallet.js"></script>`,
		`<script src="components/connect-wallet.js"></script>`,
	)
	.replace(
		`<script src="../src/components/contract-call.js"></script>`,
		`<script src="components/contract-call.js"></script>`,
	)
	.replace(
		`<link rel="stylesheet" href="tailwindcss" />`,
		`<link rel="stylesheet" href="output.css" />`,
	);
// Write file
await Bun.write("site-dist/index.html", updatedHtml);

// Run orbiter update
await $`orbiter update -d norns site-dist`;

// Clean up dist
await $`rm -rf site-dist`;
