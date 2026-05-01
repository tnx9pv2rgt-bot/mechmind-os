// @ts-nocheck
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'sonarjs', 'security'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    // SonarJS — cognitive quality (warn: fix progressivamente)
    'sonarjs/cognitive-complexity': ['warn', 15],
    'sonarjs/no-identical-functions': 'warn',
    'sonarjs/no-duplicate-string': 'warn',
    'sonarjs/no-nested-template-literals': 'warn',
    'sonarjs/prefer-regexp-exec': 'warn',
    'sonarjs/no-undefined-argument': 'warn',
    'sonarjs/no-misleading-array-reverse': 'warn',
    'sonarjs/different-types-comparison': 'warn',
    'sonarjs/function-return-type': 'warn',
    // Security — potential vulnerabilities (warn: revisione manuale richiesta)
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-unsafe-regex': 'warn',
  },
  overrides: [
    {
      files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts', '**/*.e2e-spec.ts'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'sonarjs/no-duplicate-string': 'off',
        'sonarjs/no-undefined-argument': 'off',
        'sonarjs/no-identical-functions': 'off',
        'sonarjs/prefer-regexp-exec': 'off',
        'sonarjs/cognitive-complexity': 'off',
      },
    },
    {
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-empty-object-type': 'off',
      },
    },
  ],
};
