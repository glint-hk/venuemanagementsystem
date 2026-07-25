import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules", "prisma/migrations", "public"] },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
