export function parseSupabaseJsonPayload(output, requiredKey) {
  const candidates = [];
  const lines = output.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      candidates.push(trimmed);
    }
  }

  const startIndexes = [];
  for (let index = 0; index < output.length; index += 1) {
    if (output[index] === "{") startIndexes.push(index);
  }

  for (const start of startIndexes) {
    for (let end = output.length - 1; end > start; end -= 1) {
      if (output[end] !== "}") continue;
      candidates.push(output.slice(start, end + 1));
      break;
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (!requiredKey || Object.prototype.hasOwnProperty.call(parsed, requiredKey)) {
        return parsed;
      }
    } catch {
      // Keep scanning: Supabase may write human status text around JSON.
    }
  }

  throw new Error("Unable to parse Supabase JSON output.");
}
