import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';

export const dynamic = 'force-dynamic';

/** GET /api/customers/search → GET /v1/customers/search
 *  Backend CustomerSearchDto accepts: name, email, phone, limit, offset.
 *  Map legacy `query` param → `name` so callers using ?query= still work.
 */
export async function GET(request: NextRequest) {
  const params = getQueryParams(request);

  // Translate `query` or `q` → `name` (backend does not accept `query`/`q`)
  if (params.q && !params.name) {
    params.name = params.q;
  }
  delete params.q;

  if (params.query && !params.name) {
    params.name = params.query;
  }
  delete params.query;

  return proxyToNestJS({
    backendPath: 'v1/customers/search',
    params,
  });
}
