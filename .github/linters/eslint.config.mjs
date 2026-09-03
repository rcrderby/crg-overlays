import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";

export default defineConfig([
  globalIgnores(["!**/.*", "**/node_modules/.*"]),
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],

    plugins: {
      js,
    },

    extends: ["js/recommended"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",

      globals: {
        ...globals.browser,
      },
    },

    rules: {
      "no-undef": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
]);
