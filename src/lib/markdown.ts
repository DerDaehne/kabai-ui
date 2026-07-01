import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { browser } from '$app/environment';

marked.setOptions({ breaks: true, gfm: true });

// dompurify auto-detects `window` at import time. In the browser that gives
// a working instance; under SSR (no window) `.sanitize` is a no-op, so we
// skip it there. Safe because ticket content is only ever fetched
// client-side (onMount) — this code path never runs with real content
// during SSR. (isomorphic-dompurify's jsdom dependency previously broke
// Vite SSR with an ESM/CJS interop crash in a transitive dep.)
export function renderMarkdown(text: string): string {
	const html = marked.parse(text, { async: false }) as string;
	return browser ? DOMPurify.sanitize(html) : html;
}
