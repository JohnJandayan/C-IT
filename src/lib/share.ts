// Share links: the program is deflate-compressed and base64url-encoded into the
// URL fragment, which browsers never send to servers.

export const MAX_SHARE_CODE_BYTES = 64 * 1024;
const MAX_FRAGMENT_CHARS = 120_000;
const PREFIX = 'code=';

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('invalid characters in share link');
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream, limit: number): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  const reader = source.pipeThrough(stream as unknown as TransformStream<Uint8Array, Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new Error('shared program is too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export async function encodeShare(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(code);
  if (bytes.length > MAX_SHARE_CODE_BYTES) throw new Error('program is too large to share');
  const packed = await pipe(bytes, new CompressionStream('deflate-raw'), MAX_FRAGMENT_CHARS);
  return PREFIX + toBase64Url(packed);
}

export async function decodeShare(fragment: string): Promise<string | null> {
  const f = fragment.replace(/^#/, '');
  if (!f.startsWith(PREFIX)) return null;
  const payload = f.slice(PREFIX.length);
  if (payload.length > MAX_FRAGMENT_CHARS) throw new Error('share link is too long');
  const packed = fromBase64Url(payload);
  const bytes = await pipe(packed, new DecompressionStream('deflate-raw'), MAX_SHARE_CODE_BYTES);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export async function shareUrl(code: string): Promise<string> {
  const frag = await encodeShare(code);
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${frag}`;
}
