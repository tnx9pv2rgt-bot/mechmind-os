import nextConfig from 'eslint-config-next/core-web-vitals';

export default [
  ...nextConfig,
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', '*.config.js', '*.config.mjs'],
  },
];
