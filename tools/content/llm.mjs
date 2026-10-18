// The studio's own writer: Anthropic API if ANTHROPIC_API_KEY is set (WRITER_MODEL), else the local Ollama model (OLLAMA_MODEL). Used by autopilot; nothing here is typed by hand.
export const writerName = () => process.env.ANTHROPIC_API_KEY ? "anthropic:" + (process.env.WRITER_MODEL || "claude-sonnet-5-5") : "ollama:" + (process.env.OLLAMA_MODEL || "qwen3:14b");
export async function ask(system, prompt, { temperature = 0.5, json = false } = {}) {
  if (process.env.ANTHROPIC_API_KEY) { const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: process.env.WRITER_MODEL || "claude-sonnet-5-5", max_tokens: 4000, temperature, system, messages: [{ role: "user", content: prompt }] }) }); if (!r.ok) throw new Error("anthropic " + r.status + " " + (await r.text()).slice(0, 200)); return (await r.json()).content[0].text; }
  return ollamaStream({ system: system || "", prompt, temperature, json }); }
export async function ollamaStream({ system, prompt, temperature = 0.4, json = false }) {
  // streamed on purpose: a non-streamed local generation takes 5-10 minutes and Node's fetch drops the connection after 5 (UND_ERR_HEADERS_TIMEOUT)
  const r = await fetch((process.env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/chat", { method: "POST", body: JSON.stringify({ model: process.env.OLLAMA_MODEL || "qwen3:14b", stream: true, think: false, ...(json ? { format: "json" } : {}), options: { temperature, num_ctx: 8192 }, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }) });
  if (!r.ok) throw new Error("ollama " + r.status + " (is `ollama serve` running?)"); let buf = "", text = "";
  for await (const chunk of r.body) { buf += Buffer.from(chunk).toString("utf8"); const lines = buf.split("\n"); buf = lines.pop(); for (const l of lines) if (l.trim()) { const j = JSON.parse(l); if (j.error) throw new Error("ollama: " + j.error); text += j.message?.content || ""; } }
  return text; }
