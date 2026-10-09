import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".tools/**",
    ".npm-cache/**",
    ".firebase/**",
  ]),
  {
    // Node test suites and maintenance scripts run outside the bundler, so the
    // rules written for application code (no `require`, no `module` shadowing)
    // do not apply to them.
    files: ["tests/**/*.{js,cjs,mjs,ts}", "scripts/**/*.{js,cjs,mjs,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@next/next/no-assign-module-variable": "off",
    },
  },
]);

export default eslintConfig;
