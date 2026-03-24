import { proxyToNestJS } from '@/lib/auth/api-proxy';

export async function DELETE(): Promise<Response> {
  return proxyToNestJS({ backendPath: 'v1/auth/devices/trust-all', method: 'DELETE' });
}
