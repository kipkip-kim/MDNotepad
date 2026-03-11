import { open, save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'

export async function openFileDialog(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (result === null) return null
  // Tauri 2 dialog: multiple=false returns string | null
  return result as string
}

export async function saveFileDialog(defaultName: string): Promise<string | null> {
  return await save({
    defaultPath: defaultName,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Text', extensions: ['txt'] },
    ],
  })
}

export async function readFile(path: string): Promise<{ content: string; encoding: string }> {
  return await invoke('read_file_with_encoding', { path })
}

export async function writeFile(
  path: string,
  content: string,
  encoding: string,
  lineEnding: string
): Promise<void> {
  await invoke('write_file_with_encoding', { path, content, encoding, lineEnding })
}

export async function atomicRename(from: string, to: string): Promise<void> {
  await invoke('atomic_rename', { from, to })
}
