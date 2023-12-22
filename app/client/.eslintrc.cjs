module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
  },
  extends: [
    'plugin:vue/vue3-essential', // or 'plugin:vue/vue3-strongly-recommended' or 'plugin:vue/vue3-recommended'
    'eslint:recommended',
  ],
  parserOptions: {
    parser: '@typescript-eslint/parser', // or '@babel/eslint-parser' or '@typescript-eslint/parser' if using TypeScript
  },
  rules: {
    // Override/add rules settings here, such as:
    'vue/no-unused-vars': 'error',
    // 'no-unused-vars': 'warn',
  },
};
