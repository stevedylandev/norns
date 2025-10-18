interface ContractCallElement extends HTMLElement {
  setAttribute('contract-address', value: string): void;
  setAttribute('chain-id', value: string): void;
  setAttribute('method-name', value: string): void;
  setAttribute('method-args', value: string): void;
  setAttribute('abi-url', value: string): void;
  setAttribute('abi', value: string): void;
  setAttribute('button-text', value: string): void;
  setAttribute('background', value: string): void;
  setAttribute('foreground', value: string): void;
  setAttribute('primary', value: string): void;
  setAttribute('secondary', value: string): void;
  setAttribute('border-radius', value: string): void;
  setAttribute('error-color', value: string): void;
  setAttribute('success-color', value: string): void;
  addEventListener(type: 'abi-loaded', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'abi-error', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'contract-call-success', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'contract-call-error', listener: (event: CustomEvent) => void): void;
}

interface ConnectWalletElement extends HTMLElement {
  setAttribute('chain-id', value: string): void;
  setAttribute('background', value: string): void;
  setAttribute('foreground', value: string): void;
  setAttribute('primary', value: string): void;
  setAttribute('secondary', value: string): void;
  setAttribute('border-radius', value: string): void;
  addEventListener(type: 'wallet-connected', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'wallet-error', listener: (event: CustomEvent) => void): void;
  addEventListener(type: 'wallet-disconnected', listener: (event: CustomEvent) => void): void;
}

declare global {
  interface HTMLElementTagNameMap {
  'contract-call': ContractCallElement;
  'connect-wallet': ConnectWalletElement;
  }
}

export {};
