import { createSignal, createMemo, createEffect, Show, batch } from "solid-js"
import { useRoute, useRouteData } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { useKV } from "@tui/context/kv"
import { FileTree } from "./file-tree"
import { DiffViewer } from "./diff-viewer"
import type { Snapshot } from "@/snapshot"

export function Changes() {
  const route = useRoute()
  const routeData = useRouteData("changes")
  const sync = useSync()
  const { theme } = useTheme()
  const kv = useKV()
  const dimensions = useTerminalDimensions()

  const sessionID = () => routeData.sessionID
  const files = createMemo(() => sync.data.session_diff[sessionID()] ?? [])

  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [viewMode, setViewMode] = createSignal((kv.get("changes_view_mode") as "unified" | "split") ?? "unified")
  const [showSidebar, setShowSidebar] = createSignal(true)

  createEffect(() => {
    const fileList = files()
    if (fileList.length > 0 && selectedIndex() >= fileList.length) {
      setSelectedIndex(fileList.length - 1)
    }
  })

  const selectedFile = createMemo(() => {
    const fileList = files()
    const idx = selectedIndex()
    if (fileList.length === 0) return null
    return fileList[idx] ?? null
  })

  createEffect(() => {
    kv.set("changes_view_mode", viewMode())
  })

  useKeyboard((evt) => {
    const fileList = files()
    if (fileList.length === 0) return

    if (evt.name === "b" || evt.name === "tab") {
      evt.preventDefault()
      setShowSidebar((prev) => !prev)
    } else if (evt.name === "j" || evt.name === "down") {
      evt.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, fileList.length - 1))
    } else if (evt.name === "k" || evt.name === "up") {
      evt.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (evt.name === "n") {
      evt.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, fileList.length - 1))
    } else if (evt.name === "p") {
      evt.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (evt.name === "v") {
      evt.preventDefault()
      setViewMode((mode) => (mode === "unified" ? "split" : "unified"))
    } else if (evt.name === "escape") {
      evt.preventDefault()
      route.navigate({ type: "session", sessionID: sessionID() })
    }
  })

  createEffect(() => {
    const session = sync.session.get(sessionID())
    if (!session) {
      route.navigate({ type: "home" })
    }
  })

  const sidebarWidth = createMemo(() => (showSidebar() ? 35 : 0))
  const contentWidth = createMemo(() => dimensions().width - sidebarWidth())

  return (
    <box width={dimensions().width} height={dimensions().height} backgroundColor={theme.background} flexDirection="row">
      <Show when={showSidebar()}>
        <box
          width={sidebarWidth()}
          height="100%"
          backgroundColor={theme.backgroundPanel}
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={1}
          paddingRight={1}
        >
          <Show
            when={files().length > 0}
            fallback={
              <box flexGrow={1} justifyContent="center" alignItems="center">
                <text fg={theme.textMuted}>No changes in this session</text>
              </box>
            }
          >
            <FileTree files={files()} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
          </Show>
        </box>
      </Show>

      <box flexGrow={1} height="100%" backgroundColor={theme.background}>
        <Show
          when={selectedFile()}
          fallback={
            <box flexGrow={1} justifyContent="center" alignItems="center">
              <text fg={theme.textMuted}>Select a file to view diff</text>
            </box>
          }
        >
          {(file) => (
            <DiffViewer diff={file()} viewMode={viewMode()} width={contentWidth()} height={dimensions().height} />
          )}
        </Show>
      </box>
    </box>
  )
}
