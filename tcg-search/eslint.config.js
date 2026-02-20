import js from '@eslint/js'
import globals from 'globals'
import reactPlugin from 'eslint-plugin-react'

export default [
  js.configs.recommended,
  {
    plugins: { react: reactPlugin },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'react/prop-types': 'warn',
      'react/react-in-jsx-scope': 'off',
    },
  },
]
