declare module 'vue' {
  export interface GlobalComponents {
    'contract-call': {
      'contract-address'?: string;
      'chain-id'?: string;
      'method-name'?: string;
      'method-args'?: string;
      'abi-url'?: string;
      'abi'?: string;
      'button-text'?: string;
      'background'?: string;
      'foreground'?: string;
      'primary'?: string;
      'secondary'?: string;
      'border-radius'?: string;
      'error-color'?: string;
      'success-color'?: string;
      'onAbiLoaded'?: (event: CustomEvent) => void;
      'onAbiError'?: (event: CustomEvent) => void;
      'onContractCallSuccess'?: (event: CustomEvent) => void;
      'onContractCallError'?: (event: CustomEvent) => void;
    };
    'connect-wallet': {
      'chain-id'?: string;
      'background'?: string;
      'foreground'?: string;
      'primary'?: string;
      'secondary'?: string;
      'border-radius'?: string;
      'onWalletConnected'?: (event: CustomEvent) => void;
      'onWalletError'?: (event: CustomEvent) => void;
      'onWalletDisconnected'?: (event: CustomEvent) => void;
    };
  }
}

export {};
