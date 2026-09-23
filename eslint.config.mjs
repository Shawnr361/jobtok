// Repository-level ESLint config for the API and shared packages.
// apps/web (eslint-config-next) and apps/mobile (eslint-config-expo) have their own configs.
// Deliberately small: the recommended rule sets only, no type-aware or stylistic rules
// (Prettier owns formatting).
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.turbo/**',
    '**/coverage/**',
    'apps/api/src/generated/**',
    'apps/web/**',
    'apps/mobile/**',
  ]),
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Allow intentionally unused `_`-prefixed args (e.g. Express error handlers).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // Browser/React Native consumers: no Node globals assumed.
    files: ['packages/api-client/**', 'packages/tokens/**', 'packages/types/**'],
    languageOptions: { globals: { ...globals['shared-node-browser'] } },
  },
]);
