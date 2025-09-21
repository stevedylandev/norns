import { keccak_256 } from "@noble/hashes/sha3.js"

class ContractCall extends HTMLElement {
  /**
	* ContractCall Web Component
	*
	* A custom HTML element for interacting with Ethereum smart contracts.
	* Supports both read-only (view/pure) and write operations through wallet integration.
	*
	* @example
	* Basic usage with inline ABI:
	* ```html
	* <contract-call
	*   contract-address="0x1234567890123456789012345678901234567890"
	*   method-name="balanceOf"
	*   method-args='["0xabcdef1234567890123456789012345678901234"]'
	*   abi='[{"type":"function","name":"balanceOf","inputs":[{"type":"address","name":"owner"}],"outputs":[{"type":"uint256","name":""}],"stateMutability":"view"}]'>
	* </contract-call>
	* ```
	*
	* @example
	* Using ABI from URL:
	* ```html
	* <contract-call
	*   contract-address="0x1234567890123456789012345678901234567890"
	*   method-name="transfer"
	*   method-args='["0xrecipient123", "1000000000000000000"]'
	*   abi-url="https://api.example.com/contract-abi.json"
	*   button-text="Send Tokens">
	* </contract-call>
	* ```
	*
	* @example
	* Custom styling:
	* ```html
	* <contract-call
	*   contract-address="0x1234567890123456789012345678901234567890"
	*   method-name="getName"
	*   abi-url="/abi/token.json"
	*   background="#1a1a1a"
	*   foreground="#ffffff"
	*   primary="#00ff88"
	*   secondary="#00cc66"
	*   border-radius="8px"
	*   error-color="#ff4444"
	*   success-color="#44ff44">
	* </contract-call>
	* ```
	*
	* Attributes:
	* - contract-address (required): The Ethereum contract address
	* - method-name (required): The contract method to call
	* - method-args: JSON array of method arguments (default: [])
	* - abi: JSON string of the contract ABI
	* - abi-url: URL to fetch the contract ABI from
	* - chain-id: Ethereum chain ID in hex format (default: "0x1" for mainnet)
	* - button-text: Text displayed on the call button (default: "Call Contract")
	* - background: Background color (default: "#232323")
	* - foreground: Text color (default: "#ffffff")
	* - primary: Primary button color (default: "#5F8787")
	* - secondary: Secondary/hover color (default: "#6F9797")
	* - border-radius: Border radius for UI elements (default: "4px")
	* - error-color: Color for error messages (default: "#E78A53")
	* - success-color: Color for success messages (default: "#5F8787")
	*
	* Events:
	* - abi-loaded: Fired when ABI is successfully loaded from URL
	* - abi-error: Fired when ABI loading fails
	* - contract-call-success: Fired when contract call succeeds
	* - contract-call-error: Fired when contract call fails
	*
	* Requirements:
	* - MetaMask or compatible wallet extension
	* - @noble/hashes library for keccak256 hashing
	*
	* Notes:
	* - Read-only methods (view/pure) use eth_call
	* - Write methods send transactions via eth_sendTransaction
	* - Simplified ABI encoding/decoding (use ethers.js/web3.js for production)
	* - Automatically switches to the specified chain if needed
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
		return Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
	}

	// UI helper methods
	getCSSVariable(name, defaultValue) {
		return this.getAttribute(name) || defaultValue;
	}

	getStatusColor() {
		if (this.error) return this.getCSSVariable("error-color", "#E78A53");
		if (this.result) return this.getCSSVariable("success-color", "#5F8787");
		return this.getCSSVariable("primary", "#5F8787");
	}

	getStatusText() {
		if (this.error) return `Error: ${this.error}`;
		if (this.result) {
			if (this.isReadOnly) {
				return `Result: ${JSON.stringify(this.result)}`;
			} else {
				return `tx: ${this.result.transactionHash}`;
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
					width: 320px;
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
				}

				.info-value {
					font-family: monospace;
					flex: 1;
					font-size: 12px;
					text-align: start;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					max-width: 100%;
				}

				button {
					padding: 12px 20px;
					background: var(--color-primary);
					color: var(--color-foreground);
					border: none;
					border-radius: var(--border-radius);
					cursor: pointer;
					font-size: 16px;
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
					border-radius: calc(var(--border-radius) / 2);
					font-size: 12px;
					font-family: monospace;
					word-break: break-all;
					border-color: ${this.getStatusColor()};
					color: ${this.getStatusColor()};
					max-width: 300px;
					overflow-wrap: break-word;
					white-space: pre-wrap;
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
					color: ${this.getCSSVariable("error-color", "#E78A53")};
				}

				.success {
					color: ${this.getCSSVariable("success-color", "#5F8787")};
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
