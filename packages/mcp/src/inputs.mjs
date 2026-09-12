import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { dirname, isAbsolute, parse, resolve } from "node:path";
import { compareDeliveries, verifyDelivery, verifyDeliveryZip } from "@blackproof/verifier";

const MAX_BYTES = 10_000_000;
const fail = () => { throw new Error("LOCAL_INPUT_REFUSED"); };

// POSIX ownership is a local account boundary, not proof of authorship or
// protection against root, ACL grants, a compromised host or same-UID malware.
export async function readSelectedFile(path) {
  const uid = process.getuid?.();
  if (!uid || !isAbsolute(path) || path !== resolve(path)) fail();
  let parent = dirname(path);
  let immediate = true;
  while (true) {
    const info = await lstat(parent);
    if (!info.isDirectory() || info.isSymbolicLink()) fail();
    if (immediate && (info.uid !== uid || (info.mode & 0o077) !== 0)) fail();
    if (info.uid !== uid && info.uid !== 0) fail();
    // A sticky shared ancestor such as /private/tmp cannot replace an
    // existing owner-only child. A non-sticky writable ancestor can.
    if ((info.mode & 0o022) && !(info.uid === 0 && (info.mode & 0o1000))) fail();
    if (parent === parse(parent).root) break;
    parent = dirname(parent);
    immediate = false;
  }
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.uid !== uid
    || (before.mode & 0o077) || before.nlink !== 1 || before.size < 1 || before.size > MAX_BYTES) fail();
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let bytes;
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino
      || opened.uid !== uid || (opened.mode & 0o077) || opened.nlink !== 1 || opened.size !== before.size) fail();
    bytes = Buffer.alloc(opened.size + 1);
    let used = 0;
    while (used < bytes.length) {
      const { bytesRead } = await handle.read(bytes, used, bytes.length - used, used);
      if (!bytesRead) break;
      used += bytesRead;
    }
    const after = await handle.stat();
    const named = await lstat(path);
    if (used !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs
      || after.ctimeMs !== opened.ctimeMs || named.dev !== opened.dev || named.ino !== opened.ino
      || named.isSymbolicLink()) fail();
    return bytes.subarray(0, used);
  } catch {
    bytes?.fill(0);
    fail();
  } finally { await handle.close(); }
}

async function inspectSelected(path) {
  const bytes = await readSelectedFile(path);
  try {
    const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
    if (!zip && bytes.length > 2_000_000) fail();
    const result = zip ? await verifyDeliveryZip(bytes) : verifyDelivery(bytes.toString("utf8"));
    const checks = zip ? result.deliveryResult : result;
    // Construct an allowlist. Never spread a verifier result: it contains
    // the entire private Delivery and findings with private JSON pointers.
    return {
      summary: {
        valid: result.isValid === true,
        checks: {
          schema: checks?.validSchema === true,
          fingerprint: checks?.validFingerprint === true,
          links: checks?.validLinks === true,
          invariants: checks?.validInvariants === true,
          ...(zip ? { manifest: result.validManifest === true, sidecars: result.validCanonicalSidecars === true } : {}),
        },
        ...(result.isValid ? { counts: {
          questions: checks.delivery.questions.length,
          evidenceReferences: checks.delivery.questions.reduce((count, q) => count + q.evidence.length, 0),
          reservations: checks.delivery.questions.filter(q => Boolean(q.reservation?.trim())).length,
        } } : {}),
      },
      delivery: result.isValid ? checks.delivery : null,
    };
  } finally { bytes.fill(0); }
}

export async function prepareSession(currentPath, previousPath) {
  if (!currentPath) return null;
  const current = await inspectSelected(currentPath);
  const previous = previousPath ? await inspectSelected(previousPath) : null;
  let comparison = null;
  if (previous) {
    comparison = { comparable: false };
    if (previous.delivery && current.delivery && previous.delivery.case.id === current.delivery.case.id) {
      try {
        const { summary } = compareDeliveries(previous.delivery, current.delivery);
        comparison = { comparable: true, counts: {
          added: summary.added, removed: summary.removed,
          changed: summary.changed, unchanged: summary.unchanged,
        } };
      } catch { /* Different or ambiguous dossiers are not comparable. */ }
    }
  }
  // Only minimized immutable snapshots survive startup, not private contents.
  return JSON.parse(JSON.stringify({ current: current.summary, comparison }));
}
