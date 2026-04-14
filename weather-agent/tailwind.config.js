/**
 * Tailwind CSS Configuration
 * 
 * Tailwind is a utility-first CSS framework for rapid UI development.
 * Instead of writing custom CSS, you compose designs using utility classes
 * like bg-blue-500, text-lg, p-4, etc.
 * 
 * Configuration:
 * - content: Tells Tailwind which files to scan for utility classes
 * - theme: Customizes colors, spacing, fonts, etc. (empty extend = use defaults)
 * - plugins: Third-party Tailwind extensions (none currently used)
 */
export default {
  // Tell Tailwind where to look for CSS classes in the app
  content: [
    "./index.html",               // Main HTML file
    "./src/**/*.{js,ts,jsx,tsx}", // All React component files
  ],
  
  // Customizes Tailwind's default theme
  theme: {
    extend: {
      // All extensions would go here (colors, fonts, sizing, etc.)
      // Currently empty = using Tailwind's default theme
    },
  },
  
  // Official and community plugins
  plugins: [
    // No plugins currently enabled
  ],
};