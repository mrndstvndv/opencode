import { For, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import type { Snapshot } from "@/snapshot"
import path from "path"

interface FileTreeProps {
  files: Snapshot.FileDiff[]
  selectedIndex: () => number
  onSelect: (index: number) => void
}

interface TreeNode {
  name: string
  fullPath: string
  type: "file" | "directory"
  file?: Snapshot.FileDiff
  index?: number
  children: TreeNode[]
}

function buildTree(files: Snapshot.FileDiff[]): TreeNode[] {
  const root: TreeNode = { name: "", fullPath: "", type: "directory", children: [] }

  // Build tree with original indices to match parent component's selectedIndex
  files.forEach((file, index) => {
    const parts = file.file.split(path.sep)
    let current = root

    parts.forEach((part, partIndex) => {
      const isLast = partIndex === parts.length - 1
      const currentPath = parts.slice(0, partIndex + 1).join(path.sep)

      let child = current.children.find((c) => c.name === part)
      if (!child) {
        child = {
          name: part,
          fullPath: currentPath,
          type: isLast ? "file" : "directory",
          children: [],
        }
        if (isLast) {
          child.file = file
          child.index = index
        }
        current.children.push(child)
      }
      current = child
    })
  })

  return flattenDirectories(root.children)
}

function flattenDirectories(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((node) => {
    if (node.type === "directory") {
      let flattened = node
      while (flattened.children.length === 1 && flattened.children[0]!.type === "directory") {
        const child = flattened.children[0]!
        flattened = {
          ...flattened,
          name: flattened.name + "/" + child.name,
          fullPath: child.fullPath,
          children: child.children,
        }
      }
      return {
        ...flattened,
        children: flattenDirectories(flattened.children),
      }
    }
    return node
  })
}

function TreeNodeComponent(props: {
  node: TreeNode
  depth: number
  selectedIndex: () => number
  onSelect: (index: number) => void
}) {
  const { theme } = useTheme()
  const indent = "  ".repeat(props.depth)

  if (props.node.type === "directory") {
    return (
      <>
        <box flexDirection="row">
          <text fg={theme.textMuted}>
            {indent}📁 {props.node.name}/
          </text>
        </box>
        <For each={props.node.children}>
          {(child) => (
            <TreeNodeComponent
              node={child}
              depth={props.depth + 1}
              selectedIndex={props.selectedIndex}
              onSelect={props.onSelect}
            />
          )}
        </For>
      </>
    )
  }

  const isSelected = () => props.node.index === props.selectedIndex()
  const file = props.node.file!
  const isBinary = file.additions === 0 && file.deletions === 0
  const isDeleted = !isBinary && file.after === ""
  const isAdded = !isBinary && file.before === ""

  const statusIcon = () => {
    if (isBinary) return "📄"
    if (isDeleted) return "🗑️"
    if (isAdded) return "✨"
    return "📝"
  }

  const statusColor = () => {
    if (isDeleted) return theme.diffRemoved
    if (isAdded) return theme.diffAdded
    return theme.text
  }

  return (
    <box
      flexDirection="row"
      gap={1}
      onMouseDown={() => props.node.index !== undefined && props.onSelect(props.node.index!)}
      backgroundColor={isSelected() ? theme.backgroundElement : undefined}
    >
      <text fg={theme.textMuted}>{indent}</text>
      <text fg={statusColor()}>{statusIcon()} </text>
      <box flexDirection="row" flexGrow={1} gap={1}>
        <text fg={isSelected() ? theme.text : theme.textMuted} wrapMode="none">
          {props.node.name}
        </text>
        <Show when={!isBinary}>
          <box flexDirection="row" gap={1} flexShrink={0}>
            <Show when={file.additions > 0}>
              <text fg={theme.diffAdded}>+{file.additions}</text>
            </Show>
            <Show when={file.deletions > 0}>
              <text fg={theme.diffRemoved}>-{file.deletions}</text>
            </Show>
          </box>
        </Show>
      </box>
    </box>
  )
}

export function FileTree(props: FileTreeProps) {
  const { theme } = useTheme()
  const tree = () => buildTree(props.files)

  return (
    <scrollbox flexGrow={1} paddingRight={1}>
      <box gap={1}>
        <box flexDirection="row" gap={1}>
          <text fg={theme.text}>
            <b>Modified Files</b>
          </text>
          <text fg={theme.textMuted}>({props.files.length})</text>
        </box>
        <box gap={0}>
          <For each={tree()}>
            {(node) => (
              <TreeNodeComponent node={node} depth={0} selectedIndex={props.selectedIndex} onSelect={props.onSelect} />
            )}
          </For>
        </box>
        <box paddingTop={1}>
          <text fg={theme.textMuted}>↑/↓ or j/k: navigate</text>
          <text fg={theme.textMuted}>b/tab: toggle tree</text>
          <text fg={theme.textMuted}>v: toggle view</text>
          <text fg={theme.textMuted}>esc: back to session</text>
        </box>
      </box>
    </scrollbox>
  )
}
