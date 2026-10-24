import { piece, enter, f, esc } from "./_kit.mjs";
export default {
  name: "MapFlight", archetypes: ["place", "date_era", "evidence_reveal"], slot: "full", styles: ["mapflight"],
  when_to_use: "Map flight: a globe spins to the place, zooms through country to the spot, and drops a pin with coordinates (d3-geo + Natural Earth outlines, drawn per frame). Give the place name, lat/lon and the country name as in Natural Earth.",
  schema: { type: "object", properties: { place: { type: "string", maxLength: 24 }, lat: { type: "number" }, lon: { type: "number" }, country: { type: "string" }, from: { type: "array", items: { type: "number" } } }, required: ["place", "lat", "lon"] },
  demo: { archetype: "place", component: "MapFlight", on_screen: ["रूपकुंड झील", "उत्तराखंड, भारत"], map: { lat: 30.26, lon: 79.73, country: "India" } },
  defaultY: 250,
  async render(ctx) {
    const { place, sub, lat, lon, country, from = [10, 20] } = ctx.props, p = ctx.theme.palette, S = 780, y = 400, t0 = ctx.first ? 0 : ctx.t0, d = Math.max(2.4, ctx.seconds - 0.2), pts = (v, a, b) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? a : b}`;
    const html = piece(ctx, { id: "mp", x: 150, y, w: S, h: S, z: 4, boil: 0, inner: `<canvas id="${ctx.id}-cv" width="${S}" height="${S}" style="display:block;border-radius:50%/50%;"></canvas>` })
      + piece(ctx, { id: "mpl", x: 90, y: 170, w: 900, h: 220, z: 8, boil: 0.6, inner: `<div style="width:900px;padding:22px 32px;background:${p.ivory};border:6px solid ${p.night};box-shadow:10px 12px 0 ${ctx.theme.shadow};transform:rotate(-1deg)"><div style="font:700 96px/1 ${f(ctx, "headline")};color:${p.maroon}">${esc(place)}</div><div style="font:500 34px/1.4 'IBM Plex Mono';color:#5a4426;margin-top:8px">${esc(sub || "")} &nbsp; ${pts(lat, "N", "S")} ${pts(lon, "E", "W")}</div></div>` });
    const js = enter(ctx, `#${ctx.id}-mp`, { scale: 0.7 }, { scale: 1 }, { dur: 0.45 }) + enter(ctx, `#${ctx.id}-mpl`, { y: -80 }, { y: 0 }, { dur: 0.45, delay: Math.max(1.4, d * 0.7) });
    return { html, js, bottom: y + S, maps: [{ id: `${ctx.id}-cv`, t0, t1: +(t0 + d).toFixed(3), lon0: from[1], lat0: from[0], lon1: lon, lat1: lat, r0: 360, r1: country ? 3800 : 9000, hi: country || "", size: S, ocean: p.indigo, land: p.ivory, hiCol: p.saffron, line: p.night, pin: p.stamp }] };
  },
  parse: beat => ({ props: { place: (beat.on_screen || [])[0] || "", sub: (beat.on_screen || [])[1] || "", lat: beat.map?.lat ?? 0, lon: beat.map?.lon ?? 0, country: beat.map?.country, from: beat.map?.from }, headline: [] }),
};
