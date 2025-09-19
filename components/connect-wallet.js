class ConnectWallet extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.connected = false;
		this.address = "";
		this.ensData = null;
		this.loading = false;
		this.chainId = "0x1";
		this.currentChainId = null;
	}

	static get observedAttributes() {
		return ["chain-id"];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === "chain-id" && oldValue !== newValue) {
			this.chainId = newValue;
			// If already connected, check if we need to switch chains
			if (this.connected) {
				this.checkAndSwitchChain();
			}
		}
	}

	connectedCallback() {
		// Get chain-id from attribute
		this.chainId = this.getAttribute("chain-id");
		this.render();
	}

	async connect() {
		if (window.ethereum) {
			try {
				this.loading = true;
				this.render();

				const accounts = await window.ethereum.request({
					method: "eth_requestAccounts",
				});

				this.address = accounts[0];

				// Get current chain
				this.currentChainId = await window.ethereum.request({
					method: "eth_chainId",
				});

				// Switch to desired chain if specified
				if (this.chainId && this.chainId !== this.currentChainId) {
					await this.switchChain(this.chainId);
				}

				this.connected = true;

				await this.fetchEnsData();

				this.loading = false;
				this.render();

				// Dispatch custom event
				this.dispatchEvent(
					new CustomEvent("wallet-connected", {
						detail: {
							address: this.address,
							ensData: this.ensData,
							chainId: this.currentChainId,
						},
					}),
				);
			} catch (error) {
				console.error("Connection failed", error);
				this.loading = false;
				this.render();

				// Dispatch error event
				this.dispatchEvent(
					new CustomEvent("wallet-error", {
						detail: { error: error.message },
					}),
				);
			}
		} else {
			alert("Please install a wallet extension like MetaMask");
		}
	}

	async switchChain(chainId) {
		try {
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{ chainId }],
			});
			this.currentChainId = chainId;
		} catch (switchError) {
			// Chain not added to wallet
			if (switchError.code === 4902) {
				try {
					await this.addChain(chainId);
				} catch (addError) {
					throw new Error(`Failed to add chain: ${addError.message}`);
				}
			} else {
				throw new Error(`Failed to switch chain: ${switchError.message}`);
			}
		}
	}

	async addChain(chainId) {
		const chainConfig = this.getChainConfig(chainId);
		if (!chainConfig) {
			throw new Error(`Unknown chain ID: ${chainId}`);
		}

		await window.ethereum.request({
			method: "wallet_addEthereumChain",
			params: [chainConfig],
		});
		this.currentChainId = chainId;
	}

	async checkAndSwitchChain() {
		if (window.ethereum && this.chainId && this.connected) {
			const currentChain = await window.ethereum.request({
				method: "eth_chainId",
			});

			if (currentChain !== this.chainId) {
				try {
					await this.switchChain(this.chainId);
					this.render();
				} catch (error) {
					console.error("Failed to switch chain:", error);
				}
			}
		}
	}

	getChainConfig(chainId) {
		const chains = {
			"0x1": {
				chainId: "0x1",
				chainName: "Ethereum Mainnet",
				rpcUrls: ["https://eth.drpc.org"],
				nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
				blockExplorerUrls: ["https://etherscan.io/"],
			},
			"0x89": {
				chainId: "0x89",
				chainName: "Polygon",
				rpcUrls: ["https://polygon.drpc.org"],
				nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
				blockExplorerUrls: ["https://polygonscan.com/"],
			},
			"0xa": {
				chainId: "0xa",
				chainName: "Optimism",
				rpcUrls: ["https://optimism.drpc.org"],
				nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
				blockExplorerUrls: ["https://optimistic.etherscan.io/"],
			},
			"0xa4b1": {
				chainId: "0xa4b1",
				chainName: "Arbitrum One",
				rpcUrls: ["https://arbitrum.drpc.org"],
				nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
				blockExplorerUrls: ["https://arbiscan.io/"],
			},
			"0x2105": {
				chainId: "0x2105",
				chainName: "Base",
				rpcUrls: ["https://base.drpc.org"],
				nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
				blockExplorerUrls: ["https://basescan.org/"],
			},
			// Add more chains as needed
		};

		return chains[chainId];
	}

	getChainName(chainId) {
		const chainNames = {
			"0x1": "Ethereum",
			"0x89": "Polygon",
			"0xa": "Optimism",
			"0xa4b1": "Arbitrum",
			"0x2105": "Base",
			// Add more as needed
		};
		return chainNames[chainId] || `Chain ${chainId}`;
	}
	renderProfile() {
		const profileDiv = document.createElement("div");
		profileDiv.className = "profile";

		const avatar = this.ensData?.avatar_small;
		const displayName = this.getDisplayName();
		const hasEns = this.ensData?.ens_primary;
		const addressToShow = this.truncateAddress(this.address);

		// Create avatar element
		let avatarElement = "";
		if (avatar) {
			avatarElement = `<img src="${avatar}" alt="Avatar" class="avatar" onerror="this.style.display='none'">`;
		} else {
			avatarElement = `<div class="avatar-placeholder"></div>`;
		}

		profileDiv.innerHTML = `
			${avatarElement}
			<div class="profile-info">
				<h3>${displayName}</h3>
				${hasEns ? `<p>${addressToShow}</p>` : ""}
			</div>
		`;

		profileDiv.addEventListener("click", () => {
			this.disconnect();
		});

		this.shadowRoot.appendChild(profileDiv);
	}

	async fetchEnsData() {
		try {
			const response = await fetch(`https://api.ensdata.net/${this.address}`);
			if (response.ok) {
				this.ensData = await response.json();
				console.log("ENS data loaded:", this.ensData);
			} else {
				console.log("No ENS data found for this address");
				this.ensData = null;
			}
		} catch (error) {
			console.error("Failed to fetch ENS data", error);
			this.ensData = null;
		}
	}

	disconnect() {
		this.connected = false;
		this.address = "";
		this.ensData = null;
		this.currentChainId = null;
		this.render();

		// Dispatch custom event
		this.dispatchEvent(new CustomEvent("wallet-disconnected"));
	}

	// Add CSS for chain display
	render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					--bg-color: ${this.connected ? "#232323" : "#5F8787"};
					--bg-hover-color: ${this.connected ? "#262626" : "#6F9797"};
					display: inline-block;
				}

				button {
					padding: 10px 20px;
					background: var(--bg-color);
					color: white;
					border: none;
					border-radius: 4px;
					cursor: pointer;
					font-size: 16px;
					transition: background-color 0.3s ease;
				}

				button:hover {
					background: var(--bg-hover-color);
				}

				button:disabled {
					opacity: 0.7;
					cursor: not-allowed;
				}

				.profile {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 12px;
					background: var(--bg-color);
					border-radius: 8px;
					color: white;
					min-width: 220px;
					transition: background-color 0.3s ease;
				}

				.profile:hover {
					background: var(--bg-hover-color);
				}

				.avatar {
					width: 40px;
					height: 40px;
					border-radius: 50%;
					object-fit: cover;
					border: 2px solid rgba(255, 255, 255, 0.2);
				}

				.avatar-placeholder {
					width: 40px;
					height: 40px;
					border-radius: 50%;
					background: linear-gradient(45deg, #667eea, #764ba2);
					display: flex;
					align-items: center;
					justify-content: center;
					color: white;
					font-weight: bold;
					font-size: 16px;
				}

				.profile-info {
					flex: 1;
					min-width: 0;
				}

				.profile-info h3 {
					margin: 0 0 4px 0;
					font-size: 14px;
					font-weight: 600;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}

				.profile-info p {
					margin: 0;
					font-size: 12px;
					opacity: 0.8;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
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
					border-top: 2px solid white;
					border-radius: 50%;
					animation: spin 1s linear infinite;
				}

				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
			</style>
		`;

		if (this.loading) {
			this.renderLoading();
		} else if (this.connected) {
			this.renderProfile();
		} else {
			this.renderConnectButton();
		}
	}

	getDisplayName() {
		if (this.ensData?.ens_primary) {
			return this.ensData.ens_primary;
		}
		return this.truncateAddress(this.address);
	}

	truncateAddress(addr) {
		if (!addr) return "";
		return addr.slice(0, 6) + "..." + addr.slice(-4);
	}

	renderLoading() {
		const loadingDiv = document.createElement("div");
		loadingDiv.className = "profile loading";
		loadingDiv.innerHTML = `
			<div class="spinner"></div>
			<span>Connecting...</span>
		`;
		this.shadowRoot.appendChild(loadingDiv);
	}

	renderConnectButton() {
		const button = document.createElement("button");
		button.textContent = "Connect Wallet";
		button.addEventListener("click", () => this.connect());
		this.shadowRoot.appendChild(button);
	}
}

customElements.define("connect-wallet", ConnectWallet);
