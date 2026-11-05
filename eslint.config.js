import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const commonRules = {
  ...js.configs.recommended.rules,
  "no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z_]" },
  ],
};

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "client/public/**",
      "coverage/**",
      "playwright-report/**",
    ],
  },
  {
    files: ["client/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...commonRules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["client/src/components/3d/WatchCanvas.jsx"],
    rules: { "react/no-unknown-property": "off" },
  },
  {
    files: [
      "server/**/*.js",
      "tests/**/*.js",
      "e2e/**/*.js",
      "playwright.config.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: commonRules,
  },
  {
    files: ["client/src/**/*.test.{js,jsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];
