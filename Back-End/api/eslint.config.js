import js from '@eslint/js'
import globals from 'globals'
export default [{ ignores: ['node_modules/**'] }, { files: ['**/*.js','**/*.mjs'], ...js.configs.recommended, languageOptions: { globals: { ...globals.browser, ...globals.node } } }]
