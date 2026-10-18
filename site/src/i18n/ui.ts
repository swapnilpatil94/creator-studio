// Interface strings. hi and en are written by hand; every other language is generated from the English strings by tools/content/translate.mjs --ui (files in i18n/gen/<lang>.json) and falls back to English when missing.
const hi = {
  siteName: "कथाया", tagline: "भारतीय कथाएँ, स्रोत के साथ", home: "मुख्य पृष्ठ", about: "हमारे बारे में", policy: "संपादकीय नीति", corrections: "सुधार", privacy: "गोपनीयता", contact: "संपर्क",
  heroKicker: "THE STORY OF EVERY KATHA, WITH ITS SOURCE", heroTitle: "हर कथा, उसके स्रोत के साथ", heroLead: "वो हिस्से जो धारावाहिक छोड़ देते हैं: ग्रंथ में क्या लिखा है, और परंपराएँ कहाँ अलग कहती हैं।",
  readLatest: "ताज़ा कथाएँ पढ़िए", howWeWrite: "हम कैसे लिखते हैं", latest: "ताज़ा कथाएँ", firstSoon: "पहली कथा जल्द ही यहाँ आएगी।", topics: "विषय", sectionSoon: "इस विषय की कथाएँ जल्द आएँगी।",
  indexTitle: "कथाया: भारतीय कथाएँ, स्रोत के साथ", indexDesc: "महाभारत, रामायण और पुराणों की कथाएँ, हर लेख में स्रोत और भिन्न मतों के साथ। चित्र, इन्फोग्राफ़िक, वीडियो और प्रश्नोत्तरी।",
  minRead: "मिनट पढ़ें", min: "मिनट", updated: "अद्यतन", aiArtCaption: "चित्र: AI-निर्मित", sources: "स्रोत और विधि · SOURCES", aiNote: "यह लेख AI की सहायता से लिखा गया और प्रकाशन से पहले स्रोत-पाठ से मिलाया गया।", spotMistake: "गलती दिखे तो", tellUs: "हमें बताइए", share: "साझा कीजिए:", readMore: "और पढ़िए",
  skip: "मुख्य सामग्री पर जाएँ", footerAbout: "भारतीय कथाएँ, स्रोत के साथ। हर लेख में बताया जाता है कि कथा किस ग्रंथ से आई और परंपराएँ कहाँ अलग हैं।", transparency: "पारदर्शिता", footerLegal: "© KATHAAYA · सामग्री AI की सहायता से तैयार और मानवीय समीक्षा के बाद प्रकाशित · चित्र जहाँ AI-निर्मित हैं, वहाँ लिखा गया है",
  machineNote: "यह अनुवाद AI से किया गया है। मूल हिंदी लेख:", original: "मूल लेख", language: "भाषा", mythologyWorld: "विश्व पुराकथाएँ",
  glance: "एक नज़र में · AT A GLANCE", sequence: "कथा का क्रम · THE SEQUENCE", quiz: "प्रश्नोत्तरी · QUIZ", pickAnswer: "उत्तर चुनिए", right: "✓ सही! ", wrong: "✗ सही उत्तर ऊपर हरे रंग में है। ", video: "वीडियो",
  consentTitle: "कुकी की अनुमति", consentText: "हम समझने के लिए गुमनाम आँकड़े और (अनुमति पर) विज्ञापन इस्तेमाल करते हैं कि कौन-सी कथाएँ पढ़ी जाती हैं।", consentAccept: "ठीक है", consentDecline: "मना करें",
  itihasa: "इतिहास", itihasaBlurb: "महाभारत और रामायण की कथाएँ, स्रोत के साथ", puranas: "पुराण", puranasBlurb: "देवी-देवताओं की कथाएँ और उनके भिन्न मत", vratTyohar: "व्रत और त्योहार", vratTyoharBlurb: "तिथि, पर्व और परंपरा का अर्थ", world: "विश्व पुराकथाएँ", worldBlurb: "यूनानी, नॉर्स, मिस्री और अन्य पुराकथाएँ, स्रोत के साथ",
};
export type UiKey = keyof typeof hi;
const en: Record<UiKey, string> = {
  siteName: "KATHAAYA", tagline: "Indian mythology, with sources", home: "Home", about: "About us", policy: "Editorial policy", corrections: "Corrections", privacy: "Privacy", contact: "Contact",
  heroKicker: "THE STORY OF EVERY KATHA, WITH ITS SOURCE", heroTitle: "Every story, with its source", heroLead: "The parts the TV serials leave out: what the text actually says, and where traditions differ.",
  readLatest: "Read the latest stories", howWeWrite: "How we write", latest: "Latest stories", firstSoon: "The first story is coming soon.", topics: "Topics", sectionSoon: "Stories for this topic are coming soon.",
  indexTitle: "KATHAAYA: Indian mythology, with sources", indexDesc: "Stories from the Mahabharata, Ramayana and Puranas, every article with its sources and differing traditions. Images, infographics, video and quizzes.",
  minRead: "min read", min: "min", updated: "Updated", aiArtCaption: "Image: AI-generated", sources: "SOURCES AND METHOD", aiNote: "This article was written with AI assistance and checked against the source text before publication.", spotMistake: "Spotted a mistake?", tellUs: "Tell us", share: "Share:", readMore: "Read more",
  skip: "Skip to main content", footerAbout: "Indian mythology, with sources. Every article says which text a story comes from and where traditions differ.", transparency: "Transparency", footerLegal: "© KATHAAYA · content prepared with AI assistance and published after human review · AI-generated images are labelled",
  machineNote: "This translation was made by AI.", original: "Read the original Hindi article", language: "Language", mythologyWorld: "World mythology",
  glance: "AT A GLANCE", sequence: "THE SEQUENCE", quiz: "QUIZ", pickAnswer: "Choose an answer", right: "✓ Correct! ", wrong: "✗ The right answer is shown above in green. ", video: "Video",
  consentTitle: "Cookie consent", consentText: "We use anonymous statistics and, with your permission, ads, to learn which stories people read.", consentAccept: "Accept", consentDecline: "Decline",
  itihasa: "Itihasa", itihasaBlurb: "Stories of the Mahabharata and Ramayana, with sources", puranas: "Puranas", puranasBlurb: "Stories of the gods and their differing traditions", vratTyohar: "Vrat & Tyohar", vratTyoharBlurb: "Tithis, festivals and the meaning of tradition", world: "World mythology", worldBlurb: "Greek, Norse, Egyptian and other mythologies, with sources",
};
const gen = import.meta.glob("./gen/*.json", { eager: true, import: "default" }) as Record<string, Partial<Record<UiKey, string>>>;
export function useT(lang: string) { const g = gen[`./gen/${lang}.json`] || {}; const base = lang === "hi" ? hi : { ...en, ...g }; return (k: UiKey) => base[k] ?? en[k]; }
export const UI_EN = en;

export const langOf = (pathname: string) => { const h = pathname.split("/")[1]; return /^[a-z]{2}$/.test(h) && h !== "hi" ? h : "hi"; };
