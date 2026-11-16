export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  devtools: {
    enabled: true,
  },

  routeRules: {
    "/api/**": {
      proxy: "http://nuxt:3000/api/**",
    },

    "/uploads/**": {
      proxy: "http://nuxt:3000/uploads/**",
    },
  },
});