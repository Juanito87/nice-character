export type FetchLike = typeof fetch;

export async function postJson(fetchFn: FetchLike, url: string, apiKey: string, body: unknown): Promise<unknown> {
  const response = await fetchFn(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Provider request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getJson(fetchFn: FetchLike, url: string, apiKey: string): Promise<unknown> {
  const response = await fetchFn(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });
  if (!response.ok) {
    throw new Error(`Provider request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function downloadFile(fetchFn: FetchLike, url: string): Promise<Buffer> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`Provider download failed: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').filter(Boolean).at(-1);
    return name || fallback;
  } catch {
    return fallback;
  }
}
