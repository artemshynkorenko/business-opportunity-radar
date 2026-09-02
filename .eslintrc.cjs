/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Allow explicit `any` only where truly needed; warn rather than error
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allow unused vars prefixed with _ (common for intentional ignores)
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Keep no-console off — this is a server-side tool
    'no-console': 'off',
  },
};
