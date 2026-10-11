/**
 * Defensive extraction of generated text from Transformers.js pipeline output
 * Handles all supported shapes:
 * 1. String output
 * 2. Array of strings
 * 3. Array of objects with generated_text (string)
 * 4. Array of objects with generated_text as chat message array
 * 5. Direct chat message array
 * 6. Object with content property
 */
export function extractTextFromPipelineOutput(output: any): string {
  if (output == null) return '';
  if (typeof output === 'string') return output.trim();

  // 1. Direct array of chat messages: [{ role: 'user' }, { role: 'assistant', content: '...' }]
  if (Array.isArray(output)) {
    for (let i = output.length - 1; i >= 0; i--) {
      const item = output[i];
      if (item && item.role === 'assistant' && typeof item.content === 'string') {
        return item.content.trim();
      }
    }
  }

  // 2. Wrapped candidate (e.g. output[0])
  let candidate: any = output;
  if (Array.isArray(candidate) && candidate.length > 0) {
    candidate = candidate[0];
  }

  if (candidate && typeof candidate === 'object') {
    // Shape: { generated_text: "..." }
    if (typeof candidate.generated_text === 'string') {
      return candidate.generated_text.trim();
    }

    // Shape: { generated_text: [{ role: 'assistant', content: "..." }] }
    if (Array.isArray(candidate.generated_text)) {
      for (let i = candidate.generated_text.length - 1; i >= 0; i--) {
        const msg = candidate.generated_text[i];
        if (msg && msg.role === 'assistant' && typeof msg.content === 'string') {
          return msg.content.trim();
        }
      }
      const last = candidate.generated_text[candidate.generated_text.length - 1];
      if (last && typeof last.content === 'string') {
        return last.content.trim();
      }
    }

    // Shape: { role: 'assistant', content: "..." }
    if (typeof candidate.content === 'string') {
      return candidate.content.trim();
    }

    // Shape: { text: "..." }
    if (typeof candidate.text === 'string') {
      return candidate.text.trim();
    }
  }

  // Fallback: array of chat messages directly
  if (Array.isArray(output)) {
    for (let i = output.length - 1; i >= 0; i--) {
      const msg = output[i];
      if (msg && msg.role === 'assistant' && typeof msg.content === 'string') {
        return msg.content.trim();
      }
    }
  }

  return '';
}

/**
 * Extracts and parses the first JSON object from a string
 */
export function extractJsonFromText(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty model output');
  }

  const trimmed = rawText.trim();

  // 1. Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue
  }

  // 2. Find first '{'
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('No JSON object found in output');
  }

  // Find last '}'
  const lastBrace = trimmed.lastIndexOf('}');
  if (lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Clean trailing commas and single quotes
      const cleaned = candidate
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/'/g, '"');
      return JSON.parse(cleaned);
    }
  }

  throw new Error('No closing brace found in output');
}
