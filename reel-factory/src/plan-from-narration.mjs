// Builds a beat plan whose timing comes from the generated narration (stories/<story>/narration/voice/segments.json): beat start = segment start (+ lead-in), seconds = segment length, words = forced-alignment word times relative to the beat.
import fs from "node:fs";
export function planFromNarration({ base, segments, offset = 0.5 }) {
  const seg = JSON.parse(fs.readFileSync(segments, "utf8")), by = Object.fromEntries(seg.segments.map(s => [s.beat_id, s]));
  const beats = base.beats.map(b => { const s = by[b.segment]; if (!s) throw new Error("no narration segment " + b.segment);
    return { ...b, start: +(s.start_seconds + offset).toFixed(3), seconds: +(s.end_seconds - s.start_seconds).toFixed(3), narration: s.text, words: (s.words || []).map(w => ({ t: w.word, s: +(w.start - s.start_seconds).toFixed(3), e: +(w.end - s.start_seconds).toFixed(3) })) }; });
  return { ...base, beats, voice_offset: offset, narration_seconds: seg.duration_seconds };
}
