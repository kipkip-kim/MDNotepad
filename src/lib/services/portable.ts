import { invoke } from '@tauri-apps/api/core'
import { load } from '@tauri-apps/plugin-store'

let _isPortable: boolean | null = null
let _portableDir: string | null = null

export async function isPortable(): Promise<boolean> {
  if (_isPortable !== null) return _isPortable
  try {
    _isPortable = await invoke<boolean>('is_portable')
  } catch {
    _isPortable = false
  }
  return _isPortable
}

export async function getPortableDir(): Promise<string | null> {
  if (_portableDir !== null) return _portableDir
  try {
    _portableDir = await invoke<string>('get_portable_dir')
  } catch {
    _portableDir = null
  }
  return _portableDir
}

/**
 * Load a Tauri Store by name.
 * In portable mode, the store file goes under the portable data directory.
 * Otherwise, uses the default Tauri Store location.
 */
export async function loadStore(name: string) {
  const portable = await isPortable()
  if (portable) {
    const dir = await getPortableDir()
    if (dir) {
      return load(`${dir}/${name}`)
    }
  }
  return load(name)
}
