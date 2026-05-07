import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  ...tseslint.config(
    {
      languageOptions: {
        globals: globals.node,
      },
    },
    ...tseslint.configs.recommended
  ),
];

