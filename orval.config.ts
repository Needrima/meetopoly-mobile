import { defineConfig } from 'orval';

/**
 * OpenAPI → TypeScript client for meetopoly-mobile.
 * Spec: ../meetopoly-be/api/openapi.yaml
 * Run: npm run api:generate
 *
 * Generated files live under api/generated/ (safe to clean).
 * Hand-written: api/client.ts, api/queryKeys.ts, api/types.ts, api/services.ts (re-exports).
 */
export default defineConfig({
  meetopoly: {
    input: {
      target: '../meetopoly-be/api/openapi.yaml',
    },
    output: {
      mode: 'split',
      target: './api/generated/endpoints.ts',
      schemas: './api/generated/models',
      client: 'fetch',
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: './api/client.ts',
          name: 'apiMutator',
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
