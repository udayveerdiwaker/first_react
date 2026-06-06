import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * ESLint Configuration
 * 
 * ESLint is a tool that analyzes code to find problems and enforce coding style.
 * It catches potential bugs, unused variables, incorrect patterns, etc.
 * 
 * Plugins enabled:
 * 1. TypeScript: Type-aware linting for .ts and .tsx files
 * 2. React Hooks: Ensures hooks are used correctly
 * 3. React Refresh: Supports Vite's Fast Refresh feature
 * 
 * This configuration targets ES2020+ and browser globals (window, document, etc.)
 */
export default defineConfig([
  // Ignore the dist folder (built output)
  globalIgnores(['dist']),
  
  {
    // Apply linting rules to all TypeScript and TSX files
    files: ['**/*.{ts,tsx}'],
    
    // Use recommended configurations from various plugins
    extends: [
      js.configs.recommended,              // JavaScript best practices
      tseslint.configs.recommended,        // TypeScript-specific rules
      reactHooks.configs.flat.recommended, // React Hooks patterns
      reactRefresh.configs.vite,           // Vite Fast Refresh patterns
    ],
    
    languageOptions: {
      ecmaVersion: 2020,  // Support modern JavaScript (2020 features)
      globals: globals.browser, // Recognize browser globals like window, document
    },
  },
]);
