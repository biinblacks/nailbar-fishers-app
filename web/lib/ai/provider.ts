/**
 * Provider-agnostic contract for the AI receptionist. The salon chat only
 * needs: a system prompt, prior turns, the new message, and a set of tools
 * the model may call (availability lookup, booking, human handoff).
 */

export interface JsonSchemaProperty {
  type: "string" | "number" | "integer" | "boolean";
  description?: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, JsonSchemaProperty>;
    required?: string[];
  };
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface AgentRequest {
  system: string;
  history: ChatTurn[];
  message: string;
  tools: ToolDefinition[];
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Safety valve for tool loops. */
  maxToolRounds?: number;
  /** Output token budget (defaults suit short chat replies). */
  maxTokens?: number;
}

export interface AgentResult {
  reply: string;
  toolCalls: ToolCallRecord[];
}

export interface AiProvider {
  readonly name: string;
  run(request: AgentRequest): Promise<AgentResult>;
}

export function safeArgs(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
}
