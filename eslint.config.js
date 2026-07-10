import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "apps/*/dist/**",
      "apps/web/build/**",
      "packages/*/dist/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "src/**",
      "scripts/**",
      "public/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          "prefer": "type-imports"
        }
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": [
        "error",
        {
          "allow": ["warn", "error"]
        }
      ]
    }
  }
);
