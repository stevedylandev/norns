import { keccak_256 } from "@noble/hashes/sha3.js";

class ContractRead extends HTMLElement {
	/**
	 * ContractRead Web Component
	 *
	 * A custom HTML element for reading state from Ethereum smart contracts.
	 * Automatically loads and displays read-only contract state on mount.
	 * Supports both wallet integration and direct RPC calls.
	 *
	 * @example
	 * Basic usage with inline ABI and RPC URL:
	 * ```html
	 * <contract-read
	 *   contract-address="0x1234567890123456789012345678901234567890"
	 *   method-name="balanceOf"
	 *   method-args='["0xabcdef1234567890123456789012345678901234"]'
	 *   rpc-url="https://eth.llamarpc.com"
	 *   abi='[{"type":"function","name":"balanceOf","inputs":[{"type":"address","name":"owner"}],"outputs":[{"type":"uint256","name":""}],"stateMutability":"view"}]'>
	 * </contract-read>
	 * ```
	 *
	 * @example
	 * Using ABI from URL with wallet:
	 * ```html
	 * <contract-read
	 *   contract-address="0x1234567890123456789012345678901234567890"
	 *   method-name="totalSupply"
	 *   abi-url="https://api.example.com/contract-abi.json">
	 * </contract-read>
	 * ```
	 *
	 * @example
	 * Custom styling:
	 * ```html
	 * <contract-read
	 *   contract-address="0x1234567890123456789012345678901234567890"
	 *   method-name="getName"
	 *   abi-url="/abi/token.json"
	 *   rpc-url="https://eth.llamarpc.com"
	 *   background="#1a1a1a"
	 *   foreground="#ffffff"
	 *   primary="#00ff88"
	 *   border-radius="8px"
	 *   error-color="#ff4444"
	 *   success-color="#44ff44">
	 * </contract-read>
	 * ```
	 *
	 * Attributes:
	 * - contract-address (required): The Ethereum contract address
	 * - method-name (required): The contract method to call
	 * - method-args: JSON array of method arguments (default: [])
	 * - abi: JSON string of the contract ABI
	 * - abi-url: URL to fetch the contract ABI from
	 * - rpc-url: RPC URL for direct calls (used when wallet is not available)
	 * - chain-id: Ethereum chain ID in hex format (default: "0x1" for mainnet)
	 * - background: Background color (default: "#232323")
	 * - foreground: Text color (default: "#ffffff")
	 * - primary: Primary color (default: "#5F8787")
	 * - border-radius: Border radius for UI elements (default: "4px")
	 * - error-color: Color for error messages (default: "#E78A53")
	 * - success-color: Color for success messages (default: "#5F8787")
	 *
	 * Events:
	 * - abi-loaded: Fired when ABI is successfully loaded from URL
	 * - abi-error: Fired when ABI loading fails
	 * - contract-read-success: Fired when contract read succeeds
	 * - contract-read-error: Fired when contract read fails
	 *
	 * Requirements:
	 * - @noble/hashes library for keccak256 hashing
	 * - Either a wallet extension (MetaMask) or rpc-url attribute
	 *
	 * Notes:
	 * - Only supports read-only methods (view/pure)
	 * - Automatically loads state on component mount
	 * - Uses wallet if available, falls back to RPC URL
	 * - Simplified ABI encoding/decoding (use ethers.js/web3.js for production)
	 */

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
		this.rpcUrl = "";
		this.isReadOnly = true;
	}

	static get observedAttributes() {
		return [
			"contract-address",
			"chain-id",
			"method-name",
			"method-args",
			"abi-url",
			"abi",
			"rpc-url",
			"background",
			"foreground",
			"primary",
			"border-radius",
			"error-color",
			"success-color",
		];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;

		switch (name) {
			case "contract-address":
				this.contractAddress = newValue || "";
				break;
			case "chain-id":
				this.chainId = this.normalizeChainId(newValue);
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
			case "rpc-url":
				this.rpcUrl = newValue || "";
				break;
			default:
				if (
					[
						"background",
						"foreground",
						"primary",
						"border-radius",
						"error-color",
						"success-color",
					].includes(name)
				) {
					this.render();
				}
		}
	}

	connectedCallback() {
		this.contractAddress = this.getAttribute("contract-address") || "";
		const chainIdAttr = this.getAttribute("chain-id");
		this.chainId = this.normalizeChainId(chainIdAttr);
		this.methodName = this.getAttribute("method-name") || "";
		this.abiUrl = this.getAttribute("abi-url") || "";
		this.rpcUrl = this.getAttribute("rpc-url") || "";

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
			this.fetchAbi().then(() => {
				// Auto-call contract after ABI is loaded
				if (this.methodData) {
					this.readContract();
				}
			});
		} else if (this.abi) {
			this.parseMethodFromAbi();
			// Auto-call contract on mount
			if (this.methodData) {
				this.readContract();
			}
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

	/**
	 * Converts a numeric chain ID to hex format
	 * @param {string|number} chainId - Chain ID in numeric or hex format
	 * @returns {string} Chain ID in hex format (e.g., "0x2105")
	 */
	normalizeChainId(chainId) {
		if (!chainId) return "0x1";

		const chainIdStr = String(chainId);

		// If it's already in hex format (starts with 0x), return as-is
		if (chainIdStr.startsWith("0x")) {
			return chainIdStr.toLowerCase();
		}

		// Convert numeric string to hex
		const numericChainId = parseInt(chainIdStr, 10);
		if (isNaN(numericChainId)) {
			console.warn(`Invalid chain ID: ${chainId}, defaulting to 0x1`);
			return "0x1";
		}

		return `0x${numericChainId.toString(16)}`;
	}

	// Contract interaction methods
	async readContract() {
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

			// Encode method call
			const methodSignature = this.encodeMethodSignature();
			const encodedArgs = this.encodeArguments();
			const data = methodSignature + encodedArgs;

			let result;

			// Try to use wallet first, fall back to RPC URL
			if (window.ethereum) {
				try {
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
				} catch (walletError) {
					console.warn("Wallet call failed, trying RPC URL:", walletError);
					if (this.rpcUrl) {
						result = await this.callViaRpc(data);
					} else {
						throw walletError;
					}
				}
			} else if (this.rpcUrl) {
				// No wallet available, use RPC URL
				result = await this.callViaRpc(data);
			} else {
				throw new Error(
					"No wallet extension found and no RPC URL provided. Please install MetaMask or provide an rpc-url attribute.",
				);
			}

			this.result = this.decodeResult(result);
			this.loading = false;
			this.render();

			this.dispatchEvent(
				new CustomEvent("contract-read-success", {
					detail: {
						result: this.result,
						method: this.methodName,
						args: this.methodArgs,
					},
				}),
			);
		} catch (error) {
			console.error("Contract read failed:", error);
			this.error = error.message;
			this.loading = false;
			this.render();

			this.dispatchEvent(
				new CustomEvent("contract-read-error", {
					detail: { error: error.message },
				}),
			);
		}
	}

	async callViaRpc(data) {
		if (!this.rpcUrl) {
			throw new Error("RPC URL not configured");
		}

		const response = await fetch(this.rpcUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "eth_call",
				params: [
					{
						to: this.contractAddress,
						data: data,
					},
					"latest",
				],
				id: 1,
			}),
		});

		if (!response.ok) {
			throw new Error(`RPC request failed: ${response.statusText}`);
		}

		const json = await response.json();

		if (json.error) {
			throw new Error(`RPC error: ${json.error.message}`);
		}

		return json.result;
	}

	// Encoding and decoding methods
	encodeMethodSignature() {
		const inputs = this.methodData.inputs || [];
		const types = inputs.map((input) => input.type).join(",");
		const signature = `${this.methodName}(${types})`;

		// Use proper keccak256 hash - for production use a crypto library
		const hash = this.keccak256(signature);
		return "0x" + hash.slice(0, 8); // First 4 bytes (function selector)
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
				console.log(e);
				return data;
			}
		}

		return result;
	}

	keccak256(input) {
		const inputBytes = new TextEncoder().encode(input);
		const hashBytes = keccak_256(inputBytes);
		return Array.from(hashBytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}

	// UI helper methods
	getCSSVariable(name, defaultValue) {
		return this.getAttribute(name) || defaultValue;
	}

	getStatusColor() {
		if (this.error) return this.getCSSVariable("error-color", "#E78A53");
		if (this.result !== null)
			return this.getCSSVariable("success-color", "#5F8787");
		return this.getCSSVariable("primary", "#5F8787");
	}

	// Render methods
	render() {
		const background = this.getCSSVariable("background", "#232323");
		const foreground = this.getCSSVariable("foreground", "#ffffff");
		const primary = this.getCSSVariable("primary", "#5F8787");
		const borderRadius = this.getCSSVariable("border-radius", "4px");

		this.shadowRoot.innerHTML = `
			<style>
				:host {
					--norns-color-background: ${background};
					--norns-color-foreground: ${foreground};
					--norns-color-primary: ${primary};
					--norns-border-radius: ${borderRadius};
					display: inline-block;
					font-family: sans-serif;
				}

				.container {
					display: flex;
					flex-direction: column;
					gap: 12px;
					padding: 16px;
					background: var(--norns-color-background);
					border: 1px solid rgba(255, 255, 255, 0.1);
					border-radius: var(--norns-border-radius);
					color: var(--norns-color-foreground);
					width: 300px;
					box-sizing: border-box;
				}

				@media (max-width: 768px) {
					.container {
						width: 280px;
						padding: 12px;
						gap: 10px;
					}
				}

				@media (max-width: 480px) {
					.container {
						width: 260px;
						padding: 10px;
						gap: 8px;
					}
				}

				@media (max-width: 320px) {
					.container {
						width: 240px;
						padding: 8px;
						gap: 6px;
					}
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
					flex-direction: column;
				}

				.info-label {
					font-weight: 600;
					margin-bottom: 4px;
				}

				.info-value {
					font-family: monospace;
					font-size: 12px;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					max-width: 100%;
				}

				.status {
					font-size: 14px;
					font-family: monospace;
					word-break: break-all;
					color: ${this.getStatusColor()};
					overflow-wrap: break-word;
					white-space: pre-wrap;
				}

				.loading {
					display: flex;
					align-items: center;
					gap: 8px;
					color: var(--norns-color-primary);
				}

				.spinner {
					width: 16px;
					height: 16px;
					border: 2px solid rgba(255, 255, 255, 0.3);
					border-top: 2px solid var(--norns-color-foreground);
					border-radius: 50%;
					animation: spin 1s linear infinite;
				}

				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}

				.error {
					color: ${this.getCSSVariable("error-color", "#E78A53")};
				}

				.success {
					color: ${this.getCSSVariable("success-color", "#5F8787")};
				}

				.result-label {
					font-weight: 600;
					margin-bottom: 4px;
					font-size: 14px;
				}

				.result-value {
					font-family: monospace;
					font-size: 14px;
					color: var(--norns-color-primary);
				}
			</style>
		`;

		const container = document.createElement("div");
		container.className = "container";

		// Loading state
		if (this.loading) {
			const loadingDiv = document.createElement("div");
			loadingDiv.className = "loading";
			loadingDiv.innerHTML = `
				<div class="spinner"></div>
				<span>Reading contract...</span>
			`;
			container.appendChild(loadingDiv);
		}

		// Result or error section
		if (this.error) {
			const errorDiv = document.createElement("div");
			errorDiv.className = "status error";
			errorDiv.textContent = `Error: ${this.error}`;
			container.appendChild(errorDiv);
		} else if (this.result !== null && !this.loading) {
			const resultDiv = document.createElement("div");
			resultDiv.className = "info-row";
			resultDiv.innerHTML = `
				<span class="result-label">${this.methodName}</span>
				<span class="result-value">${this.result}</span>
			`;
			container.appendChild(resultDiv);
		}

		this.shadowRoot.appendChild(container);
	}
}

customElements.define("contract-read", ContractRead);
