export const API_TOKEN = 'secret_admin_token_123';

export async function fetchApi(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('X-Admin-Token', API_TOKEN);
  if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  return res;
}
