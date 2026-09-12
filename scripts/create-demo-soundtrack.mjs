// Original BLACKPROOF instrumental, synthesized locally without samples.
// AGPL-3.0-only, like this repository. No network or third-party music.
// node scripts/create-demo-soundtrack.mjs <seconds> <new-output.wav>
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function soundtrack(duration, rate = 48_000) {
  if (!Number.isFinite(duration) || duration < 1 || duration > 180) throw new Error("Invalid duration");
  const samples = Math.ceil(duration * rate);
  const wav = Buffer.alloc(44 + samples * 4);
  wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(samples * 4, 40);
  const beat = 60 / 104;
  const chords = [[45, 52, 57, 60], [41, 48, 53, 57], [48, 55, 60, 64], [43, 50, 55, 59]];
  const hz = note => 440 * 2 ** ((note - 69) / 12);
  let seed = 0x42505246;
  let previousNoise = 0;
  for (let i = 0; i < samples; i += 1) {
    const t = i / rate;
    const b = t / beat;
    const chord = chords[Math.floor(b / 8) % chords.length];
    const phase = t % beat;
    const step = Math.floor(b * 2);
    const local = t % (beat / 2);
    const fade = Math.min(1, t / 2, Math.max(0, (duration - t) / 4));
    const duck = 0.55 + 0.45 * Math.min(1, phase / 0.23);
    const kick = Math.sin(2 * Math.PI * (48 * phase + 9 * (1 - Math.exp(-phase * 30)))) * Math.exp(-phase * 16) * 0.13;
    const bass = Math.sin(2 * Math.PI * hz(chord[0] - 12) * t) * 0.075 * duck;
    const arpNote = chord[[0, 2, 1, 3, 2, 1, 3, 2][step % 8]] + 12;
    const arpEnvelope = Math.min(1, local / 0.015) * Math.exp(-local * 13);
    const arp = (Math.sin(2 * Math.PI * hz(arpNote) * t) + 0.15 * Math.sin(4 * Math.PI * hz(arpNote) * t)) * arpEnvelope * 0.035;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 0x80000000 - 1;
    const hat = (noise - previousNoise) * Math.exp(-local * 65) * 0.011;
    previousNoise = noise;
    for (let channel = 0; channel < 2; channel += 1) {
      const pad = chord.reduce((sum, note) => sum + Math.sin(2 * Math.PI * hz(note + 12) * (1 + (channel ? 0.0008 : -0.0008)) * t), 0) * 0.011 * duck;
      const sample = (kick + bass + pad + arp * (channel ? 0.85 : 1) + hat) * fade;
      wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + i * 4 + channel * 2);
    }
  }
  return wav;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 4) throw new Error("Expected duration and new WAV path");
  await writeFile(process.argv[3], soundtrack(Number(process.argv[2])), { flag: "wx" });
}
