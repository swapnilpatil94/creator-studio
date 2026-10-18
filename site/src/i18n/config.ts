// Languages the site can serve. A language goes live automatically once it has at least one translated, published post.
// hi is the source language (served at /, no prefix); every other language lives under /<code>/.
export const DEFAULT_LANG = "hi";
export const LOCALES: Record<string, { name: string; english: string; bcp: string; og: string }> = {
  hi: { name: "हिन्दी", english: "Hindi", bcp: "hi-IN", og: "hi_IN" },
  en: { name: "English", english: "English", bcp: "en", og: "en_US" },
  mr: { name: "मराठी", english: "Marathi", bcp: "mr-IN", og: "mr_IN" },
  bn: { name: "বাংলা", english: "Bengali", bcp: "bn-IN", og: "bn_IN" },
  ta: { name: "தமிழ்", english: "Tamil", bcp: "ta-IN", og: "ta_IN" },
  te: { name: "తెలుగు", english: "Telugu", bcp: "te-IN", og: "te_IN" },
  gu: { name: "ગુજરાતી", english: "Gujarati", bcp: "gu-IN", og: "gu_IN" },
  es: { name: "Español", english: "Spanish", bcp: "es", og: "es_ES" },
  pt: { name: "Português", english: "Portuguese", bcp: "pt-BR", og: "pt_BR" },
  id: { name: "Bahasa Indonesia", english: "Indonesian", bcp: "id-ID", og: "id_ID" },
};
export const LANGS = Object.keys(LOCALES);
export const isLang = (s?: string): s is string => !!s && s in LOCALES;
export const langPath = (lang: string, p: string) => (lang === DEFAULT_LANG ? p : `/${lang}${p}`);
