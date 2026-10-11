import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  {
    files: ['server/**/*.js', 'tests/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/editor/**/*.jsx'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    // JSX tag-уудыг хэрэглэсэн хувьсагч гэж ESLint-ийн үндсэн parser тооцохгүй.
    // Tag-ийн импортын зөв эсэхийг Vite build шалгана.
    rules: { 'no-unused-vars': 'off' },
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
])
