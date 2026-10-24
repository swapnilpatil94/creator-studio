// Numbers spoken in the narration (Hindi words) -> digits, so the Director can only put numbers on screen that the narration actually says.
const U = { "शून्य": 0, "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5, "छह": 6, "छः": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10, "ग्यारह": 11, "बारह": 12, "तेरह": 13, "चौदह": 14, "पंद्रह": 15, "सोलह": 16, "सत्रह": 17, "अठारह": 18, "उन्नीस": 19, "बीस": 20, "तीस": 30, "चालीस": 40, "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80, "नब्बे": 90 };
const ONES = ["", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ"];
/** numbers found in a Hindi sentence: digits as written, and spoken forms like "उन्नीस सौ तीन" (1903), "सवा सौ" (125), "तीस के दशक" (30s), "चौदह" (14) */
export function numbersIn(text) {
  const out = new Set(); (text.match(/\d+/g) || []).forEach(n => out.add(+n));
  const w = text.replace(/[।,?!:;…"“”'’]/g, " ").split(/\s+/).filter(Boolean);
  for (let i = 0; i < w.length; i++) {
    if (w[i] === "सवा" && w[i + 1] === "सौ") out.add(125); if (w[i] === "डेढ़" && w[i + 1] === "सौ") out.add(150);
    if (w[i] in U) { const a = U[w[i]]; if (w[i + 1] === "सौ") { let v = a * 100; const b = w[i + 2]; if (b in U) v += U[b]; out.add(v); if (b in U && U[b] >= 20 && w[i + 3] in U && U[w[i + 3]] < 10) out.add(a * 100 + U[b] + U[w[i + 3]]); } else out.add(a); if (a < 10 && w[i - 1] in U && U[w[i - 1]] >= 20 && U[w[i - 1]] % 10 === 0) out.add(U[w[i - 1]] + a); }
  }
  return out;
}
export const digitsOnScreen = items => (items.join(" ").match(/\d+/g) || []).map(Number);
