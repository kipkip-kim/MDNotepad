import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { mount, unmount } from 'svelte'
import SlashCommandMenu from '../components/SlashCommandMenu.svelte'
import type { Editor, Range } from '@tiptap/core'

interface SlashCommand {
  title: string
  icon: string
  description: string
  action: (editor: Editor) => void
}

const COMMANDS: SlashCommand[] = [
  {
    title: 'Heading 1',
    icon: 'H1',
    description: 'Large heading',
    action: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    icon: 'H2',
    description: 'Medium heading',
    action: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    icon: 'H3',
    description: 'Small heading',
    action: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    icon: '•',
    description: 'Unordered list',
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    icon: '1.',
    description: 'Ordered list',
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Task List',
    icon: '☑',
    description: 'Checklist',
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Quote',
    icon: '"',
    description: 'Block quote',
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    icon: '</>',
    description: 'Code snippet',
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Divider',
    icon: '─',
    description: 'Horizontal rule',
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Table',
    icon: '⊞',
    description: '3×3 table',
    action: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
]

function filterCommands(query: string): SlashCommand[] {
  if (!query) return COMMANDS
  return COMMANDS.filter((cmd) => cmd.title.toLowerCase().includes(query.toLowerCase()))
}

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        items: ({ query }: { query: string }) => filterCommands(query),
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor
          range: Range
          props: SlashCommand
        }) => {
          editor.chain().focus().deleteRange(range).run()
          props.action(editor)
        },
        render: () => {
          let component: Record<string, any> | undefined
          let container: HTMLDivElement | undefined
          let selectedIndex = $state(0)
          let currentItems = $state<SlashCommand[]>([])
          let currentCommand: ((props: { item: SlashCommand }) => void) | null = null

          return {
            onStart(props: any) {
              container = document.createElement('div')
              container.style.position = 'fixed'
              container.style.zIndex = '9999'
              document.body.appendChild(container)

              currentItems = props.items
              currentCommand = props.command
              selectedIndex = 0

              positionContainer(props, container)

              component = mount(SlashCommandMenu, {
                target: container,
                props: {
                  items: currentItems,
                  selectedIndex,
                  onselect: (item: SlashCommand) => {
                    if (currentCommand) {
                      currentCommand({ item } as any)
                    }
                  },
                },
              })
            },

            onUpdate(props: any) {
              currentItems = props.items
              currentCommand = props.command
              selectedIndex = 0

              if (container) {
                positionContainer(props, container)
              }

              // Re-mount with updated props
              if (component && container) {
                unmount(component)
                component = mount(SlashCommandMenu, {
                  target: container,
                  props: {
                    items: currentItems,
                    selectedIndex,
                    onselect: (item: SlashCommand) => {
                      if (currentCommand) {
                        currentCommand({ item } as any)
                      }
                    },
                  },
                })
              }
            },

            onKeyDown(props: any) {
              const { event } = props

              if (event.key === 'ArrowUp') {
                selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length
                updateComponent()
                return true
              }
              if (event.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % currentItems.length
                updateComponent()
                return true
              }
              if (event.key === 'Enter') {
                const item = currentItems[selectedIndex]
                if (item && currentCommand) {
                  currentCommand({ item } as any)
                }
                return true
              }
              if (event.key === 'Escape') {
                return true
              }
              return false

              function updateComponent() {
                if (component && container) {
                  unmount(component)
                  component = mount(SlashCommandMenu, {
                    target: container,
                    props: {
                      items: currentItems,
                      selectedIndex,
                      onselect: (item: SlashCommand) => {
                        if (currentCommand) {
                          currentCommand({ item } as any)
                        }
                      },
                    },
                  })
                }
              }
            },

            onExit() {
              if (component) {
                unmount(component)
                component = undefined
              }
              container?.remove()
              container = undefined
            },
          }
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

function positionContainer(props: any, container: HTMLDivElement) {
  const rect = props.clientRect?.()
  if (!rect) return

  const popupHeight = 300
  const windowHeight = window.innerHeight

  if (rect.bottom + popupHeight > windowHeight) {
    container.style.top = `${rect.top - popupHeight - 4}px`
  } else {
    container.style.top = `${rect.bottom + 4}px`
  }
  container.style.left = `${Math.min(rect.left, window.innerWidth - 260)}px`
}
