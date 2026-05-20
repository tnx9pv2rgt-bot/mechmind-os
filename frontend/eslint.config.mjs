import nextConfig from 'eslint-config-next/core-web-vitals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...nextConfig,
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', '.vercel/**', '*.config.js', '*.config.mjs'],
  },
  {
    // React Compiler non abilitato (next.config.js manca experimental.reactCompiler).
    // Queste regole di eslint-plugin-react-hooks@beta sono rilevanti solo con il compilatore.
    // Degradate a warn. Da riportare a error quando si abilita il compilatore.
    // ref: https://react.dev/learn/react-compiler#usage-with-eslint
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react/display-name': 'off',
    },
  },
  {
    // E2E fixtures sono Playwright page objects, non React components
    files: ['e2e/**'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
];
