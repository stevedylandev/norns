import type React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
  'contract-call': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
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
    onAbiLoaded?: (event: CustomEvent) => void;
    onAbiError?: (event: CustomEvent) => void;
    onContractCallSuccess?: (event: CustomEvent) => void;
    onContractCallError?: (event: CustomEvent) => void;
  }, HTMLElement>;
  'connect-wallet': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
    'chain-id'?: string;
    'background'?: string;
    'foreground'?: string;
    'primary'?: string;
    'secondary'?: string;
    'border-radius'?: string;
    onWalletConnected?: (event: CustomEvent) => void;
    onWalletError?: (event: CustomEvent) => void;
    onWalletDisconnected?: (event: CustomEvent) => void;
  }, HTMLElement>;
    }
  }

  interface CSSProperties {
    // Norns UI CSS Custom Properties
  '--color-background'?: string;
  '--color-foreground'?: string;
  '--color-primary'?: string;
  '--color-secondary'?: string;
  '--border-radius'?: string;
  }
}

export interface CustomElements {
  'contract-call': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
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
    onAbiLoaded?: (event: CustomEvent) => void;
    onAbiError?: (event: CustomEvent) => void;
    onContractCallSuccess?: (event: CustomEvent) => void;
    onContractCallError?: (event: CustomEvent) => void;
  }, HTMLElement>;
  'connect-wallet': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
    'chain-id'?: string;
    'background'?: string;
    'foreground'?: string;
    'primary'?: string;
    'secondary'?: string;
    'border-radius'?: string;
    onWalletConnected?: (event: CustomEvent) => void;
    onWalletError?: (event: CustomEvent) => void;
    onWalletDisconnected?: (event: CustomEvent) => void;
  }, HTMLElement>;
}

export interface CustomCssProperties {
  '--color-background'?: string;
  '--color-foreground'?: string;
  '--color-primary'?: string;
  '--color-secondary'?: string;
  '--border-radius'?: string;
}
