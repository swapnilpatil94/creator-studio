#!/usr/bin/env node
// Procedural sound design (no samples, no models): drone bed with mood automation + cue synth + reverb + limiter.
// usage: node sound.mjs <cues.json> <duration_seconds> <out.wav>
// cues.json: { lead, root, moods:[{t,mood}], cues:[{t,type,dur,level,pan,freq,...}] }  (t in narration seconds; `lead` is added)
import fs from "node:fs";
const SR = 48000, TAU = Math.PI * 2;
const db = x => Math.pow(10, x / 20), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

export function synth(spec, duration) {
  const N = Math.ceil(duration * SR), L = new Float32Array(N), R = new Float32Array(N), SL = new Float32Array(N), SR_ = new Float32Array(N); // dry + reverb send
  const lead = spec.lead || 0, root = spec.root || 98;
  const add = (t0, i, v, pan, send) => { const k = Math.floor(t0 * SR) + i; if (k < 0 || k >= N) return; const a = Math.cos((pan + 1) * Math.PI / 4), b = Math.sin((pan + 1) * Math.PI / 4); L[k] += v * a; R[k] += v * b; if (send) { SL[k] += v * a * send; SR_[k] += v * b * send; } };

  // ---------- drone bed with mood automation ----------
  const RATIOS = [1, 1.0595, 1.25, 1.4983, 1.5, 2, 3];
  const MOODS = {
    calm:    { a: [1, 0, 0, 0, 0.55, 0.38, 0.12], cut: 420, lvl: -31 },
    dread:   { a: [1, 0.45, 0, 0, 0.5, 0.3, 0.1], cut: 520, lvl: -28 },
    wonder:  { a: [1, 0, 0.45, 0, 0.6, 0.42, 0.22], cut: 1500, lvl: -29 },
    rush:    { a: [1, 0, 0, 0, 0.7, 0.55, 0.35], cut: 1500, lvl: -26 },
    siege:   { a: [1, 0.6, 0, 0.5, 0.4, 0.4, 0.2], cut: 900, lvl: -25 },
    release: { a: [1, 0, 0.5, 0, 0.7, 0.45, 0.3], cut: 2200, lvl: -29 }
  };
  const moods = (spec.moods || [{ t: -1, mood: "calm" }]).map(m => ({ t: m.t + lead, mood: m.mood })).sort((a, b) => a.t - b.t);
  const CR = 100, nCtl = Math.ceil(duration * CR) + 2, ctlA = RATIOS.map(() => new Float32Array(nCtl)), ctlCut = new Float32Array(nCtl), ctlLvl = new Float32Array(nCtl);
  { let cur = { a: MOODS[moods[0].mood].a.slice(), cut: MOODS[moods[0].mood].cut, lvl: MOODS[moods[0].mood].lvl }, mi = 0;
    for (let k = 0; k < nCtl; k++) { const t = k / CR; while (mi + 1 < moods.length && t >= moods[mi + 1].t) mi++; const tg = MOODS[moods[mi].mood], tc = 1 - Math.exp(-1 / (CR * 1.4));
      for (let p = 0; p < RATIOS.length; p++) { cur.a[p] += (tg.a[p] - cur.a[p]) * tc; ctlA[p][k] = cur.a[p]; } cur.cut += (tg.cut - cur.cut) * tc; cur.lvl += (tg.lvl - cur.lvl) * tc; ctlCut[k] = cur.cut; ctlLvl[k] = cur.lvl; } }
  { const ph = RATIOS.map(() => [Math.random() * 0, 0.3, 0.6, 0.9]), lpL = { y: 0 }, lpR = { y: 0 }; const f0 = root;
    const fade = i => Math.min(1, i / (SR * 2.5)) * Math.min(1, (N - i) / (SR * 2.0));
    for (let i = 0; i < N; i++) {
      const k = i / SR * CR, k0 = Math.floor(k), fr = k - k0; let sl = 0, sr = 0;
      for (let p = 0; p < RATIOS.length; p++) { const a = ctlA[p][k0] * (1 - fr) + ctlA[p][k0 + 1] * fr; if (a < 0.002) continue; const f = f0 * RATIOS[p];
        ph[p][0] += TAU * f * 0.9965 / SR; ph[p][1] += TAU * f * 1.0035 / SR; sl += Math.sin(ph[p][0]) * a; sr += Math.sin(ph[p][1]) * a; if (p === 0) { sl += 0.35 * Math.sin(ph[p][0] * 2) * a; sr += 0.35 * Math.sin(ph[p][1] * 2) * a; } }
      const cut = ctlCut[k0] * (1 - fr) + ctlCut[k0 + 1] * fr, alpha = 1 - Math.exp(-TAU * cut / SR), lv = db(ctlLvl[k0] * (1 - fr) + ctlLvl[k0 + 1] * fr);
      const trem = 0.85 + 0.15 * Math.sin(TAU * 0.11 * i / SR);
      lpL.y += (sl - lpL.y) * alpha; lpR.y += (sr - lpR.y) * alpha; const g = lv * trem * fade(i) * 0.5;
      L[i] += lpL.y * g; R[i] += lpR.y * g; SL[i] += lpL.y * g * 0.25; SR_[i] += lpR.y * g * 0.25; } }

  // ---------- cue synth ----------
  const svf = () => ({ lp: 0, bp: 0 });
  function noiseBand(st, x, fc, q) { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); st.lp += f * st.bp; const hp = x - st.lp - st.bp / q; st.bp += f * hp; return st.bp; }
  (spec.cues || []).forEach((c, ci) => {
    const r = rng(ci * 7919 + 13), t0 = c.t + lead, lv = db(c.level === undefined ? -12 : c.level), pan = c.pan || 0, dur = c.dur || 1;
    const send = c.send === undefined ? 0.35 : c.send;
    switch (c.type) {
      case "impact": { const len = Math.floor(SR * (c.tail || 2.2)); let ph = 0; const st = svf(); for (let i = 0; i < len; i++) { const t = i / SR, f = 38 + 95 * Math.exp(-t * 9); ph += TAU * f / SR; let v = Math.sin(ph) * Math.exp(-t * 2.4) * 1.0 + Math.sin(ph * 2.01) * Math.exp(-t * 5) * 0.35;
          const n = (r() * 2 - 1); const nb = noiseBand(st, n, 700 + 600 * Math.exp(-t * 8), 0.9) * Math.exp(-t * 11) * 0.9; v += nb + (i < 90 ? (r() * 2 - 1) * 0.8 * (1 - i / 90) : 0); add(t0, i, v * lv, pan, send); } break; }
      case "crack": { const len = Math.floor(SR * 0.7); const st = svf(); let ph = 0; for (let i = 0; i < len; i++) { const t = i / SR; ph += TAU * (60 + 150 * Math.exp(-t * 25)) / SR; const n = r() * 2 - 1; const v = noiseBand(st, n, 2600 - 1500 * t, 0.7) * Math.exp(-t * 16) + Math.sin(ph) * Math.exp(-t * 9) * 0.8; add(t0, i, v * lv, pan, send * 0.8); } break; }
      case "whoosh": { const len = Math.floor(SR * (dur + 0.6)), a = c.f0 || 260, b = c.f1 || 2600, pa = c.panFrom ?? pan, pb = c.panTo ?? pan; const st = svf(); for (let i = 0; i < len; i++) { const u = clamp(i / (SR * dur), 0, 1), t = i / SR; const env = Math.pow(Math.sin(Math.PI * Math.min(1, t / (dur + 0.4))), 2) * (t < dur + 0.4 ? 1 : Math.exp(-(t - dur - 0.4) * 6)); const fc = a * Math.pow(b / a, u); const v = noiseBand(st, r() * 2 - 1, fc, 1.1) * env * 1.6; add(t0, i, v * lv, pa + (pb - pa) * u, send); } break; }
      case "riser": { const len = Math.floor(SR * dur); const st = svf(); let ph = 0; for (let i = 0; i < len; i++) { const u = i / len, env = Math.pow(u, 2.2); ph += TAU * (120 + 900 * u * u) / SR; const v = noiseBand(st, r() * 2 - 1, 300 + 5200 * u * u, 1.2) * env * 1.3 + Math.sin(ph) * env * 0.35; add(t0, i, v * lv, pan, send * 0.6); } break; }
      case "bell": { const f = c.freq || 880, len = Math.floor(SR * (c.tail || 3.5)); const P = [[1, 1, 1.0], [2.756, 0.45, 1.6], [5.404, 0.25, 2.4], [8.93, 0.12, 3.4]]; for (let i = 0; i < len; i++) { const t = i / SR; let v = 0; for (const p of P) v += Math.sin(TAU * f * p[0] * t) * p[1] * Math.exp(-t * (0.9 * p[2])); add(t0, i, v * lv * (i < 40 ? i / 40 : 1), pan, send * 1.3); } break; }
      case "pulse": { const f = c.freq || 330, len = Math.floor(SR * 1.4); for (let i = 0; i < len; i++) { const t = i / SR; const v = (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2 * t)) * Math.exp(-t * 4.2) * (i < 60 ? i / 60 : 1); add(t0, i, v * lv, pan, send * 1.1); } break; }
      case "heartbeat": { const bpm0 = c.bpm0 || 60, bpm1 = c.bpm1 || 110; let t = 0; while (t < dur) { const u = t / dur, bpm = bpm0 + (bpm1 - bpm0) * u, g = lv * (0.6 + 0.4 * u); for (const [dt, f, a] of [[0, 62, 1], [0.16, 52, 0.7]]) { const s0 = Math.floor((t0 + t + dt) * SR), len = Math.floor(SR * 0.28); let ph = 0; for (let i = 0; i < len; i++) { const tt = i / SR; ph += TAU * (f + 30 * Math.exp(-tt * 30)) / SR; add(0, s0 + i, Math.sin(ph) * Math.exp(-tt * 14) * a * g, 0, send * 0.4); } } t += 60 / bpm; } break; }
      case "sparkle": { const n = Math.floor(dur * (c.rate || 14)); for (let k = 0; k < n; k++) { const u = k / n, tt = (c.ramp ? Math.pow(u, 0.6) : u) * dur + r() * 0.05, f = 2400 + r() * 5200, len = Math.floor(SR * 0.09), pp = (r() * 2 - 1) * 0.8; for (let i = 0; i < len; i++) add(t0 + tt, i, Math.sin(TAU * f * i / SR) * Math.exp(-i / SR * 55) * lv * (0.3 + 0.7 * (c.ramp ? u : 1)), pp, send * 1.2); } break; }
      case "wind": { const len = Math.floor(SR * dur), st = svf(), fc0 = c.cf || 620; for (let i = 0; i < len; i++) { const t = i / SR, env = Math.min(1, t / 1.2) * Math.min(1, (dur - t) / 1.4), fc = fc0 * (1 + 0.35 * Math.sin(TAU * 0.17 * t) + 0.18 * Math.sin(TAU * 0.43 * t + 1)); const v = noiseBand(st, r() * 2 - 1, fc, 0.8) * env * (0.7 + 0.3 * Math.sin(TAU * 0.23 * t)); add(t0, i, v * lv * 1.4, (c.pan || 0) + 0.4 * Math.sin(TAU * 0.1 * t), send * 0.5); } break; }
      case "waves": { const len = Math.floor(SR * dur); let y1 = 0, y2 = 0; for (let i = 0; i < len; i++) { const t = i / SR, env = Math.min(1, t / 2) * Math.min(1, (dur - t) / 2), swell = 0.55 + 0.45 * Math.sin(TAU * 0.16 * t); const n = r() * 2 - 1; y1 += (n - y1) * 0.04; y2 += (y1 - y2) * 0.04; add(t0, i, y2 * 7 * swell * env * lv, 0.3 * Math.sin(TAU * 0.07 * t), send * 0.3); } break; }
      case "rumble": { const len = Math.floor(SR * (dur + 1.2)); let y1 = 0, ph = 0; for (let i = 0; i < len; i++) { const t = i / SR, env = Math.pow(Math.sin(Math.PI * Math.min(1, t / (dur + 1.2))), 1.6); y1 += ((r() * 2 - 1) - y1) * 0.025; ph += TAU * (46 + 8 * Math.sin(t * 1.3)) / SR; add(t0, i, (y1 * 9 + Math.sin(ph) * 0.8) * env * lv * 0.7, 0, send * 0.5); } break; }
    }
  });

  // ---------- reverb bus (Schroeder) ----------
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map(d => Math.round(d * SR / 44100)), aps = [225, 556].map(d => Math.round(d * SR / 44100));
  function reverb(src, off) { const out = new Float32Array(N), bufs = combs.map(d => new Float32Array(d + off)), pos = combs.map(() => 0), lp = combs.map(() => 0);
    for (let i = 0; i < N; i++) { let s = 0; const x = src[i]; for (let c = 0; c < combs.length; c++) { const b = bufs[c], p = pos[c], y = b[p]; lp[c] += (y - lp[c]) * 0.35; b[p] = x + lp[c] * 0.86; pos[c] = (p + 1) % b.length; s += y; } out[i] = s / combs.length; }
    for (const d of aps) { const b = new Float32Array(d + off), g = 0.5; let p = 0; for (let i = 0; i < N; i++) { const y = b[p], v = out[i]; const o = -v + y; b[p] = v + y * g; out[i] = o; p = (p + 1) % b.length; } } return out; }
  const wl = reverb(SL, 0), wr = reverb(SR_, 23); const wet = db(-4);
  for (let i = 0; i < N; i++) { L[i] += wl[i] * wet; R[i] += wr[i] * wet; }
  // ---------- authored silences: duck everything (bed, cues, reverb tails) to near zero so the next sound lands ----------
  for (const sl of spec.silences || []) { const a0 = (sl.t + lead) * SR, b0 = a0 + sl.dur * SR, f = (sl.fade || 0.25) * SR;
    for (let i = Math.max(0, Math.floor(a0 - f)); i < Math.min(N, Math.ceil(b0 + f)); i++) { const g = i < a0 ? 1 - (i - (a0 - f)) / f : i > b0 ? (i - b0) / f : 0, gg = Math.max(0.02, g); L[i] *= gg; R[i] *= gg; } }
  // ---------- master: soft clip, headroom ----------
  let pk = 0; for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 1.1) / 1.1; R[i] = Math.tanh(R[i] * 1.1) / 1.1; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
  const norm = pk > 0 ? db(-3) / pk : 1; for (let i = 0; i < N; i++) { L[i] *= norm; R[i] *= norm; }
  return { L, R, N, peak: pk * norm };
}
export function writeWav(path, L, R) { const N = L.length, buf = Buffer.alloc(44 + N * 4); buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(clamp(L[i], -1, 1) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(clamp(R[i], -1, 1) * 32767), 46 + i * 4); } fs.writeFileSync(path, buf); }
if (process.argv[1] && process.argv[1].endsWith("sound.mjs")) {
  const [cuesFile, dur, out] = process.argv.slice(2); const spec = JSON.parse(fs.readFileSync(cuesFile, "utf8")); const t0 = Date.now(); const r = synth(spec, Number(dur)); writeWav(out, r.L, r.R);
  console.log("sound.wav " + (r.N / SR).toFixed(1) + "s, peak " + (20 * Math.log10(r.peak)).toFixed(1) + " dBFS, " + (spec.cues || []).length + " cues, synthesized in " + ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
