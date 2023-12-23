module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
  },
  extends: ['plugin:vue/vue3-essential', 'eslint:recommended'],

  plugins: ['@typescript-eslint'],

  parser: 'vue-eslint-parser',

  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    extraFileExtensions: ['.vue'],
  },

  rules: {
    'vue/no-unused-vars': 'error',
    'no-unused-vars': 'warn',
    'no-undef': 'off',
  },
};
