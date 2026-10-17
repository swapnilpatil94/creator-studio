# Thumbnail brief: Durga's birth, long film (16:9) (written under `kathaaya-thumbnail-director`)

## 1. Story diagnosis
- **Central mystery:** after a hundred years of defeat the gods have nothing left, so where does the goddess who beats Mahishasura come from?
- **Strongest single moment for a long film:** the goddess's face as she first opens her eyes in the gods' gathered light, with the cost of the defeat (the number) beside her. The Short already uses gods -> light -> goddess; this thumbnail must not repeat that composition.
- **Audience knows:** Durga kills Mahishasura. **Wants to learn:** how she came to be and what the gods did to make her.

## 2. Three concepts
- **A Mystery:** a huge cracked crimson-gold numeral "100" with the goddess's eyes opening inside the crack.
- **B Emotion:** extreme close-up of the goddess's eyes in radiant gold, defeated gods tiny and kneeling beneath her chin.
- **C Conflict:** Mahishasura's horned shadow filling the sky over broken divine weapons, the goddess's silhouette rising in a point of light below.

## 3. Final selection
**A**, with B's eyes. A concrete number is a standard curiosity device (`titles-and-thumbnails`), it is faithful to the script's hook ("सौ साल की हार के बाद"). This is design judgment, not proven performance (no outlier data in our set tests numeric thumbnails). C overlaps with the Short.

## 4. Headline
**"१०० साल की हार"** (3 words, "१००" huge in antique gold, "साल की हार" in crimson-edged white) + ONE support line: **"फिर जन्मी दुर्गा"**.

## 5. Title pairing (complementary, does not repeat the thumbnail)
**देवता सब हार गए, तब क्या हुआ? दुर्गा के जन्म की पूरी कथा | देवी महात्म्य | KATHAAYA** (answers "what happens after the 100 years", names the source). The video's first spoken line restates the question ("सौ साल की हार के बाद दुर्गा का जन्म कैसे हुआ?"), which confirms the click.

## 6. Final image prompt (for the owner's image tool)
> Horizontal 16:9 YouTube thumbnail artwork, 1920x1080, in the KATHAAYA style: cinematic Indian ink storytelling on warm aged parchment with visible manuscript texture and subtle grain; expressive hand-drawn black ink brushwork; restrained crimson and antique gold; dramatic chiaroscuro and divine illumination; layered 2.5D depth.
> Moment: the goddess Durga's eyes opening in radiant gold light. Right half: her face and crown, close-up, calm and fierce, eyes toward the viewer, ornate gold crown, three of her many arms raised behind her holding a trident, a discus and a sword (traditionally correct attributes, no lion in this frame), light streaming into her from many small points around the frame. Left half: a huge numeral "१००" in antique gold, cracked as if broken, with fine ink-hatched shadow; beneath it a handful of tiny kneeling defeated gods in the dark.
> Hierarchy: 1 the goddess's eyes and face; 2 the cracked "१००"; 3 text. Brightest light on her eyes. Keep the face and the headline out of the bottom-right corner (YouTube duration badge) and the extreme edges.
> Text (exact Devanagari, thick brush lettering, high contrast, readable at 120 px wide): headline "१०० साल की हार" on the left, with "१००" the largest element; one small support line "फिर जन्मी दुर्गा" under it. No other text.
> Exclude: extra limbs beyond the intended arms, malformed hands, wrong sacred attributes, gibberish lettering, duplicate faces, random English text, watermarks, signatures, logos, frames, photorealism, glossy 3D, neon colours, clutter, gore, a dead body.

## 7. Final thumbnail
Not yet supplied. Generate from the prompt above, save as `assets/thumbnail/durga-long-art.webp` (16:9, 1920x1080 or larger), then `node tools/thumbnail.mjs stories/durga-janm-katha --external assets/thumbnail/durga-long-art.webp`. Until then the dashboard shows the publish package with the thumbnail check unresolved, and nothing uploads.

## 8. QC checklist (run on the owner's art)
Devanagari correct (especially "१००" and "जन्मी") / brand look / 120 px test (numeral and eyes survive) / nothing in the bottom-right 15% / one support line only / goddess iconography correct / no gore / no stray generator marks / differs from the Short's thumbnail.

## 9. Testing recommendation
Long-form supports YouTube's Test & compare (3 thumbnails). Upload this concept A plus two others (B eyes-only without the numeral; C Mahishasura shadow) once the channel's analytics allow, and let the data choose.
