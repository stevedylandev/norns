class ConnectWallet extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.connected = false;
		this.address = "";
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
      </style>
    `;

		const button = document.createElement("button");
		if (this.connected) {
			button.textContent = this.truncateAddress(this.address);
			button.addEventListener("click", () => this.disconnect());
		} else {
			button.textContent = "Connect Wallet";
			button.addEventListener("click", () => this.connect());
		}

		this.shadowRoot.appendChild(button);
	}

	async connect() {
		if (window.ethereum) {
			try {
				const accounts = await window.ethereum.request({
					method: "eth_requestAccounts",
				});
				this.address = accounts[0];
				this.connected = true;
				this.render();
			} catch (error) {
				console.error("Connection failed", error);
			}
		} else {
			alert("Please install a wallet extension");
		}
	}

	disconnect() {
		this.connected = false;
		this.address = "";
		this.render();
	}

	truncateAddress(addr) {
		if (!addr) return "";
		return addr.slice(0, 6) + "..." + addr.slice(-4);
	}
}

customElements.define("connect-wallet", ConnectWallet);
