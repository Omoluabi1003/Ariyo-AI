const globals = require("globals");

module.exports = [
  {
    ignores: ["dist/", "node_modules/", "*.config.js"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      prettier: require("eslint-plugin-prettier"),
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
  {
    files: ["**/*.test.js"],
    plugins: {
      jest: require("eslint-plugin-jest"),
    },
    rules: {
      ...require("eslint-plugin-jest").configs.recommended.rules,
    },
  },
];
