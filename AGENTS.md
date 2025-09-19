# Project Goal

The goal of this project is to develop a comprehensive web component library for EVM blockchain applications. This library will provide reusable, vanilla JavaScript web components that enable developers to integrate blockchain functionality (such as wallet connections, transaction handling, contract interactions, and network management) into their web applications without dependencies on React or other frameworks. It aims to be a framework-agnostic alternative to libraries like wagmi, focusing on simplicity, performance, and broad compatibility.

Key objectives:
- Provide a set of standardized web components for common EVM operations
- Ensure full TypeScript support for type safety
- Maintain browser compatibility across modern browsers
- Follow web component best practices and standards
- Include comprehensive documentation and examples
- Support both ESM and UMD module formats

# Rules

## Development Rules
- Use vanilla JavaScript/TypeScript only; no React, Vue, or other framework dependencies
- All components must extend HTMLElement and follow the Custom Elements API
- Implement Shadow DOM for encapsulation where appropriate
- Use TypeScript for all source code to ensure type safety
- Follow semantic versioning (SemVer) for releases
- Write unit tests for all components using Bun's test runner
- Ensure all code passes linting with ESLint and type checking with TypeScript

## Code Quality Rules
- Follow the project's coding style (consistent indentation, naming conventions)
- Use meaningful variable and function names
- Add JSDoc comments for all public APIs
- Avoid global state; encapsulate state within components
- Handle errors gracefully and provide meaningful error messages
- Optimize for performance; minimize bundle size and runtime overhead

## Testing Rules
- Maintain test coverage above 80% for all components
- Write both unit tests and integration tests
- Test components in multiple browsers (Chrome, Firefox, Safari, Edge)
- Include tests for error scenarios and edge cases
- Run tests on every commit via CI/CD

## Contribution Rules
- All changes must be submitted via pull requests
- Include tests and documentation updates with new features
- Follow conventional commit messages
- Ensure backward compatibility unless breaking changes are explicitly planned
- Review and approve pull requests from at least one maintainer

## Security Rules
- Never expose private keys or sensitive data in code
- Validate all user inputs to prevent injection attacks
- Use secure random generation for any cryptographic operations
- Regularly audit dependencies for vulnerabilities
- Implement proper error handling to avoid information leakage

## Build and Deployment Rules
- Use Bun for building, testing, and running the project
- Generate both ESM and UMD bundles for distribution
- Minify production builds to reduce bundle size
- Publish to npm with proper package.json configuration
- Maintain a changelog for all releases

## Commands
- `bun run build`: Build the library for production
- `bun run dev`: Start development server with hot reload
- `bun test`: Run all tests
- `bun run lint`: Run ESLint for code quality checks
- `bun run typecheck`: Run TypeScript type checking