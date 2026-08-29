interface WebMcpToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute(input: unknown, options?: { signal?: AbortSignal }): Promise<unknown> | unknown;
}

interface WebMcpModelContext {
  registerTool(tool: WebMcpToolDefinition, options?: { signal?: AbortSignal; exposedTo?: string[] }): void | PromiseLike<void>;
  getTools?(): Promise<unknown[]>;
}

interface Document {
  modelContext?: WebMcpModelContext;
}

interface Navigator {
  modelContext?: WebMcpModelContext;
}
