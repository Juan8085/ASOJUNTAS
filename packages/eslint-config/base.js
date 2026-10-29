/** @type {import("eslint").Linter.Config} */
module.exports = {
  env: {
    node: true,
    es2022: true
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  },
  ignorePatterns: ["node_modules/", "dist/", ".turbo/", ".next/"]
};
