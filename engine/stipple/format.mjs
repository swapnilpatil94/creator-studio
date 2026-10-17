// .stip binary format shared by the Node tools and the browser engine. Little-endian. [u32 headerLen][header JSON][padding to 4][arrays...]
// header: { n, w, h, aspect, arrays: [{name, type, comps, offset}], meta }. Positions are normalised: x in [-aspect/2, aspect/2], y in [-0.5, 0.5] (y up), image height = 1 world unit.
export const TYPES = { f32: Float32Array, u8: Uint8Array };
export function pack(n, arrays, meta = {}) {
  const hdr = { n, arrays: [], meta }; let off = 0;
  for (const [name, type, comps, data] of arrays) { off = Math.ceil(off / 4) * 4; hdr.arrays.push({ name, type, comps, offset: off }); off += data.byteLength; }
  let hj = JSON.stringify(hdr); while ((4 + hj.length) % 4) hj += " "; const buf = new Uint8Array(4 + hj.length + off), dv = new DataView(buf.buffer); dv.setUint32(0, hj.length, true); buf.set(new TextEncoder().encode(hj), 4);
  const base = 4 + hj.length; arrays.forEach(([name, type, comps, data], i) => { buf.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), base + hdr.arrays[i].offset); }); return buf;
}
export function unpack(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), hl = dv.getUint32(0, true), hdr = JSON.parse(new TextDecoder().decode(u8.subarray(4, 4 + hl))), base = 4 + hl, out = { n: hdr.n, meta: hdr.meta };
  for (const a of hdr.arrays) { const T = TYPES[a.type], len = hdr.n * a.comps, bytes = new Uint8Array(len * T.BYTES_PER_ELEMENT); bytes.set(u8.subarray(u8.byteOffset ? base + a.offset : base + a.offset, base + a.offset + bytes.length)); out[a.name] = new T(bytes.buffer); } return out;
}
