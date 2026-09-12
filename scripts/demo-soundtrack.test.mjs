import assert from "node:assert/strict";
import test from "node:test";
import { soundtrack } from "./create-demo-soundtrack.mjs";

test("original soundtrack is deterministic stereo PCM with fades and no clipping", () => {
  const wav = soundtrack(8);
  assert.deepEqual(wav, soundtrack(8));
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt16LE(22), 2);
  assert.equal(wav.readUInt32LE(24), 48000);
  assert.equal(wav.length, 44 + 8 * 48000 * 4);
  let peak = 0;
  let energy = 0;
  for (let i = 44; i < wav.length; i += 2) {
    const sample = wav.readInt16LE(i);
    peak = Math.max(peak, Math.abs(sample));
    energy += sample * sample;
  }
  assert.ok(peak > 1000 && peak < 16000);
  assert.ok(energy > 0);
  assert.equal(wav.readInt16LE(44), 0);
  assert.ok(Math.abs(wav.readInt16LE(wav.length - 2)) < 10);
  for (const seconds of [0, 181, NaN, Infinity]) assert.throws(() => soundtrack(seconds));
});
