import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["./test/unit/*.spec.ts"],
    //exclude: ["./**/*.integration.spec.ts"],
    testTimeout: 20000,
  },
});