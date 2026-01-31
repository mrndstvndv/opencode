import { tool } from "@opencode-ai/plugin"
import z from "zod"

export const TaskWithModelPlugin = async ({ client }) => {
  return {
    tool: {
      list_available_models: tool({
        description:
          "List all connected/available AI models that can be used with task_with_model. Only returns models from providers that are currently configured and ready to use.",
        args: {},
        async execute() {
          try {
            const result = await client.provider.list()
            if (!result.data) {
              throw new Error("Failed to list providers: no data returned")
            }

            const connectedProviderIds = result.data.connected
            const allProviders = result.data.all
            const connectedProviders = allProviders.filter((p) => connectedProviderIds.includes(p.id))

            const modelList: Array<{
              providerID: string
              modelID: string
              name: string
              cost?: { input: number; output: number; cache_read?: number; cache_write?: number }
              limit: { context: number; input?: number; output: number }
              reasoning: boolean
              toolCall: boolean
            }> = []

            for (const provider of connectedProviders) {
              for (const [modelID, model] of Object.entries(provider.models) as Array<[string, any]>) {
                modelList.push({
                  providerID: provider.id,
                  modelID: model.id,
                  name: model.name,
                  cost: model.cost,
                  limit: model.limit,
                  reasoning: model.reasoning,
                  toolCall: model.tool_call,
                })
              }
            }

            return JSON.stringify(modelList, null, 2)
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to list available models: ${message}`)
          }
        },
      }),

      task_with_model: tool({
        description:
          "Delegate a task to a specialized subagent with a specific model override. IMPORTANT: Use list_available_models first to see available models and their capabilities before selecting a model.",
        args: {
          description: z.string().describe("A short (3-5 words) description of the task"),
          prompt: z.string().describe("The task for the agent to perform"),
          subagent_type: z.string().describe("The type of specialized agent to use"),
          model: z.object({
            providerID: z.string().describe("The provider ID (e.g., 'openai', 'anthropic')"),
            modelID: z.string().describe("The model ID (e.g., 'gpt-4o')"),
          }),
        },
        async execute(args, context) {
          const { sessionID } = context

          try {
            // Create a child session
            const createResponse = await client.session.create({
              body: {
                parentID: sessionID,
                title: args.description,
              },
            })

            if (!createResponse.data) {
              throw new Error("Failed to create session: no data returned")
            }

            const session = createResponse.data

            // Prompt the session with the specified model and agent
            const result = await client.session.prompt({
              path: { id: session.id },
              body: {
                model: args.model,
                agent: args.subagent_type,
                parts: [
                  {
                    type: "text",
                    text: args.prompt,
                  },
                ],
              },
            })

            if (!result.data) {
              throw new Error("Failed to prompt session: no data returned")
            }

            const textParts = result.data.parts?.filter((x) => x.type === "text") ?? []
            const text = textParts[textParts.length - 1]?.text ?? ""

            return text + "\n\n<task_metadata>\nsession_id: " + session.id + "\n</task_metadata>"
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Task with model failed: ${message}`)
          }
        },
      }),
    },
  }
}
