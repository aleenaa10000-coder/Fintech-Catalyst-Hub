module.exports = {
  ci: {
    collect: {
      // Pages to audit. Covers the main public-facing routes.
      url: [
        "http://localhost:4173/",
        "http://localhost:4173/blog",
        "http://localhost:4173/services",
        "http://localhost:4173/pricing",
      ],
      // Vite preview serves the production build on port 4173.
      startServerCommand:
        "pnpm --filter @workspace/fintechpresshub run serve",
      startServerReadyPattern: "Local",
      startServerReadyTimeout: 15000,
      // One run per page keeps CI fast. Increase to 3 for more stable averages.
      numberOfRuns: 1,
      settings: {
        // Required for headless Chrome in CI and Replit environments.
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
        // Audit as desktop — match your primary audience.
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttlingMethod: "simulate",
      },
    },

    assert: {
      // Skip PWA category — this is not a PWA.
      preset: "lighthouse:no-pwa",
      assertions: {
        // Performance: warn below 0.8 — noisy in CI due to CPU variance.
        "categories:performance": ["warn", { minScore: 0.8 }],
        // Accessibility & SEO are hard requirements — fail the build below these.
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        // Best practices: warn only — some violations are environment-specific.
        "categories:best-practices": ["warn", { minScore: 0.85 }],
      },
    },

    upload: {
      // Publishes a temporary shareable report URL visible in CI logs.
      // No account required. Links expire after 7 days.
      target: "temporary-public-storage",
    },
  },
};
