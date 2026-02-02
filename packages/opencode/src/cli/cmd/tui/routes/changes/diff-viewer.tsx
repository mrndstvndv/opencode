import { Show, createMemo } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useKV } from "@tui/context/kv"
import { Snapshot } from "@/snapshot"
import path from "path"
import { createTwoFilesPatch } from "diff"

interface DiffViewerProps {
  diff: Snapshot.FileDiff
  viewMode: "unified" | "split"
  width: number
  height: number
}

function detectFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const languageMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".py": "python",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".cpp": "cpp",
    ".c": "c",
    ".h": "c",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "zsh",
    ".sql": "sql",
    ".xml": "xml",
    ".dockerfile": "dockerfile",
    ".toml": "toml",
  }
  return languageMap[ext] ?? "text"
}

function generateDiffContent(diff: Snapshot.FileDiff): { content: string; error?: string } {
  try {
    const isBinary = Snapshot.isBinaryFile(diff)
    const isDeleted = !isBinary && diff.after === ""
    const isAdded = !isBinary && diff.before === ""

    if (isBinary) {
      return { content: "" }
    }

    if (isDeleted) {
      return { content: createTwoFilesPatch(diff.file, diff.file, diff.before, "") }
    }

    if (isAdded) {
      return { content: createTwoFilesPatch(diff.file, diff.file, "", diff.after) }
    }

    return { content: createTwoFilesPatch(diff.file, diff.file, diff.before, diff.after) }
  } catch (error) {
    console.error("Failed to generate diff:", error)
    return { content: "", error: `Error generating diff for ${diff.file}` }
  }
}

export function DiffViewer(props: DiffViewerProps) {
  const { theme, syntax } = useTheme()
  const kv = useKV()

  const fileType = createMemo(() => detectFileType(props.diff.file))

  const isBinary = () => Snapshot.isBinaryFile(props.diff)
  const isDeleted = () => !isBinary() && props.diff.after === ""
  const isAdded = () => !isBinary() && props.diff.before === ""

  const diffResult = createMemo(() => generateDiffContent(props.diff))
  const diffContent = () => diffResult().content
  const diffError = () => diffResult().error

  const headerStats = () => {
    const parts: string[] = []
    if (isBinary()) {
      parts.push("Binary file")
    } else {
      if (isAdded()) parts.push("Added")
      else if (isDeleted()) parts.push("Deleted")
      else parts.push("Modified")

      if (props.diff.additions > 0) {
        parts.push(`+${props.diff.additions}`)
      }
      if (props.diff.deletions > 0) {
        parts.push(`-${props.diff.deletions}`)
      }
    }
    return parts.join(" | ")
  }

  return (
    <box flexDirection="column" width={props.width} height={props.height}>
      <box
        flexDirection="row"
        paddingLeft={1}
        paddingRight={1}
        paddingTop={1}
        paddingBottom={1}
        backgroundColor={theme.backgroundPanel}
        gap={1}
      >
        <text fg={theme.text} wrapMode="word">
          <b>{props.diff.file}</b>
        </text>
        <box flexGrow={1} />
        <text fg={theme.textMuted}>b: tree</text>
        <text fg={theme.textMuted}>{headerStats()}</text>
        <text fg={theme.textMuted}>| {props.viewMode}</text>
      </box>

      <Show
        when={!isBinary() && !diffError()}
        fallback={
          <box flexGrow={1} justifyContent="center" alignItems="center">
            <text fg={theme.textMuted}>{diffError() || "Binary file - diff not available"}</text>
          </box>
        }
      >
        <diff
          diff={diffContent()}
          view={props.viewMode}
          filetype={fileType()}
          syntaxStyle={syntax()}
          showLineNumbers={true}
          width="100%"
          wrapMode={(kv.get("diff_wrap_mode") as "word" | "none") ?? "word"}
          fg={theme.text}
          addedBg={theme.diffAddedBg}
          removedBg={theme.diffRemovedBg}
          contextBg={theme.diffContextBg}
          addedSignColor={theme.diffHighlightAdded}
          removedSignColor={theme.diffHighlightRemoved}
          lineNumberFg={theme.diffLineNumber}
          lineNumberBg={theme.diffContextBg}
          addedLineNumberBg={theme.diffAddedLineNumberBg}
          removedLineNumberBg={theme.diffRemovedLineNumberBg}
        />
      </Show>
    </box>
  )
}
