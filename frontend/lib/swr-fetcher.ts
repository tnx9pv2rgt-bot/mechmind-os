// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetcher = <T = any>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  return fetch(url, { credentials: 'include', signal: controller.signal })
    .then(r => {
      clearTimeout(timeoutId);
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json() as Promise<T>;
    })
    .catch(err => {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Servizio temporaneamente non disponibile. Riprova tra qualche secondo.');
      }
      throw err;
    });
};
