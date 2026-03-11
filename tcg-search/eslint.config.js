import js from '@eslint/js'
import globals from 'globals'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      'react/prop-types': 'warn',
    },
  },
  {
    files: ['src/setupTests.js', 'src/**/*.test.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
]
