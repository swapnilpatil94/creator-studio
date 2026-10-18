// Our links, one place (channels/kathaaya/links.json), formatted for each platform. YouTube links stay off Facebook/Instagram copy unless show_youtube_on_meta is true.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), L = JSON.parse(fs.readFileSync(path.join(root, "channels/kathaaya/links.json"), "utf8"));
export const links = L, logoPath = path.join(root, L.logo);
export function block(platform) {
  const yt = platform === "youtube" || platform === "web" || L.show_youtube_on_meta;
  const rows = [["📲 WhatsApp चैनल (हर कथा सबसे पहले)", L.whatsapp], ["🌐 वेबसाइट (स्रोत सहित पूरी कथा)", L.website], ...(platform === "instagram" ? [] : [["📸 Instagram " + L.instagram_handle, L.instagram]]), ...(platform === "facebook" ? [] : [["👍 Facebook पेज", L.facebook]]), ...(yt ? [["▶ YouTube " + L.youtube_handle, L.youtube]] : [])];
  return rows.map(([t, u]) => `${t}: ${u}`).join("\n");
}
export const footerText = platform => (platform === "youtube" ? "कथाया से जुड़ें:\n" : "") + block(platform);
