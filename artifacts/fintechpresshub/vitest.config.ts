import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "../../attached_assets"),
      "@workspace/api-client-react": path.resolve(
        __dirname,
        "src/test/mocks/workspace-api-client.ts",
      ),
      "@workspace/replit-auth-web": path.resolve(
        __dirname,
        "src/test/mocks/workspace-replit-auth.ts",
      ),
    },
  },
});
