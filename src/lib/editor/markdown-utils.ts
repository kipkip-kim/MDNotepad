export function detectLineEnding(content: string): 'CRLF' | 'LF' {
  return content.includes('\r\n') ? 'CRLF' : 'LF'
}

export function convertLineEnding(content: string, target: 'CRLF' | 'LF'): string {
  const normalized = content.replace(/\r\n/g, '\n')
  return target === 'CRLF' ? normalized.replace(/\n/g, '\r\n') : normalized
}
