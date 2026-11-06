import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  // Cada página corre un blob 3D por software en headless: muchos navegadores a la vez se asfixian.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // Safari real (motor WebKit) en iPhone: la introducción, sus botones y el inicio de la página
    // deben funcionar también ahí. WebKit sin interfaz es lento, así que se corre lo esencial.
    {
      name: "iphone-safari",
      use: { ...devices["iPhone 15"] },
      testMatch: /(gate|journey)\.spec\.ts/,
      grep: /(indicador de carga|Soy reclutador|REGRESIÓN|siempre desde el inicio|recorrido completo)/,
    },
  ],
});
