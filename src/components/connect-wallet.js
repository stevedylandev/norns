class ConnectWallet extends HTMLElement {
	// Constructor and lifecycle methods
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.connected = false;
		this.address = "";
		this.ensData = null;
		this.loading = false;
		this.chainId = "0x1";
		this.currentChainId = null;
		this.showPopover = false;
		this.balance = "0";
		this.copySuccess = false;
	}

	static get observedAttributes() {
		return ["chain-id"];
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === "chain-id" && oldValue !== newValue) {
			this.chainId = newValue;
			if (this.connected) {
				this.checkAndSwitchChain();
			}
		}
	}

	connectedCallback() {
		this.chainId = this.getAttribute("chain-id") || "0x1";
		this.render();
	}

	// Wallet connection methods
	async connect() {
		if (window.ethereum) {
			try {
				this.loading = true;
				this.render();

				const accounts = await window.ethereum.request({
					method: "eth_requestAccounts",
				});

				this.address = accounts[0];

				this.currentChainId = await window.ethereum.request({
					method: "eth_chainId",
				});

				if (this.chainId && this.chainId !== this.currentChainId) {
					await this.switchChain(this.chainId);
				}

				this.connected = true;

				await Promise.all([this.fetchEnsData(), this.fetchBalance()]);

				this.loading = false;
				this.render();

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

	disconnect() {
		this.connected = false;
		this.address = "";
		this.ensData = null;
		this.currentChainId = null;
		this.balance = "0";
		this.showPopover = false;
		this.copySuccess = false;
		this.render();

		this.dispatchEvent(new CustomEvent("wallet-disconnected"));
	}

	// Chain management methods
	async switchChain(chainId) {
		try {
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{ chainId }],
			});
			this.currentChainId = chainId;
		} catch (switchError) {
			throw new Error(`Failed to switch chain: ${switchError.message}`);
		}
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

	getChainName(chainId) {
		const chainNames = {
			"0x1": "Ethereum",
			"0x89": "Polygon",
			"0xa": "Optimism",
			"0xa4b1": "Arbitrum",
			"0x2105": "Base",
		};
		return chainNames[chainId] || `Chain ${chainId}`;
	}

	// Data fetching methods
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

	async fetchBalance() {
		try {
			const balanceWei = await window.ethereum.request({
				method: "eth_getBalance",
				params: [this.address, "latest"],
			});

			const balanceEth = parseInt(balanceWei, 16) / Math.pow(10, 18);
			this.balance = balanceEth.toFixed(4);
		} catch (error) {
			console.error("Failed to fetch balance", error);
			this.balance = "0";
		}
	}

	// UI helper methods
	getDisplayName() {
		if (this.ensData?.ens_primary) {
			return this.ensData.ens_primary;
		}
		return this.truncateAddress(this.address);
	}

	truncateAddress(addr) {
		if (!addr) return "";
		return addr.slice(0, 5) + "..." + addr.slice(-5);
	}

	async copyAddress() {
		try {
			await navigator.clipboard.writeText(this.address);
			this.copySuccess = true;
			this.showPopoverElement();

			setTimeout(() => {
				this.copySuccess = false;
				this.showPopoverElement();
			}, 1000);
		} catch (error) {
			console.error("Failed to copy address", error);
		}
	}

	// Popover management methods
	togglePopover() {
		this.showPopover = !this.showPopover;
		if (this.showPopover) {
			this.showPopoverElement();
		} else {
			this.hidePopoverElement();
		}
	}

	hidePopover() {
		if (this.showPopover) {
			this.showPopover = false;
			this.hidePopoverElement();
		}
	}

	showPopoverElement() {
		const profileContainer =
			this.shadowRoot.querySelector(".profile-container");
		if (!profileContainer) return;

		const existingPopover = profileContainer.querySelector(".popover");
		if (existingPopover) {
			existingPopover.remove();
		}

		const popover = document.createElement("div");
		popover.className = "popover";

		const copyIcon = this.copySuccess
			? `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`
			: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2V1H10V2H5ZM4.75 0C4.33579 0 4 0.335786 4 0.75V1H3.5C2.67157 1 2 1.67157 2 2.5V12.5C2 13.3284 2.67157 14 3.5 14H7V13H3.5C3.22386 13 3 12.7761 3 12.5V2.5C3 2.22386 3.22386 2 3.5 2H4V2.25C4 2.66421 4.33579 3 4.75 3H10.25C10.6642 3 11 2.66421 11 2.25V2H11.5C11.7761 2 12 2.22386 12 2.5V7H13V2.5C13 1.67157 12.3284 1 11.5 1H11V0.75C11 0.335786 10.6642 0 10.25 0H4.75ZM9 8.5C9 8.77614 8.77614 9 8.5 9C8.22386 9 8 8.77614 8 8.5C8 8.22386 8.22386 8 8.5 8C8.77614 8 9 8.22386 9 8.5ZM10.5 9C10.7761 9 11 8.77614 11 8.5C11 8.22386 10.7761 8 10.5 8C10.2239 8 10 8.22386 10 8.5C10 8.77614 10.2239 9 10.5 9ZM13 8.5C13 8.77614 12.7761 9 12.5 9C12.2239 9 12 8.77614 12 8.5C12 8.22386 12.2239 8 12.5 8C12.7761 8 13 8.22386 13 8.5ZM14.5 9C14.7761 9 15 8.77614 15 8.5C15 8.22386 14.7761 8 14.5 8C14.2239 8 14 8.22386 14 8.5C14 8.77614 14.2239 9 14.5 9ZM15 10.5C15 10.7761 14.7761 11 14.5 11C14.2239 11 14 10.7761 14 10.5C14 10.2239 14.2239 10 14.5 10C14.7761 10 15 10.2239 15 10.5ZM14.5 13C14.7761 13 15 12.7761 15 12.5C15 12.2239 14.7761 12 14.5 12C14.2239 12 14 12.2239 14 12.5C14 12.7761 14.2239 13 14.5 13ZM14.5 15C14.7761 15 15 14.7761 15 14.5C15 14.2239 14.7761 14 14.5 14C14.2239 14 14 14.2239 14 14.5C14 14.7761 14.2239 15 14.5 15ZM8.5 11C8.77614 11 9 10.7761 9 10.5C9 10.2239 8.77614 10 8.5 10C8.22386 10 8 10.2239 8 10.5C8 10.7761 8.22386 11 8.5 11ZM9 12.5C9 12.7761 8.77614 13 8.5 13C8.22386 13 8 12.7761 8 12.5C8 12.2239 8.22386 12 8.5 12C8.77614 12 9 12.2239 9 12.5ZM8.5 15C8.77614 15 9 14.7761 9 14.5C9 14.2239 8.77614 14 8.5 14C8.22386 14 8 14.2239 8 14.5C8 14.7761 8.22386 15 8.5 15ZM11 14.5C11 14.7761 10.7761 15 10.5 15C10.2239 15 10 14.7761 10 14.5C10 14.2239 10.2239 14 10.5 14C10.7761 14 11 14.2239 11 14.5ZM12.5 15C12.7761 15 13 14.7761 13 14.5C13 14.2239 12.7761 14 12.5 14C12.2239 14 12 14.2239 12 14.5C12 12.7761 12.2239 15 12.5 15Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;

		const copyText = this.copySuccess ? "Copied!" : "Copy Address";
		popover.innerHTML = `
			<button class="popover-button copy-button">
				<span>${copyIcon}</span>
				${copyText}
			</button>
			<button class="popover-button disconnect-button">
				<span><svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1C2.44771 1 2 1.44772 2 2V13C2 13.5523 2.44772 14 3 14H10.5C10.7761 14 11 13.7761 11 13.5C11 13.2239 10.7761 13 10.5 13H3V2L10.5 2C10.7761 2 11 1.77614 11 1.5C11 1.22386 10.7761 1 10.5 1H3ZM12.6036 4.89645C12.4083 4.70118 12.0917 4.70118 11.8964 4.89645C11.7012 5.09171 11.7012 5.40829 11.8964 5.60355L13.2929 7H6.5C6.22386 7 6 7.22386 6 7.5C6 7.77614 6.22386 8 6.5 8H13.2929L11.8964 9.39645C11.7012 9.59171 11.7012 9.90829 11.8964 10.1036C12.0917 10.2988 12.4083 10.2988 12.6036 10.1036L14.8536 7.85355C15.0488 7.65829 15.0488 7.34171 14.8536 7.14645L12.6036 4.89645Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg></span>
				Disconnect
			</button>
		`;

		popover.querySelector(".copy-button").addEventListener("click", (e) => {
			e.stopPropagation();
			this.copyAddress();
		});

		popover
			.querySelector(".disconnect-button")
			.addEventListener("click", (e) => {
				e.stopPropagation();
				this.disconnect();
			});

		profileContainer.appendChild(popover);

		setTimeout(() => {
			document.addEventListener("click", this.hidePopover.bind(this), {
				once: true,
			});
		}, 0);
	}

	hidePopoverElement() {
		const profileContainer =
			this.shadowRoot.querySelector(".profile-container");
		if (!profileContainer) return;

		const popover = profileContainer.querySelector(".popover");
		if (popover) {
			popover.remove();
		}
	}

	// Render methods and styling
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

				.profile-container {
					position: relative;
					display: inline-block;
				}

				.profile {
					display: flex;
					align-items: center;
					gap: 8px;
					padding: 10px 20px;
					background: var(--bg-color);
					border-radius: 4px;
					border: 1px solid rgba(255, 255, 255, 0.1);
					color: white;
					min-width: auto;
					transition: background-color 0.3s ease;
					cursor: pointer;
				}

				.profile:hover {
					background: var(--bg-hover-color);
				}

				.popover {
					position: absolute;
					top: 100%;
					left: 0;
					right: 0;
					background: var(--bg-color);
					border: 1px solid rgba(255, 255, 255, 0.1);
					border-radius: 4px;
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
					z-index: 1000;
					margin-top: 4px;
					overflow: hidden;
				}

				.popover-button {
					display: flex;
					align-items: center;
					gap: 8px;
					width: 100%;
					padding: 10px 16px;
					background: var(--bg-color);
					border: none;
					color: white;
					font-size: 14px;
					cursor: pointer;
					transition: background-color 0.2s ease;
				}

				.popover-button:hover {
					background: var(--bg-hover-color);
				}

				.popover-button:not(:last-child) {
					border-bottom: 1px solid rgba(255, 255, 255, 0.1);
				}

				.popover-button span {
					font-size: 16px;
				}

				.avatar {
					width: 24px;
					height: 24px;
					border-radius: 50%;
					object-fit: cover;
					border: 1px solid rgba(255, 255, 255, 0.2);
				}

				.avatar-placeholder {
					width: 24px;
					height: 24px;
					border-radius: 50%;
					background: linear-gradient(45deg, #667eea, #764ba2);
					display: flex;
					align-items: center;
					justify-content: center;
					color: white;
					font-weight: bold;
					font-size: 12px;
				}

				.profile-info {
					flex: 1;
					min-width: 0;
				}

				.profile-info h3 {
					margin: 0 0 2px 0;
					font-size: 16px;
					font-weight: 600;
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
				}

				.profile-info p {
					margin: 0;
					font-size: 14px;
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

	renderProfile() {
		const profileContainer = document.createElement("div");
		profileContainer.className = "profile-container";

		const profileDiv = document.createElement("div");
		profileDiv.className = "profile";

		const avatar = this.ensData?.avatar_small;
		const displayName = this.getDisplayName();

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
				<p>${this.balance} ETH</p>
			</div>
		`;

		profileDiv.addEventListener("click", (e) => {
			e.stopPropagation();
			this.togglePopover();
		});

		profileContainer.appendChild(profileDiv);
		this.shadowRoot.appendChild(profileContainer);

		if (this.showPopover) {
			this.showPopoverElement();
		}
	}

	renderLoading() {
		const button = document.createElement("button");
		button.disabled = true;
		button.innerHTML = `
			<div class="loading">
				<div class="spinner"></div>
				<span>Connecting...</span>
			</div>
		`;
		this.shadowRoot.appendChild(button);
	}

	renderConnectButton() {
		const button = document.createElement("button");
		button.textContent = "Connect Wallet";
		button.addEventListener("click", () => this.connect());
		this.shadowRoot.appendChild(button);
	}
}

customElements.define("connect-wallet", ConnectWallet);
