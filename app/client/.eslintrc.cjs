module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
  },
  extends: ['plugin:vue/vue3-essential', 'eslint:recommended'],

  plugins: [
    '@typescript-eslint',
  ],
  
  parser: 'vue-eslint-parser',

  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
  },

  rules: {
    'vue/no-unused-vars': 'error',
    'no-unused-vars': 'warn',
    'no-undef': 'off', 
  },
};
