# Meetopoly HTTP client (OpenAPI → orval)

| File | Role |
|------|------|
| `client.ts` | Hand-written mutator: base URL, `fetch`, errors |
| `services.ts` | Re-exports generated endpoint functions |
| `types.ts` | Re-exports generated DTOs |
| `queryKeys.ts` | Hand-written TanStack Query keys |
| `generated/` | **orval output** — do not edit; safe to clean |

## Regenerate

After changing `meetopoly-be/api/openapi.yaml`:

```bash
cd meetopoly-mobile
npm run api:generate
```

Requires [orval](https://orval.dev/) (devDependency, MIT).

## Usage

```ts
import { getHealth } from '@/api/services';
import type { HealthResponse } from '@/api/types';
import { getApiBaseUrl } from '@/api/client';
```

Hooks (e.g. `hooks/useHealth`) call **services**, not raw `fetch`.
