/** Bounded diagnostics for an explicitly registered private evaluation sink only.
 * Never log model text/usage payloads globally or treat a partial answer as success. */
export type StreamDiagnostic = {
  httpStatus: number | null;
  providerRequestId: string | null;
  eventTypes: string[];
  eventCount: number;
  terminalType: string | null;
  terminalJson: string | null;
  reportedUsage: unknown;
  partialOutput: string;
  truncated: boolean;
  unparsedTail: string;
  outcome: string;
  failure: { name: string; message: string } | null;
};
export function newStreamDiagnostic(): StreamDiagnostic {
  return { httpStatus: null, providerRequestId: null, eventTypes: [], eventCount: 0, terminalType: null, terminalJson: null, reportedUsage: null, partialOutput: "", truncated: false, unparsedTail: "", outcome: "not_started", failure: null };
}
export async function consumeResponseStream<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  diagnostic: StreamDiagnostic,
  callbacks: { onFirstEvent?: () => void; onFirstOutput?: () => void; onDelta?: (text: string) => void | Promise<void> } = {},
): Promise<T> {
  const decoder = new TextDecoder();
  let lastFrame = "";
  let buffer = "", completed: T | null = null, sawOutput = false;
  diagnostic.outcome = "reading";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.length > 2_000_000) throw new Error("OpenAI stream frame exceeded diagnostic bounds.");
      const frames = buffer.split("\n\n"); buffer = frames.pop() || "";
      for (const frame of frames) {
        const data = frame.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).replace(/^ /, "")).join("\n");
        if (!data || data === "[DONE]") continue;
        lastFrame = data;
        const event = JSON.parse(data) as { type?: string; delta?: string; response?: { usage?: unknown; status?: string }; usage?: unknown };
        const type = typeof event.type === "string" ? event.type.slice(0, 100) : "missing_type";
        diagnostic.eventCount++;
        diagnostic.eventTypes = [...diagnostic.eventTypes.slice(-63), type];
        if (diagnostic.eventCount === 1) callbacks.onFirstEvent?.();
        if (event.response?.usage != null) diagnostic.reportedUsage = structuredClone(event.response.usage);
        else if (event.usage != null) diagnostic.reportedUsage = structuredClone(event.usage);
        if (["response.completed", "response.incomplete", "response.failed", "error"].includes(type)) {
          diagnostic.terminalType = type;
          diagnostic.terminalJson = data.slice(0, 262144);
          diagnostic.truncated ||= data.length > 262144;
          if (type !== "response.completed" || !event.response || (event.response.status !== undefined && event.response.status !== "completed")) {
            diagnostic.outcome = "terminal_failure";
            throw new Error("OpenAI stream returned a non-completed terminal event.");
          }
          completed = event.response as T;
        }
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          const available = 16384 - diagnostic.partialOutput.length;
          diagnostic.partialOutput += event.delta.slice(0, available);
          diagnostic.truncated ||= event.delta.length > available;
          if (!sawOutput) { sawOutput = true; callbacks.onFirstOutput?.(); }
          await callbacks.onDelta?.(event.delta);
        }
      }
      if (done) break;
    }
    if (!completed || buffer.trim()) {
      diagnostic.outcome = "ended_without_complete_frame";
      throw new Error("OpenAI streaming response did not complete safely.");
    }
    diagnostic.outcome = "completed";
    return completed;
  } catch (error) {
    if (diagnostic.outcome === "reading") diagnostic.outcome = error instanceof SyntaxError ? "malformed_frame" : "transport_or_callback_error";
    diagnostic.failure = { name: error instanceof Error ? error.name.slice(0, 100) : "UnknownError", message: error instanceof Error ? error.message.slice(0, 2048) : "Non-Error stream failure" };
    diagnostic.unparsedTail = (buffer || lastFrame).slice(0, 4096);
    diagnostic.truncated ||= buffer.length > 4096;
    throw error;
  } finally {
    // Stop a failed/incomplete response; never continue or retry it implicitly.
    if (diagnostic.outcome !== "completed") void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
