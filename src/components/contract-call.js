class ContractCall extends HTMLElement {
	// Constructor and lifecycle methods
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.loading = false;
		this.result = null;
		this.error = null;
		this.abi = null;
		this.methodData = null;
		this.contractAddress = "";
		this.chainId = "0x1";
		this.methodName = "";
		this.methodArgs = [];
		this.abiUrl = "";
		this.buttonText = "Call Contract";
		this.isReadOnly = false;
	}

	static get observedAttributes() {
		return [
			"contract-address",
			"chain-id",
			"method-name",
			"method-args",
			"abi-url",
			"abi",
			"button-text",
			"background",
			"foreground",
			"primary",
			"secondary",
			"border-radius",
		];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;

		switch (name) {
			case "contract-address":
				this.contractAddress = newValue || "";
				break;
			case "chain-id":
				this.chainId = newValue || "0x1";
				break;
			case "method-name":
				this.methodName = newValue || "";
				this.parseMethodFromAbi();
				break;
			case "method-args":
				try {
					this.methodArgs = newValue ? JSON.parse(newValue) : [];
				} catch (e) {
					console.error("Invalid method-args JSON:", e);
					this.methodArgs = [];
				}
				break;
			case "abi-url":
				this.abiUrl = newValue || "";
				if (this.abiUrl) {
					this.fetchAbi();
				}
				break;
			case "abi":
				try {
					this.abi = newValue ? JSON.parse(newValue) : null;
					this.parseMethodFromAbi();
				} catch (e) {
					console.error("Invalid ABI JSON:", e);
					this.abi = null;
				}
				break;
			case "button-text":
				this.buttonText = newValue || "Call Contract";
				break;
			default:
				if (
					[
						"background",
						"foreground",
						"primary",
						"secondary",
						"border-radius",
					].includes(name)
				) {
					this.render();
				}
		}
	}

	connectedCallback() {
		this.contractAddress = this.getAttribute("contract-address") || "";
		this.chainId = this.getAttribute("chain-id") || "0x1";
		this.methodName = this.getAttribute("method-name") || "";
		this.buttonText = this.getAttribute("button-text") || "Call Contract";
		this.abiUrl = this.getAttribute("abi-url") || "";

		try {
			const methodArgsAttr = this.getAttribute("method-args");
			this.methodArgs = methodArgsAttr ? JSON.parse(methodArgsAttr) : [];
		} catch (e) {
			console.error("Invalid method-args JSON:", e);
			this.methodArgs = [];
		}

		try {
			const abiAttr = this.getAttribute("abi");
			this.abi = abiAttr ? JSON.parse(abiAttr) : null;
		} catch (e) {
			console.error("Invalid ABI JSON:", e);
			this.abi = null;
		}

		if (this.abiUrl && !this.abi) {
			this.fetchAbi();
		} else if (this.abi) {
			this.parseMethodFromAbi();
		}

		this.render();
	}

	// ABI and method parsing
	async fetchAbi() {
		if (!this.abiUrl) return;

		try {
			this.loading = true;
			this.render();

			const response = await fetch(this.abiUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch ABI: ${response.statusText}`);
			}

			this.abi = await response.json();
			this.parseMethodFromAbi();
			this.loading = false;
			this.render();

			this.dispatchEvent(
				new CustomEvent("abi-loaded", {
					detail: { abi: this.abi },
				}),
			);
		} catch (error) {
			console.error("Failed to fetch ABI:", error);
			this.error = error.message;
			this.loading = false;
			this.render();

			this.dispatchEvent(
				new CustomEvent("abi-error", {
					detail: { error: error.message },
				}),
			);
		}
	}

	parseMethodFromAbi() {
		if (!this.abi || !this.methodName) return;

		const method = this.abi.find(
			(item) => item.type === "function" && item.name === this.methodName,
		);

		if (!method) {
			this.error = `Method '${this.methodName}' not found in ABI`;
			this.render();
			return;
		}

		this.methodData = method;
		this.isReadOnly =
			method.stateMutability === "view" || method.stateMutability === "pure";
		this.error = null;
		this.render();
	}

	// Contract interaction methods
	async callContract() {
		if (!window.ethereum) {
			this.error = "Please install a wallet extension like MetaMask";
			this.render();
			return;
		}

		if (!this.contractAddress || !this.methodName || !this.methodData) {
			this.error = "Missing required contract information";
			this.render();
			return;
		}

		try {
			this.loading = true;
			this.result = null;
			this.error = null;
			this.render();

			// Check if wallet is connected
			const accounts = await window.ethereum.request({
				method: "eth_accounts",
			});

			if (accounts.length === 0) {
				throw new Error("Please connect your wallet first");
			}

			// Check chain
			const currentChainId = await window.ethereum.request({
				method: "eth_chainId",
			});

			if (currentChainId !== this.chainId) {
				await this.switchChain();
			}

			// Encode method call
			const methodSignature = this.encodeMethodSignature();
			const encodedArgs = this.encodeArguments();
			const data = methodSignature + encodedArgs;

			let result;

			if (this.isReadOnly) {
				// For read-only methods, use eth_call
				result = await window.ethereum.request({
					method: "eth_call",
					params: [
						{
							to: this.contractAddress,
							data: data,
						},
						"latest",
					],
				});
				this.result = this.decodeResult(result);
			} else {
				// For write methods, send transaction
				const txHash = await window.ethereum.request({
					method: "eth_sendTransaction",
					params: [
						{
							from: accounts[0],
							to: this.contractAddress,
							data: data,
							gas: "0x30D40", // 200000 in hex - higher gas limit for contract calls
							gasPrice: "0x4A817C800", // 20 gwei in hex
						},
					],
				});
				this.result = { transactionHash: txHash };
			}

			this.loading = false;
			this.render();

			this.dispatchEvent(
				new CustomEvent("contract-call-success", {
					detail: {
						result: this.result,
						method: this.methodName,
						args: this.methodArgs,
						isReadOnly: this.isReadOnly,
					},
				}),
			);
		} catch (error) {
			console.error("Contract call failed:", error);
			this.error = error.message;
			this.loading = false;
			this.render();

			this.dispatchEvent(
				new CustomEvent("contract-call-error", {
					detail: { error: error.message },
				}),
			);
		}
	}

	async switchChain() {
		try {
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{ chainId: this.chainId }],
			});
		} catch (switchError) {
			throw new Error(`Failed to switch chain: ${switchError.message}`);
		}
	}

	// Encoding and decoding methods
	encodeMethodSignature() {
		const inputs = this.methodData.inputs || [];
		const types = inputs.map((input) => input.type).join(",");
		const signature = `${this.methodName}(${types})`;

		// Use proper keccak256 hash - for production use a crypto library
		const hash = this.keccak256(signature);
		return hash.slice(0, 10); // First 4 bytes (function selector)
	}

	encodeArguments() {
		const inputs = this.methodData.inputs || [];

		// If method has no inputs or no args provided, return empty string
		if (!inputs.length || !this.methodArgs.length) return "";

		// This is a simplified encoding - in production, use ethers.js or web3.js
		let encoded = "";

		for (let i = 0; i < this.methodArgs.length; i++) {
			const arg = this.methodArgs[i];
			const input = inputs[i];

			if (!input) continue;

			encoded += this.encodeValue(arg, input.type);
		}

		return encoded;
	}

	encodeValue(value, type) {
		// Simplified encoding - use proper ABI encoding library in production
		if (type === "uint256" || type === "uint") {
			return BigInt(value).toString(16).padStart(64, "0");
		} else if (type === "address") {
			return value.toLowerCase().replace("0x", "").padStart(64, "0");
		} else if (type === "string") {
			const hex = Array.from(new TextEncoder().encode(value))
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
			return hex.padEnd(64, "0");
		}
		return "".padStart(64, "0");
	}

	decodeResult(result) {
		if (!result || result === "0x") return null;

		// Simplified decoding - use proper ABI decoding library in production
		const outputs = this.methodData.outputs || [];
		if (outputs.length === 0) return result;

		const output = outputs[0];
		const data = result.replace("0x", "");

		if (output.type === "uint256" || output.type === "uint") {
			return BigInt("0x" + data).toString();
		} else if (output.type === "address") {
			return "0x" + data.slice(-40);
		} else if (output.type === "string") {
			// Simplified string decoding
			try {
				const bytes =
					data.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || [];
				return new TextDecoder().decode(new Uint8Array(bytes));
			} catch (e) {
				return data;
			}
		}

		return result;
	}

	keccak256(input) {
		// Use the keccak256 function defined at the bottom of this file
		return keccak256(input);
	}

	// UI helper methods
	getCSSVariable(name, defaultValue) {
		return this.getAttribute(name) || defaultValue;
	}

	getStatusColor() {
		if (this.error) return "#ef4444";
		if (this.result) return "#22c55e";
		return this.getCSSVariable("primary", "#5F8787");
	}

	getStatusText() {
		if (this.loading) return "Processing...";
		if (this.error) return `Error: ${this.error}`;
		if (this.result) {
			if (this.isReadOnly) {
				return `Result: ${JSON.stringify(this.result)}`;
			} else {
				return `Transaction: ${this.result.transactionHash}`;
			}
		}
		return "";
	}

	// Render methods
	render() {
		const background = this.getCSSVariable("background", "#232323");
		const foreground = this.getCSSVariable("foreground", "#ffffff");
		const primary = this.getCSSVariable("primary", "#5F8787");
		const secondary = this.getCSSVariable("secondary", "#6F9797");
		const borderRadius = this.getCSSVariable("border-radius", "4px");

		this.shadowRoot.innerHTML = `
			<style>
				:host {
					--color-background: ${background};
					--color-foreground: ${foreground};
					--color-primary: ${primary};
					--color-secondary: ${secondary};
					--border-radius: ${borderRadius};
					display: inline-block;
					font-family: sans-serif;
				}

				.container {
					display: flex;
					flex-direction: column;
					gap: 12px;
					padding: 16px;
					background: var(--color-background);
					border: 1px solid rgba(255, 255, 255, 0.1);
					border-radius: var(--border-radius);
					color: var(--color-foreground);
					min-width: 300px;
				}

				.contract-info {
					display: flex;
					flex-direction: column;
					gap: 8px;
					font-size: 14px;
					opacity: 0.8;
				}

				.info-row {
					display: flex;
					justify-content: space-between;
					align-items: center;
				}

				.info-label {
					font-weight: 600;
					min-width: 80px;
				}

				.info-value {
					font-family: monospace;
					word-break: break-all;
					text-align: right;
					flex: 1;
					margin-left: 12px;
				}

				.method-info {
					background: rgba(255, 255, 255, 0.05);
					border-radius: calc(var(--border-radius) / 2);
					padding: 12px;
				}

				.method-signature {
					font-family: monospace;
					font-size: 13px;
					color: var(--color-primary);
					margin-bottom: 8px;
				}

				button {
					padding: 12px 20px;
					background: var(--color-primary);
					color: var(--color-foreground);
					border: none;
					border-radius: var(--border-radius);
					cursor: pointer;
					font-size: 16px;
					font-weight: 600;
					transition: background-color 0.3s ease;
				}

				button:hover:not(:disabled) {
					background: var(--color-secondary);
				}

				button:disabled {
					opacity: 0.7;
					cursor: not-allowed;
				}

				.status {
					padding: 12px;
					border-radius: calc(var(--border-radius) / 2);
					font-size: 14px;
					word-break: break-all;
					border: 1px solid;
					border-color: ${this.getStatusColor()};
					background: ${this.getStatusColor()}20;
					color: ${this.getStatusColor()};
				}

				.loading {
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.spinner {
					width: 16px;
					height: 16px;
					border: 2px solid rgba(255, 255, 255, 0.3);
					border-top: 2px solid var(--color-foreground);
					border-radius: 50%;
					animation: spin 1s linear infinite;
				}

				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}

				.error {
					color: #ef4444;
				}

				.success {
					color: #22c55e;
				}
			</style>
		`;

		const container = document.createElement("div");
		container.className = "container";

		// Contract info section
		const contractInfo = document.createElement("div");
		contractInfo.className = "contract-info";

		if (this.contractAddress) {
			contractInfo.innerHTML = `
				<div class="info-row">
					<span class="info-label">Contract:</span>
					<span class="info-value">${this.contractAddress}</span>
				</div>
			`;
		}

		// Method info section
		if (this.methodData) {
			const methodInfo = document.createElement("div");
			methodInfo.className = "method-info";

			const inputs = this.methodData.inputs || [];
			const inputTypes =
				inputs.length > 0
					? inputs.map((input) => `${input.type} ${input.name}`).join(", ")
					: "";
			const signature = `${this.methodName}(${inputTypes})`;

			methodInfo.innerHTML = `
				<div class="method-signature">${signature}</div>
			`;

			container.appendChild(methodInfo);
		}

		container.appendChild(contractInfo);

		// Button
		const button = document.createElement("button");
		button.disabled = this.loading || !this.contractAddress || !this.methodData;

		if (this.loading) {
			button.innerHTML = `
				<div class="loading">
					<div class="spinner"></div>
					<span>Processing...</span>
				</div>
			`;
		} else {
			button.textContent = this.buttonText;
		}

		button.addEventListener("click", () => this.callContract());
		container.appendChild(button);

		// Status section
		const statusText = this.getStatusText();
		if (statusText) {
			const status = document.createElement("div");
			status.className = "status";
			status.textContent = statusText;
			container.appendChild(status);
		}

		this.shadowRoot.appendChild(container);
	}
}

customElements.define("contract-call", ContractCall);

/**
 * Minimal Keccak256 implementation for browser use
 * Based on js-sha3 by emn178
 * https://github.com/emn178/js-sha3
 */

// Keccak constants
const KECCAK_PADDING = [1, 256, 65536, 16777216];
const SHIFT = [0, 8, 16, 24];
const RC = [
	1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0,
	2147483649, 0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0,
	2147516425, 0, 2147483658, 0, 2147516555, 0, 139, 2147483648, 32905,
	2147483648, 32771, 2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0,
	2147483658, 2147483648, 2147516545, 2147483648, 32896, 2147483648, 2147483649,
	0, 2147516424, 2147483648,
];

function Keccak(bits) {
	this.blocks = [];
	this.s = [];
	this.padding = KECCAK_PADDING;
	this.outputBits = bits;
	this.reset = true;
	this.finalized = false;
	this.block = 0;
	this.start = 0;
	this.blockCount = (1600 - (bits << 1)) >> 5;
	this.byteCount = this.blockCount << 2;
	this.outputBlocks = bits >> 5;
	this.extraBytes = (bits & 31) >> 3;

	for (var i = 0; i < 50; ++i) {
		this.s[i] = 0;
	}
}

Keccak.prototype.update = function (message) {
	if (this.finalized) {
		throw new Error("finalized");
	}
	var notString,
		type = typeof message;
	if (type !== "string") {
		if (type === "object") {
			if (message === null) {
				throw new Error("message is null");
			} else if (
				Array.isArray(message) ||
				(typeof ArrayBuffer !== "undefined" &&
					message.constructor === ArrayBuffer)
			) {
				message = new Uint8Array(message);
			} else if (!ArrayBuffer.isView(message)) {
				throw new Error("invalid message type");
			}
		} else {
			throw new Error("invalid message type");
		}
		notString = true;
	}
	var blocks = this.blocks,
		byteCount = this.byteCount,
		length = message.length,
		blockCount = this.blockCount,
		index = 0,
		s = this.s,
		i,
		code;

	while (index < length) {
		if (this.reset) {
			this.reset = false;
			blocks[0] = this.block;
			for (i = 1; i < blockCount + 1; ++i) {
				blocks[i] = 0;
			}
		}
		if (notString) {
			for (i = this.start; index < length && i < byteCount; ++index) {
				blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
			}
		} else {
			for (i = this.start; index < length && i < byteCount; ++index) {
				code = message.charCodeAt(index);
				if (code < 0x80) {
					blocks[i >> 2] |= code << SHIFT[i++ & 3];
				} else if (code < 0x800) {
					blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
					blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
				} else if (code < 0xd800 || code >= 0xe000) {
					blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
					blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
					blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
				} else {
					code =
						0x10000 +
						(((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
					blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
					blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
					blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
					blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
				}
			}
		}

		this.lastByteIndex = i;
		if (i >= byteCount) {
			this.start = i - byteCount;
			this.block = blocks[blockCount];
			for (i = 0; i < blockCount; ++i) {
				s[i] ^= blocks[i];
			}
			f(s);
			this.reset = true;
		} else {
			this.start = i;
		}
	}
	return this;
};

Keccak.prototype.finalize = function () {
	if (this.finalized) {
		return;
	}
	this.finalized = true;
	var blocks = this.blocks,
		i = this.lastByteIndex,
		blockCount = this.blockCount,
		s = this.s;
	blocks[i >> 2] |= this.padding[i & 3];
	if (this.lastByteIndex === this.byteCount) {
		blocks[0] = blocks[blockCount];
		for (i = 1; i < blockCount + 1; ++i) {
			blocks[i] = 0;
		}
	}
	blocks[blockCount - 1] |= 0x80000000;
	for (i = 0; i < blockCount; ++i) {
		s[i] ^= blocks[i];
	}
	f(s);
};

Keccak.prototype.toString = Keccak.prototype.hex = function () {
	this.finalize();

	var blockCount = this.blockCount,
		s = this.s,
		outputBlocks = this.outputBlocks,
		extraBytes = this.extraBytes,
		i = 0,
		j = 0;
	var hex = "",
		block;
	while (j < outputBlocks) {
		for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
			block = s[i];
			hex +=
				HEX_CHARS[(block >> 4) & 0x0f] +
				HEX_CHARS[block & 0x0f] +
				HEX_CHARS[(block >> 12) & 0x0f] +
				HEX_CHARS[(block >> 8) & 0x0f] +
				HEX_CHARS[(block >> 20) & 0x0f] +
				HEX_CHARS[(block >> 16) & 0x0f] +
				HEX_CHARS[(block >> 28) & 0x0f] +
				HEX_CHARS[(block >> 24) & 0x0f];
		}
		if (j % blockCount === 0) {
			f(s);
			i = 0;
		}
	}
	if (extraBytes) {
		block = s[i];
		hex += HEX_CHARS[(block >> 4) & 0x0f] + HEX_CHARS[block & 0x0f];
		if (extraBytes > 1) {
			hex += HEX_CHARS[(block >> 12) & 0x0f] + HEX_CHARS[(block >> 8) & 0x0f];
		}
		if (extraBytes > 2) {
			hex += HEX_CHARS[(block >> 20) & 0x0f] + HEX_CHARS[(block >> 16) & 0x0f];
		}
	}
	return hex;
};

const HEX_CHARS = "0123456789abcdef".split("");

var f = function (s) {
	var h,
		l,
		n,
		c0,
		c1,
		c2,
		c3,
		c4,
		c5,
		c6,
		c7,
		c8,
		c9,
		b0,
		b1,
		b2,
		b3,
		b4,
		b5,
		b6,
		b7,
		b8,
		b9,
		b10,
		b11,
		b12,
		b13,
		b14,
		b15,
		b16,
		b17,
		b18,
		b19,
		b20,
		b21,
		b22,
		b23,
		b24,
		b25,
		b26,
		b27,
		b28,
		b29,
		b30,
		b31,
		b32,
		b33,
		b34,
		b35,
		b36,
		b37,
		b38,
		b39,
		b40,
		b41,
		b42,
		b43,
		b44,
		b45,
		b46,
		b47,
		b48,
		b49;
	for (n = 0; n < 48; n += 2) {
		c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
		c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
		c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
		c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
		c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
		c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
		c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
		c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
		c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
		c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];

		h = c8 ^ ((c2 << 1) | (c3 >>> 31));
		l = c9 ^ ((c3 << 1) | (c2 >>> 31));
		s[0] ^= h;
		s[1] ^= l;
		s[10] ^= h;
		s[11] ^= l;
		s[20] ^= h;
		s[21] ^= l;
		s[30] ^= h;
		s[31] ^= l;
		s[40] ^= h;
		s[41] ^= l;
		h = c0 ^ ((c4 << 1) | (c5 >>> 31));
		l = c1 ^ ((c5 << 1) | (c4 >>> 31));
		s[2] ^= h;
		s[3] ^= l;
		s[12] ^= h;
		s[13] ^= l;
		s[22] ^= h;
		s[23] ^= l;
		s[32] ^= h;
		s[33] ^= l;
		s[42] ^= h;
		s[43] ^= l;
		h = c2 ^ ((c6 << 1) | (c7 >>> 31));
		l = c3 ^ ((c7 << 1) | (c6 >>> 31));
		s[4] ^= h;
		s[5] ^= l;
		s[14] ^= h;
		s[15] ^= l;
		s[24] ^= h;
		s[25] ^= l;
		s[34] ^= h;
		s[35] ^= l;
		s[44] ^= h;
		s[45] ^= l;
		h = c4 ^ ((c8 << 1) | (c9 >>> 31));
		l = c5 ^ ((c9 << 1) | (c8 >>> 31));
		s[6] ^= h;
		s[7] ^= l;
		s[16] ^= h;
		s[17] ^= l;
		s[26] ^= h;
		s[27] ^= l;
		s[36] ^= h;
		s[37] ^= l;
		s[46] ^= h;
		s[47] ^= l;
		h = c6 ^ ((c0 << 1) | (c1 >>> 31));
		l = c7 ^ ((c1 << 1) | (c0 >>> 31));
		s[8] ^= h;
		s[9] ^= l;
		s[18] ^= h;
		s[19] ^= l;
		s[28] ^= h;
		s[29] ^= l;
		s[38] ^= h;
		s[39] ^= l;
		s[48] ^= h;
		s[49] ^= l;

		b0 = s[0];
		b1 = s[1];
		b32 = (s[11] << 4) | (s[10] >>> 28);
		b33 = (s[10] << 4) | (s[11] >>> 28);
		b14 = (s[20] << 3) | (s[21] >>> 29);
		b15 = (s[21] << 3) | (s[20] >>> 29);
		b46 = (s[31] << 9) | (s[30] >>> 23);
		b47 = (s[30] << 9) | (s[31] >>> 23);
		b28 = (s[40] << 18) | (s[41] >>> 14);
		b29 = (s[41] << 18) | (s[40] >>> 14);
		b20 = (s[2] << 1) | (s[3] >>> 31);
		b21 = (s[3] << 1) | (s[2] >>> 31);
		b2 = (s[13] << 12) | (s[12] >>> 20);
		b3 = (s[12] << 12) | (s[13] >>> 20);
		b34 = (s[22] << 10) | (s[23] >>> 22);
		b35 = (s[23] << 10) | (s[22] >>> 22);
		b16 = (s[33] << 13) | (s[32] >>> 19);
		b17 = (s[32] << 13) | (s[33] >>> 19);
		b48 = (s[42] << 2) | (s[43] >>> 30);
		b49 = (s[43] << 2) | (s[42] >>> 30);
		b40 = (s[5] << 30) | (s[4] >>> 2);
		b41 = (s[4] << 30) | (s[5] >>> 2);
		b22 = (s[14] << 6) | (s[15] >>> 26);
		b23 = (s[15] << 6) | (s[14] >>> 26);
		b4 = (s[25] << 11) | (s[24] >>> 21);
		b5 = (s[24] << 11) | (s[25] >>> 21);
		b36 = (s[34] << 15) | (s[35] >>> 17);
		b37 = (s[35] << 15) | (s[34] >>> 17);
		b18 = (s[45] << 29) | (s[44] >>> 3);
		b19 = (s[44] << 29) | (s[45] >>> 3);
		b10 = (s[6] << 28) | (s[7] >>> 4);
		b11 = (s[7] << 28) | (s[6] >>> 4);
		b42 = (s[17] << 23) | (s[16] >>> 9);
		b43 = (s[16] << 23) | (s[17] >>> 9);
		b24 = (s[26] << 25) | (s[27] >>> 7);
		b25 = (s[27] << 25) | (s[26] >>> 7);
		b6 = (s[36] << 21) | (s[37] >>> 11);
		b7 = (s[37] << 21) | (s[36] >>> 11);
		b38 = (s[47] << 24) | (s[46] >>> 8);
		b39 = (s[46] << 24) | (s[47] >>> 8);
		b30 = (s[8] << 27) | (s[9] >>> 5);
		b31 = (s[9] << 27) | (s[8] >>> 5);
		b12 = (s[18] << 20) | (s[19] >>> 12);
		b13 = (s[19] << 20) | (s[18] >>> 12);
		b44 = (s[29] << 7) | (s[28] >>> 25);
		b45 = (s[28] << 7) | (s[29] >>> 25);
		b26 = (s[38] << 8) | (s[39] >>> 24);
		b27 = (s[39] << 8) | (s[38] >>> 24);
		b8 = (s[48] << 14) | (s[49] >>> 18);
		b9 = (s[49] << 14) | (s[48] >>> 18);

		s[0] = b0 ^ (~b2 & b4);
		s[1] = b1 ^ (~b3 & b5);
		s[10] = b10 ^ (~b12 & b14);
		s[11] = b11 ^ (~b13 & b15);
		s[20] = b20 ^ (~b22 & b24);
		s[21] = b21 ^ (~b23 & b25);
		s[30] = b30 ^ (~b32 & b34);
		s[31] = b31 ^ (~b33 & b35);
		s[40] = b40 ^ (~b42 & b44);
		s[41] = b41 ^ (~b43 & b45);
		s[2] = b2 ^ (~b4 & b6);
		s[3] = b3 ^ (~b5 & b7);
		s[12] = b12 ^ (~b14 & b16);
		s[13] = b13 ^ (~b15 & b17);
		s[22] = b22 ^ (~b24 & b26);
		s[23] = b23 ^ (~b25 & b27);
		s[32] = b32 ^ (~b34 & b36);
		s[33] = b33 ^ (~b35 & b37);
		s[42] = b42 ^ (~b44 & b46);
		s[43] = b43 ^ (~b45 & b47);
		s[4] = b4 ^ (~b6 & b8);
		s[5] = b5 ^ (~b7 & b9);
		s[14] = b14 ^ (~b16 & b18);
		s[15] = b15 ^ (~b17 & b19);
		s[24] = b24 ^ (~b26 & b28);
		s[25] = b25 ^ (~b27 & b29);
		s[34] = b34 ^ (~b36 & b38);
		s[35] = b35 ^ (~b37 & b39);
		s[44] = b44 ^ (~b46 & b48);
		s[45] = b45 ^ (~b47 & b49);
		s[6] = b6 ^ (~b8 & b0);
		s[7] = b7 ^ (~b9 & b1);
		s[16] = b16 ^ (~b18 & b10);
		s[17] = b17 ^ (~b19 & b11);
		s[26] = b26 ^ (~b28 & b20);
		s[27] = b27 ^ (~b29 & b21);
		s[36] = b36 ^ (~b38 & b30);
		s[37] = b37 ^ (~b39 & b31);
		s[46] = b46 ^ (~b48 & b40);
		s[47] = b47 ^ (~b49 & b41);
		s[8] = b8 ^ (~b0 & b2);
		s[9] = b9 ^ (~b1 & b3);
		s[18] = b18 ^ (~b10 & b12);
		s[19] = b19 ^ (~b11 & b13);
		s[28] = b28 ^ (~b20 & b22);
		s[29] = b29 ^ (~b21 & b23);
		s[38] = b38 ^ (~b30 & b32);
		s[39] = b39 ^ (~b31 & b33);
		s[48] = b48 ^ (~b40 & b42);
		s[49] = b49 ^ (~b41 & b43);

		s[0] ^= RC[n];
		s[1] ^= RC[n + 1];
	}
};

// Export keccak256 function
export function keccak256(message) {
	const keccak = new Keccak(256);
	keccak.update(message);
	return "0x" + keccak.hex();
}

// For CommonJS compatibility
if (typeof module !== "undefined" && module.exports) {
	module.exports = { keccak256 };
}
