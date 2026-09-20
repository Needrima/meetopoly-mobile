import { apiFetch } from './client';

export type HealthResponse = {
  status: 'ok' | 'degraded';
  mongo: 'ok' | 'error';
  redis: 'ok' | 'error';
  version?: string;
};

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health');
}
