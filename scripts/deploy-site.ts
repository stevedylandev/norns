import { $ } from "bun";
// Copy components folder from src to site
await $`cp -r src/components site/components`;

// Update script tag in HTML file to use local components path
const htmlContent = await Bun.file("site/index.html").text();
const updatedHtml = htmlContent.replace(
	`<script src="../src/components/connect-wallet.js"></script>`,
	`<script src="components/connect-wallet.js"></script>`,
);
await Bun.write("site/index.html", updatedHtml);

// Run orbiter update
await $`orbiter update -d norns site`;

// Remove components folder from site
await $`rm -rf site/components`;

// Change script tag back to original path
const finalHtmlContent = await Bun.file("site/index.html").text();
const restoredHtml = finalHtmlContent.replace(
	`<script src="components/connect-wallet.js"></script>`,
	`<script src="../src/components/connect-wallet.js"></script>`,
);
await Bun.write("site/index.html", restoredHtml);
