class ConnectWallet extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.connected = false;
		this.address = "";
		this.ensData = null;
		this.loading = false;
	}

	connectedCallback() {
		this.render();
	}

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

	async connect() {
		if (window.ethereum) {
			try {
				this.loading = true;
				this.render();

				const accounts = await window.ethereum.request({
					method: "eth_requestAccounts",
				});

				this.address = accounts[0];
				this.connected = true;

				// Fetch ENS data
				await this.fetchEnsData();

				this.loading = false;
				this.render();

				// Dispatch custom event
				this.dispatchEvent(
					new CustomEvent("wallet-connected", {
						detail: {
							address: this.address,
							ensData: this.ensData,
						},
					}),
				);
			} catch (error) {
				console.error("Connection failed", error);
				this.loading = false;
				this.render();
			}
		} else {
			alert("Please install a wallet extension like MetaMask");
		}
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
		this.render();

		// Dispatch custom event
		this.dispatchEvent(new CustomEvent("wallet-disconnected"));
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
}

customElements.define("connect-wallet", ConnectWallet);
