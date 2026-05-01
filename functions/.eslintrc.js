module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    "max-len": "off",
    "quotes": "off",
    "prefer-arrow-callback": "off",
    "no-restricted-globals": "off",
  },
};
