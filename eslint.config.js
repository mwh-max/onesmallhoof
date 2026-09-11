export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      indent: ['error', 2],
      'no-unused-vars': ['warn'],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',
      'arrow-spacing': ['error', { before: true, after: true }],
      'space-before-blocks': ['error', 'always'],
      'comma-dangle': ['error', 'never']
    }
  },
  {
    // sw.js is registered as a classic worker script (no `{ type: 'module' }`
    // option in navigator.serviceWorker.register), so it can't use import/export.
    files: ['sw.js'],
    languageOptions: {
      sourceType: 'script'
    }
  }
];