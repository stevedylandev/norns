import { useEffect, useRef } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import "./components/connect-wallet";

function App() {
	const walletRef = useRef<any>(null);

	// Example of using callbacks
	useEffect(() => {
		const walletElement = walletRef.current;
		if (!walletElement) return;

		walletElement.onWalletConnected = (detail: any) => {
			console.log("connected via callback: ", detail);
		};

		walletElement.onWalletDisconnected = () => {
			console.log("disconnected via callback");
		};

		walletElement.onWalletError = (detail: any) => {
			console.log("error via callback: ", detail);
		};
	}, []);

	return (
		<>
			<div>
				<a href="https://vite.dev" target="_blank">
					<img src={viteLogo} className="logo" alt="Vite logo" />
				</a>
				<a href="https://react.dev" target="_blank">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
			</div>
			<h1>Vite + React</h1>
			<div className="card">
				<connect-wallet chain-id="1" ref={walletRef}></connect-wallet>
			</div>
			<p className="read-the-docs">
				Click on the Vite and React logos to learn more
			</p>
		</>
	);
}

export default App;
