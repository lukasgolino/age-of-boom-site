// @ts-check
import { defineConfig } from "astro/config";

// Hosted on GitHub Pages at ageofboom.online; the deploy workflow passes SITE_URL / SITE_BASE from configure-pages.
export default defineConfig({
  site: process.env.SITE_URL || "https://ageofboom.online",
  base: process.env.SITE_BASE || "/",
  trailingSlash: "always",
  build: { format: "directory" },
  devToolbar: { enabled: false },
});
