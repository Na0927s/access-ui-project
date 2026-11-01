import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

// Flat config for the frontend (Vite + React 18 + TS 5.5).
// (한국어 요약) 프론트엔드 ESLint 플랫 config — TS·React Hooks 규칙 + Prettier 충돌 OFF.
export default tseslint.config(
  // Ignore build output and deps.
  { ignores: ['dist', 'node_modules'] },

  // Base JS recommended rules.
  js.configs.recommended,

  // TypeScript type-aware rules are heavy; use the non-type-checked preset
  // for speed in a dev workflow. tsc -b still does full type checking at build.
  ...tseslint.configs.recommended,

  // React: hooks rules + react-refresh (HMR fast-refresh) constraints.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Turn OFF all rules that conflict with Prettier formatting.
  prettier,
)
