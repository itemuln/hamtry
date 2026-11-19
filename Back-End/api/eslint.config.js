import js from '@eslint/js'
import globals from 'globals'
export default [
  { ignores: ['node_modules/**'] },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...js.configs.recommended,
    rules: { 'max-len': ['error', { code: 120, comments: 120 }] },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['src/**/*.js'],
    ignores: ['src/features/listings/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)listings/(?!index\\.js$)',
              message: 'Import the Listings public interface from features/listings/index.js.',
            },
          ],
        },
      ],
    },
  },
]
