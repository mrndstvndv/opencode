import type { AssistantMessage, Message } from "@opencode-ai/sdk/v2"
import type { useSync } from "@tui/context/sync"

export function getTokenUsage(messages: Message[], sync: ReturnType<typeof useSync>) {
  const last = messages.findLast((x) => x.role === "assistant" && x.tokens.output > 0) as AssistantMessage
  if (!last) return undefined
  const total =
    last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
  const model = sync.data.provider.find((x) => x.id === last.providerID)?.models[last.modelID]

  const percentage = model?.limit.context ? Math.round((total / model.limit.context) * 100) : undefined

  return {
    total,
    percentage,
    formatted: total.toLocaleString(),
    model: model,
  }
}
