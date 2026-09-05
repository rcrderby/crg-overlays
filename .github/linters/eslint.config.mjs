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

        // Supplied by CRG and jQuery at runtime, not by this repository
        WS: "readonly",
        $: "readonly",
        jQuery: "readonly",
      },
    },

    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // The tests run under Deno, as modules
    files: ["tests/**/*.js"],

    plugins: {
      js,
    },

    extends: ["js/recommended"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: {
        Deno: "readonly",
      },
    },

    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
]);
