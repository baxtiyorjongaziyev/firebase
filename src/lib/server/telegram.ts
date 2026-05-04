export function escapeTelegramHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeTelegramMarkdownCode(value: unknown) {
  return String(value ?? '').replace(/```/g, '\\`\\`\\`');
}
