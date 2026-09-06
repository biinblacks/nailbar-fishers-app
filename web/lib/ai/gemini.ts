import "server-only";
import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type Part,
  SchemaType,
} from "@google/generative-ai";
import type { AgentRequest, AgentResult, AiProvider, ToolCallRecord, ToolDefinition } from "./provider";
import { safeArgs } from "./provider";

const SCHEMA_TYPES: Record<string, SchemaType> = {
  string: SchemaType.STRING,
  number: SchemaType.NUMBER,
  integer: SchemaType.INTEGER,
  boolean: SchemaType.BOOLEAN,
};

function toDeclaration(tool: ToolDefinition): FunctionDeclaration {
  const properties: FunctionDeclarationSchema["properties"] = {};
  for (const [key, prop] of Object.entries(tool.parameters.properties)) {
    properties[key] = {
      type: SCHEMA_TYPES[prop.type] ?? SchemaType.STRING,
      description: prop.description,
      ...(prop.enum ? { enum: prop.enum, format: "enum" } : {}),
    };
  }
  return {
    name: tool.name,
    description: tool.description,
    parameters: { type: SchemaType.OBJECT, properties, required: tool.parameters.required },
  };
}

/** Google Gemini adapter — the provider the original Express API shipped with. */
export function createGeminiProvider(apiKey: string, model: string): AiProvider {
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    name: `gemini:${model}`,
    async run(req: AgentRequest): Promise<AgentResult> {
      const generativeModel = genAI.getGenerativeModel({
        model,
        systemInstruction: req.system,
        generationConfig: { temperature: 0.5, maxOutputTokens: req.maxTokens ?? 700 },
        tools: req.tools.length ? [{ functionDeclarations: req.tools.map(toDeclaration) }] : undefined,
      });

      const history: Content[] = req.history.map((t) => ({
        role: t.role === "assistant" ? "model" : "user",
        parts: [{ text: t.content }],
      }));

      const chat = generativeModel.startChat({ history });
      const toolCalls: ToolCallRecord[] = [];
      let result = await chat.sendMessage(req.message);

      for (let round = 0; round < (req.maxToolRounds ?? 4); round++) {
        const calls = result.response.functionCalls();
        if (!calls || calls.length === 0) break;

        const responses: Part[] = [];
        for (const call of calls) {
          const args = safeArgs(call.args);
          let output: unknown;
          try {
            output = await req.execute(call.name, args);
          } catch (err) {
            output = { error: err instanceof Error ? err.message : "Tool failed" };
          }
          toolCalls.push({ name: call.name, args, result: output });
          responses.push({ functionResponse: { name: call.name, response: { result: output } } });
        }
        result = await chat.sendMessage(responses);
      }

      let reply = "";
      try {
        reply = result.response.text().trim();
      } catch {
        reply = "";
      }
      return { reply, toolCalls };
    },
  };
}
