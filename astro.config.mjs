// @ts-check
import { defineConfig } from "astro/config";

// SITE_URL / SITE_BASE come from the deploy setup (hosting not chosen yet).
export default defineConfig({
  site: process.env.SITE_URL || "https://ageofboom.com",
  base: process.env.SITE_BASE || "/",
  trailingSlash: "always",
  build: { format: "directory" },
  devToolbar: { enabled: false },
});
