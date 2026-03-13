import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'

export interface SearchResult {
  from: number
  to: number
}

interface SearchPluginState {
  searchTerm: string
  caseSensitive: boolean
  results: SearchResult[]
  currentIndex: number
  decorations: DecorationSet
}

const searchHighlightKey = new PluginKey<SearchPluginState>('searchHighlight')

/**
 * Extract full text from a text block node along with a mapping from
 * text offsets to document positions. This handles cross-node matches
 * (e.g., bold + plain text split across multiple nodes).
 */
function textWithMapping(node: PMNode, basePos: number): { text: string; map: number[] } {
  let text = ''
  const map: number[] = [] // map[textIndex] = docPos

  node.forEach((child, offset) => {
    if (child.isText && child.text) {
      for (let i = 0; i < child.text.length; i++) {
        map.push(basePos + offset + i)
        text += child.text[i]
      }
    }
  })

  return { text, map }
}

function findMatches(doc: PMNode, searchTerm: string, caseSensitive: boolean): SearchResult[] {
  if (!searchTerm) return []

  const results: SearchResult[] = []
  const term = caseSensitive ? searchTerm : searchTerm.toLowerCase()

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return

    const contentStart = pos + 1
    const { text: fullText, map } = textWithMapping(node, contentStart)
    if (fullText.length === 0) return false // skip children, already processed

    const searchText = caseSensitive ? fullText : fullText.toLowerCase()
    let index = 0

    while (index < searchText.length) {
      const found = searchText.indexOf(term, index)
      if (found === -1) break
      results.push({
        from: map[found],
        to: map[found + term.length - 1] + 1,
      })
      index = found + 1
    }

    return false // don't descend into children (already handled via forEach)
  })

  return results
}

function buildDecorations(results: SearchResult[], currentIndex: number, doc: PMNode): DecorationSet {
  if (results.length === 0) return DecorationSet.empty

  const decorations = results.map((result, i) => {
    const className = i === currentIndex ? 'search-result search-result-current' : 'search-result'
    return Decoration.inline(result.from, result.to, { class: className })
  })

  return DecorationSet.create(doc, decorations)
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchTerm: (term: string, caseSensitive: boolean) => ReturnType
      clearSearch: () => ReturnType
      setSearchIndex: (index: number) => ReturnType
    }
  }
}

export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addStorage() {
    return {
      results: [] as SearchResult[],
      currentIndex: 0,
    }
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string, caseSensitive: boolean) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(searchHighlightKey, { type: 'setSearchTerm', term, caseSensitive })
          }
          return true
        },

      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(searchHighlightKey, { type: 'clearSearch' })
          }
          return true
        },

      setSearchIndex:
        (index: number) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(searchHighlightKey, { type: 'setSearchIndex', index })
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const extensionStorage = this.storage

    return [
      new Plugin<SearchPluginState>({
        key: searchHighlightKey,

        state: {
          init(): SearchPluginState {
            return {
              searchTerm: '',
              caseSensitive: false,
              results: [],
              currentIndex: 0,
              decorations: DecorationSet.empty,
            }
          },

          apply(tr: Transaction, prev: SearchPluginState, _oldState: EditorState, newState: EditorState): SearchPluginState {
            const meta = tr.getMeta(searchHighlightKey)

            if (meta) {
              if (meta.type === 'clearSearch') {
                extensionStorage.results = []
                extensionStorage.currentIndex = 0
                return {
                  searchTerm: '',
                  caseSensitive: false,
                  results: [],
                  currentIndex: 0,
                  decorations: DecorationSet.empty,
                }
              }

              if (meta.type === 'setSearchTerm') {
                const results = findMatches(newState.doc, meta.term, meta.caseSensitive)
                const currentIndex = results.length > 0 ? 0 : -1
                const decorations = buildDecorations(results, currentIndex, newState.doc)

                extensionStorage.results = results
                extensionStorage.currentIndex = currentIndex

                return {
                  searchTerm: meta.term,
                  caseSensitive: meta.caseSensitive,
                  results,
                  currentIndex,
                  decorations,
                }
              }

              if (meta.type === 'setSearchIndex') {
                const currentIndex = prev.results.length > 0
                  ? Math.max(0, Math.min(meta.index, prev.results.length - 1))
                  : -1
                const decorations = buildDecorations(prev.results, currentIndex, newState.doc)

                extensionStorage.currentIndex = currentIndex

                return { ...prev, currentIndex, decorations }
              }
            }

            // If doc changed and we have an active search, recalculate
            if (tr.docChanged && prev.searchTerm) {
              const results = findMatches(newState.doc, prev.searchTerm, prev.caseSensitive)
              const currentIndex = results.length > 0
                ? Math.min(prev.currentIndex, results.length - 1)
                : -1
              const decorations = buildDecorations(results, currentIndex, newState.doc)

              extensionStorage.results = results
              extensionStorage.currentIndex = currentIndex

              return { ...prev, results, currentIndex, decorations }
            }

            return prev
          },
        },

        props: {
          decorations(state: EditorState): DecorationSet {
            return this.getState(state)?.decorations ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})
