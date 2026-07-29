import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Family-standard flat config (adapted from sperky-ai). The React Compiler rules
// shipped by eslint-plugin-react-hooks v6 flag several intentional, working
// patterns (seed-into-state during gradual RSC adoption, the latest-ref idiom,
// small inline helper components). They stay as WARN so they remain visible for
// cleanup without failing the lint gate; genuinely actionable rules keep their
// default ERROR severity.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
