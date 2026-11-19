import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "app/dashboard/arqueo/page.tsx",
      "app/dashboard/caja/page.tsx",
      "app/dashboard/dashboard-home.tsx",
      "app/dashboard/vencimientos/page.tsx",
      "components/CajaDebitPanel.tsx",
      "components/IdentityAccountPage.tsx",
      "components/MemberPicker.tsx",
      "components/PersonFolderModal.tsx",
      "components/PlanLimitedNotice.tsx",
      "lib/auth/AuthProvider.tsx",
    ],
    // Existing fetch/session effects update React state; keep their behavior unchanged.
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
]);

export default eslintConfig;
