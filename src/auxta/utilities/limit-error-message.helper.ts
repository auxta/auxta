// Step error messages are JSON strings holding the console, network and debug logs of a run.
// All steps of a scenario are stored in one document, and MongoDB refuses documents over 16 MB,
// so long scenarios with chatty pages used to fail with ERR_OUT_OF_RANGE from the BSON serialiser.
// These helpers shrink the logs while keeping the JSON readable by the report page.

const MAX_ENTRY_CHARS = 4000;
const LOG_FIELDS = ['console', 'https', 'debug'];

const size = (s: string) => Buffer.byteLength(s, 'utf8');

const shortenEntry = (entry: any) => {
  if (typeof entry === 'string') {
    return entry.length > MAX_ENTRY_CHARS ? entry.slice(0, MAX_ENTRY_CHARS) + '... [truncated]' : entry;
  }
  if (entry && typeof entry === 'object') {
    const out = { ...entry };
    if (typeof out.text === 'string' && out.text.length > MAX_ENTRY_CHARS) {
      out.text = out.text.slice(0, MAX_ENTRY_CHARS) + '... [truncated]';
    }
    if (out.args !== undefined) {
      const argsLength = (JSON.stringify(out.args) || '').length;
      if (argsLength > MAX_ENTRY_CHARS) out.args = [`[arguments removed, ${argsLength} characters]`];
    }
    return out;
  }
  return entry;
};

/**
 * Returns the error message as a JSON string of at most maxBytes. The newest log entries are kept,
 * the oldest are dropped first. Values that are not JSON are cut to length.
 */
export function limitErrorMessage(raw: any, maxBytes: number): any {
  if (typeof raw !== 'string' || size(raw) <= maxBytes) return raw;

  let obj: any;
  try {
    obj = JSON.parse(raw);
  } catch {
    return raw.slice(0, Math.max(0, maxBytes - 20)) + '... [truncated]';
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return JSON.stringify(String(raw).slice(0, Math.max(0, maxBytes - 40)) + '... [truncated]');
  }

  // byTab repeats the logs of every tab and the report page does not read it
  delete obj.byTab;
  for (const field of LOG_FIELDS) {
    if (Array.isArray(obj[field])) obj[field] = obj[field].map(shortenEntry);
  }

  let json = JSON.stringify(obj);
  while (size(json) > maxBytes) {
    const largest = LOG_FIELDS
      .filter(f => Array.isArray(obj[f]) && obj[f].length > 0)
      .sort((a, b) => JSON.stringify(obj[b]).length - JSON.stringify(obj[a]).length)[0];
    if (!largest) break;
    const list = obj[largest];
    obj[largest] = list.slice(Math.ceil(list.length / 2));
    obj.truncated = true;
    json = JSON.stringify(obj);
  }

  if (size(json) > maxBytes) {
    obj = {
      error: String(typeof obj.error === 'string' ? obj.error : JSON.stringify(obj.error) || '').slice(0, 2000),
      currentPageUrl: obj.currentPageUrl,
      console: [], https: [], debug: [],
      truncated: true
    };
    json = JSON.stringify(obj);
  }
  return json;
}

/**
 * Applies limitErrorMessage to every step so that the error messages of one scenario
 * together stay under maxTotalBytes, with no single message above maxOneBytes.
 */
export function limitStepErrorMessages(steps: { errorMessage?: any }[], maxOneBytes: number, maxTotalBytes: number) {
  for (const step of steps) step.errorMessage = limitErrorMessage(step.errorMessage, maxOneBytes);

  const withMessage = steps.filter(s => typeof s.errorMessage === 'string');
  const total = withMessage.reduce((sum, s) => sum + size(s.errorMessage), 0);
  if (total <= maxTotalBytes) return;

  const share = Math.floor(maxTotalBytes / withMessage.length);
  for (const step of withMessage) step.errorMessage = limitErrorMessage(step.errorMessage, share);
}
