import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  { files: ['src/**/*.{js,jsx}'], plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh }, languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', console: 'readonly', FormData: 'readonly' } }, rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], 'react-refresh/only-export-components': 'off' } }
];
