declare module 'svelte/elements' {
  export interface SvelteHTMLElements {
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
      'on:abi-loaded'?: (event: CustomEvent) => void;
      'on:abi-error'?: (event: CustomEvent) => void;
      'on:contract-call-success'?: (event: CustomEvent) => void;
      'on:contract-call-error'?: (event: CustomEvent) => void;
    };
    'connect-wallet': {
      'chain-id'?: string;
      'background'?: string;
      'foreground'?: string;
      'primary'?: string;
      'secondary'?: string;
      'border-radius'?: string;
      'on:wallet-connected'?: (event: CustomEvent) => void;
      'on:wallet-error'?: (event: CustomEvent) => void;
      'on:wallet-disconnected'?: (event: CustomEvent) => void;
    };
  }
}

export {};
