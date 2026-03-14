import { invoke } from '@tauri-apps/api/core'
import { load } from '@tauri-apps/plugin-store'

// Promise-based cache to prevent race conditions on concurrent calls
let _isPortablePromise: Promise<boolean> | null = null
let _portableDirPromise: Promise<string | null> | null = null

export function isPortable(): Promise<boolean> {
  if (!_isPortablePromise) {
    _isPortablePromise = invoke<boolean>('is_portable').catch(() => false)
  }
  return _isPortablePromise
}

export function getPortableDir(): Promise<string | null> {
  if (!_portableDirPromise) {
    _portableDirPromise = invoke<string>('get_portable_dir').catch(() => null)
  }
  return _portableDirPromise
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
