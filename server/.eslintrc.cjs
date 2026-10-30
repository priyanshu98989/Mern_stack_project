module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'script' },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules/', 'uploads/', '.keys/'],
  rules: {
    'no-console': 'off',
    'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
  },
};
