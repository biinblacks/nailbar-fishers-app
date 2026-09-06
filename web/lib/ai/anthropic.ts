import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AgentRequest, AgentResult, AiProvider, ToolCallRecord, ToolDefinition } from "./provider";
import { safeArgs } from "./provider";

function toTool(tool: ToolDefinition): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: "object",
      properties: tool.parameters.properties,
      required: tool.parameters.required ?? [],
    },
  };
}

/**
 * Anthropic Claude adapter. Enabled with AI_PROVIDER=anthropic. Uses a
 * manual tool loop so the receptionist logic stays identical across providers.
 */
export function createAnthropicProvider(apiKey: string, model: string): AiProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: `anthropic:${model}`,
    async run(req: AgentRequest): Promise<AgentResult> {
      const tools = req.tools.map(toTool);
      const messages: Anthropic.MessageParam[] = [
        ...req.history.map((t): Anthropic.MessageParam => ({ role: t.role, content: t.content })),
        { role: "user", content: req.message },
      ];
      const toolCalls: ToolCallRecord[] = [];
      let reply = "";

      for (let round = 0; round <= (req.maxToolRounds ?? 4); round++) {
        const response = await client.messages.create({
          model,
          max_tokens: req.maxTokens ?? 1024,
          system: req.system,
          tools,
          messages,
          output_config: { effort: "low" },
        });

        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        if (text) reply = text;

        if (response.stop_reason === "refusal") {
          reply = reply || "I'm sorry, I can't help with that. Please call the salon directly.";
          break;
        }

        const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
        if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

        messages.push({ role: "assistant", content: response.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const use of toolUses) {
          const args = safeArgs(use.input);
          let output: unknown;
          let isError = false;
          try {
            output = await req.execute(use.name, args);
          } catch (err) {
            output = { error: err instanceof Error ? err.message : "Tool failed" };
            isError = true;
          }
          toolCalls.push({ name: use.name, args, result: output });
          results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(output), is_error: isError });
        }
        messages.push({ role: "user", content: results });
      }

      return { reply, toolCalls };
    },
  };
}
