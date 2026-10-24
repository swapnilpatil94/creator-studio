// A template = the whole dark-psychology "kit" in one choice: theme (palette, fonts, cut-out art style, music) + style (layout, backgrounds, transitions, overlays) + when to use it.
// The Hub tab and `reel make --template` pick one; the Director only has to write the story.
export const TEMPLATES = {
  specimen:     { label: "Specimen file", theme: "darkpsych",    style: "specimen",     feel: "Someone arranged your choices: museum-exhibit objects taped on aged paper.", best_for: "Habits, defaults, how an ordinary custom was manufactured", colours: "kraft brown, ash, blood-red tint, pale paper; amber evidence; engraved cut-outs" },
  caseboard:    { label: "Case board",    theme: "caseboard",    style: "caseboard",    feel: "An investigation wall: polaroid photos, red thread, case numbers.", best_for: "Connections: who benefits, how pieces link, who arranged it", colours: "dark cork, polaroid cream, thread red; grainy black-and-white photos" },
  surveillance: { label: "Surveillance log", theme: "surveillance", style: "surveillance", feel: "You are being watched: CCTV frames, camera numbers, timecodes.", best_for: "Feeds, notifications, tracking, attention capture", colours: "black, phosphor grey-green, amber timecode, red REC; grainy CCTV stills" },
  clinical:     { label: "Clinical experiment", theme: "clinical", style: "clinical",     feel: "Cold and factual: a lab page with subject numbers and figures.", best_for: "Documented studies and experiments about behaviour", colours: "slate, clinical white, teal, red flags; blue-grey line diagrams" },
  noir:         { label: "Price-tag noir", theme: "noir",        style: "noir",         feel: "The shop as a stage: black and gold, item numbers, bait.", best_for: "Pricing, anchoring, subscriptions, free offers", colours: "black, gold, velvet red, cream; high-contrast price-tag graphics" },
};
export const templateNames = Object.keys(TEMPLATES);
