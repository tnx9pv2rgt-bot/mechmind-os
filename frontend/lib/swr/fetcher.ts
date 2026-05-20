export interface FetchError extends Error {
  status: number;
  info: unknown;
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });

  if (!res.ok) {
    const error = new Error('Errore nel caricamento dei dati') as FetchError;
    error.status = res.status;
    error.info = await res.json().catch(() => null);
    throw error;
  }

  return res.json() as Promise<T>;
}
