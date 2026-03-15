// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetcher = <T = any>(url: string): Promise<T> =>
  fetch(url, { credentials: 'include' }).then(r => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json() as Promise<T>;
  });
