import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Vite Configuration
 *
 * Vite is a modern build tool and development server for React.
 *
 * Plugins used:
 * 1. React: Enables JSX syntax and Fast Refresh (instant updates without full reload)
 * 2. Tailwind CSS: Processes Tailwind utility classes and creates optimized CSS
 *
 * This configuration uses sensible defaults suitable for most React projects.
 */
export default defineConfig({
  // Enable the React and Tailwind CSS plugins
  plugins: [
    react(), // Enables JSX, Fast Refresh for hot module replacement
    tailwindcss(), // Processes Tailwind CSS and optimizes it
  ],
});
