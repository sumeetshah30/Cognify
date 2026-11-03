import { marked } from 'marked';

/** Markdown to HTML. With cite=true, [n] markers become clickable superscripts. Angular sanitizes the result. */
export function renderMd(src: string, cite = false): string {
  const html = marked.parse(src, { async: false }) as string;
  return cite ? html.replace(/\[(\d+)\]/g, '<sup class="cite">$1</sup>') : html;
}
