#!/usr/bin/env node
/**
 * Global Mythology Topic Engine for KATHAAYA.
 * Uses public YouTube Data API evidence; it does not claim to predict virality.
 * Required env: YOUTUBE_API_KEY. Optional env: TARGET_MONTH=YYYY-MM.
 */
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) {
  console.error("Missing YOUTUBE_API_KEY. Add it as a repository Actions secret.");
  process.exit(1);
}
const targetMonth = process.env.TARGET_MONTH || new Date().toISOString().slice(0, 7);
if (!/^\d{4}-\d{2}$/.test(targetMonth) || Number(targetMonth.slice(5)) < 1 || Number(targetMonth.slice(5)) > 12) {
  throw new Error("TARGET_MONTH must use YYYY-MM format");
}
const DAY = 86400000;
const now = Date.now();
const publishedAfter = new Date(now - 180 * DAY).toISOString();
const seeds = [
  {topic:"Gilgamesh and the fear of death", tradition:"Mesopotamian", queries:["Epic of Gilgamesh death of Enkidu Hindi","Gilgamesh immortality story explained","गिलगमेश अमरता की कहानी"]},
  {topic:"Inanna's descent to the underworld", tradition:"Mesopotamian", queries:["Inanna descent underworld myth explained","Inanna underworld mythology story"]},
  {topic:"Ishtar and the gates of the underworld", tradition:"Mesopotamian", queries:["Ishtar seven gates underworld myth","Ishtar underworld story mythology"]},
  {topic:"Sisyphus and the endless punishment", tradition:"Greek", queries:["Sisyphus myth explained","Sisyphus Greek mythology story Hindi"]},
  {topic:"Orpheus turns back for Eurydice", tradition:"Greek", queries:["Orpheus Eurydice myth explained","Orpheus looks back Eurydice mythology"]},
  {topic:"Icarus ignores the warning", tradition:"Greek", queries:["Icarus myth explained hubris","Icarus Daedalus mythology story"]},
  {topic:"Medusa beyond the monster myth", tradition:"Greek", queries:["Medusa original myth explained","Medusa mythology story Hindi"]},
  {topic:"Prometheus steals fire for humanity", tradition:"Greek", queries:["Prometheus steals fire myth explained","Prometheus Greek mythology story"]},
  {topic:"Odin sacrifices for wisdom and runes", tradition:"Norse", queries:["Odin hangs Yggdrasil runes myth","Odin sacrifice wisdom Norse mythology"]},
  {topic:"Fenrir and the price of fear", tradition:"Norse", queries:["Fenrir wolf Norse myth explained","Fenrir binding prophecy mythology"]},
  {topic:"Ragnarok and the fate of the gods", tradition:"Norse", queries:["Ragnarok Norse mythology explained","Ragnarok story mythology Hindi"]},
  {topic:"Izanagi enters the land of the dead", tradition:"Japanese", queries:["Izanagi Izanami Yomi myth explained","Japanese mythology Izanagi underworld"]},
  {topic:"Amaterasu hides from the world", tradition:"Japanese", queries:["Amaterasu cave myth explained","Japanese sun goddess cave mythology"]},
  {topic:"Susanoo and the eight-headed serpent", tradition:"Japanese", queries:["Susanoo Yamata no Orochi myth","Japanese mythology eight headed serpent"]},
  {topic:"Osiris, Isis and the broken kingdom", tradition:"Egyptian", queries:["Osiris Isis myth explained","Osiris Egyptian mythology story"]},
  {topic:"Ra's nightly journey through the underworld", tradition:"Egyptian", queries:["Ra journey underworld Egyptian myth","Egyptian mythology Ra night journey"]},
  {topic:"Anansi wins stories from the sky god", tradition:"West African", queries:["Anansi stories sky god myth","Anansi spider mythology story"]},
  {topic:"Maya Hero Twins enter Xibalba", tradition:"Maya", queries:["Maya Hero Twins Xibalba Popol Vuh explained","Popol Vuh Hero Twins mythology story"]},
  {topic:"Quetzalcoatl and the bones of humanity", tradition:"Aztec", queries:["Quetzalcoatl bones of humanity myth","Aztec creation myth Quetzalcoatl explained"]},
  {topic:"Maui slows the sun", tradition:"Polynesian", queries:["Maui slows the sun mythology","Maui sun myth explained Polynesian"]},
  {topic:"The Rainbow Serpent and creation", tradition:"Aboriginal Australian", queries:["Rainbow Serpent creation story Indigenous Australian mythology","Rainbow Serpent myth explained"]},
  {topic:"The Monkey King challenges heaven", tradition:"Chinese", queries:["Sun Wukong havoc in heaven mythology","Journey to the West Monkey King story explained"]},
  {topic:"Nuwa repairs the broken sky", tradition:"Chinese", queries:["Nuwa repairs the sky Chinese mythology","Nüwa creation myth explained"]},
  {topic:"Karna's loyalty and the cost of belonging", tradition:"Indian", queries:["Karna loyalty Mahabharata story Hindi","कर्ण दान और निष्ठा महाभारत कथा"]},
  {topic:"Ekalavya and the price of exclusion", tradition:"Indian", queries:["Ekalavya story Mahabharata Hindi","एकलव्य गुरु दक्षिणा कथा"]},
  {topic:"Bhishma's vow and lifelong consequences", tradition:"Indian", queries:["Bhishma pratigya Mahabharata story Hindi","भीष्म प्रतिज्ञा कथा"]},
  {topic:"Ravana's knowledge and fatal pride", tradition:"Indian", queries:["Ravana ego downfall mythology Hindi","रावण अहंकार कथा रामायण"]},
  {topic:"Savitri challenges death for love", tradition:"Indian", queries:["Savitri Satyavan Yama story Hindi","सावित्री सत्यवान यमराज कथा"]},
  {topic:"The churning of the ocean and its hidden cost", tradition:"Indian", queries:["Samudra Manthan story Hindi","समुद्र मंथन अमृत हलाहल कथा"]},
  {topic:"Arjuna's paralysis before the great war", tradition:"Indian", queries:["Arjuna dilemma Bhagavad Gita Hindi story","अर्जुन मोह गीता कथा"]}
];
const exclusions = /official trailer|movie scene|film scene|full movie|gameplay|gaming|reaction video|podcast highlights|status video|whatsapp status|lyrics|lofi|remix|fan edit/i;
const cache = new Map();
let quotaEstimate = 0;
async function api(endpoint, params, cost) {
  const url = new URL("https://www.googleapis.com/youtube/v3/" + endpoint);
  Object.entries({...params, key: KEY}).forEach(([k,v]) => url.searchParams.set(k, String(v)));
  const response = await fetch(url);
  quotaEstimate += cost;
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || endpoint + " HTTP " + response.status);
  return data;
}
const median = (arr) => {
  const a = arr.filter(Number.isFinite).sort((x,y)=>x-y);
  if (!a.length) return 0;
  const mid = Math.floor(a.length/2);
  return a.length%2 ? a[mid] : (a[mid-1]+a[mid])/2;
};
const durationSeconds = (iso) => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "") || [];
  return (+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0);
};
async function searchSeed(seed) {
  const ids = new Map();
  // One search call per story keeps this 30-topic run below the default daily quota.
  // Additional aliases are preserved in the report for manual follow-up, not queried automatically.
  const q = seed.queries[0];
  const data = await api("search", {part:"snippet", type:"video", q, maxResults:10, order:"relevance", publishedAfter, regionCode:"IN", relevanceLanguage:"hi", safeSearch:"moderate"}, 100);
  for (const item of data.items || []) {
    const id = item.id?.videoId;
    if (id) ids.set(id, {query:q, title:item.snippet?.title || "", channelId:item.snippet?.channelId || "", channel:item.snippet?.channelTitle || ""});
  }
  const all = [...ids.keys()];
  const videos = [];
  for (let i=0;i<all.length;i+=50) {
    const d = await api("videos", {part:"snippet,statistics,contentDetails", id:all.slice(i,i+50).join(",")}, 1);
    videos.push(...(d.items||[]));
  }
  return videos.map(v => {
    const d = durationSeconds(v.contentDetails?.duration);
    const views = Number(v.statistics?.viewCount || 0);
    const likes = Number(v.statistics?.likeCount || 0);
    const comments = Number(v.statistics?.commentCount || 0);
    const ageDays = Math.max(1,(now-Date.parse(v.snippet.publishedAt))/DAY);
    const source = ids.get(v.id);
    return {id:v.id,url:"https://www.youtube.com/watch?v="+v.id,title:v.snippet.title,channel:v.snippet.channelTitle,channelId:v.snippet.channelId,publishedAt:v.snippet.publishedAt,ageDays:Math.round(ageDays*10)/10,durationSeconds:d,format:d<=180?"short":"long",views,viewsPerDay:Math.round(views/ageDays),likes,comments,engagementRate:views?Number(((likes+comments)/views).toFixed(4)):0,query:source.query,excluded:exclusions.test(v.snippet.title)};
  });
}
async function getChannelBaseline(channelId) {
  if (cache.has(channelId)) return cache.get(channelId);
  let result = {shortMedian:0,longMedian:0,shortN:0,longN:0};
  try {
    const channel = await api("channels",{part:"contentDetails,statistics",id:channelId},1);
    const uploads = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (uploads) {
      const playlist = await api("playlistItems",{part:"contentDetails",playlistId:uploads,maxResults:20},1);
      const ids = (playlist.items||[]).map(x=>x.contentDetails?.videoId).filter(Boolean);
      if (ids.length) {
        const data = await api("videos",{part:"snippet,statistics,contentDetails",id:ids.join(",")},1);
        const rows = data.items||[];
        const short = rows.filter(v=>durationSeconds(v.contentDetails?.duration)<=180 && (now-Date.parse(v.snippet.publishedAt))/DAY>=3).map(v=>Number(v.statistics?.viewCount||0));
        const long = rows.filter(v=>durationSeconds(v.contentDetails?.duration)>180 && (now-Date.parse(v.snippet.publishedAt))/DAY>=3).map(v=>Number(v.statistics?.viewCount||0));
        result={shortMedian:median(short),longMedian:median(long),shortN:short.length,longN:long.length};
      }
    }
  } catch (error) {
    console.warn("Baseline unavailable for channel",channelId,error.message);
  }
  cache.set(channelId,result);
  return result;
}
const evidenceByTopic = [];
for (const seed of seeds) {
  console.log("Researching:",seed.topic);
  const videos = await searchSeed(seed);
  const usable = videos.filter(v=>!v.excluded && v.views>0 && v.ageDays>=2);
  const scored = [];
  for (const v of usable) {
    const baseline = await getChannelBaseline(v.channelId);
    const baseMedian = v.format==="short"?baseline.shortMedian:baseline.longMedian;
    const baseN = v.format==="short"?baseline.shortN:baseline.longN;
    const outlierRatio = baseN>=5 && baseMedian>0 ? v.views/baseMedian : null;
    scored.push({...v,channelMedianSameFormat:baseMedian,baselineN:baseN,outlierRatio:outlierRatio===null?null:Number(outlierRatio.toFixed(2))});
  }
  const qualified = scored.filter(v=>v.ageDays>=3 && v.views>=1000);
  const outliers = qualified.filter(v=>v.outlierRatio!==null && v.outlierRatio>=2);
  const best = [...qualified].sort((a,b)=>((b.outlierRatio||0)*0.5 + Math.log1p(b.viewsPerDay)*0.35 + Math.log1p(b.engagementRate*1000)*0.15)-((a.outlierRatio||0)*0.5 + Math.log1p(a.viewsPerDay)*0.35 + Math.log1p(a.engagementRate*1000)*0.15)).slice(0,8);
  const creatorCount = new Set(outliers.map(v=>v.channelId)).size;
  const medianViewsPerDay = median(qualified.map(v=>v.viewsPerDay));
  const medianOutlier = median(outliers.map(v=>v.outlierRatio).filter(Number.isFinite));
  const evidenceScore = Math.min(100,Math.round((Math.min(creatorCount,4)*12)+(Math.min(outliers.length,5)*8)+(Math.min(Math.log10(medianViewsPerDay+1),5)*5)+(Math.min(medianOutlier||0,5)*4)));
  const confidence = outliers.length>=3 && creatorCount>=2 ? "stronger evidence" : outliers.length>=1 ? "limited evidence" : "insufficient outlier evidence";
  evidenceByTopic.push({...seed, evidenceScore,confidence,resultsFound:videos.length,usableResults:qualified.length,outlierCount:outliers.length,independentOutlierCreators:creatorCount,medianViewsPerDay:Math.round(medianViewsPerDay),medianOutlierRatio:medianOutlier?Number(medianOutlier.toFixed(2)):null,evidence:best.slice(0,5),allOutliers:outliers.slice(0,8)});
}
evidenceByTopic.sort((a,b)=>b.evidenceScore-a.evidenceScore);
const [year,month] = targetMonth.split("-").map(Number);
const daysInMonth = new Date(Date.UTC(year,month,0)).getUTCDate();

// Calendar-aware planning: fixed dates, year-specific festival dates, and lunar/regional
// events whose dates must be resolved before scheduling. Never silently guess a lunar date.
const calendarPath = path.join("planner","global-cultural-calendar.json");
const culturalCalendar = JSON.parse(fs.readFileSync(calendarPath,"utf8"));
const monthStart = new Date(Date.UTC(year,month-1,1));
const monthEnd = new Date(Date.UTC(year,month,0));
const calendarOpportunities = culturalCalendar.events.map(event => {
  let eventDate = null;
  let dateStatus = "date requires local/year-specific verification";
  if (event.date && event.date.startsWith(String(year)+"-")) {
    eventDate = event.date;
    dateStatus = event.dateType === "year-specific-verify" ? "year-specific date; verify locally" : "year-specific date";
  } else if (event.monthDay && ["fixed-annual","approximate-annual"].includes(event.dateType)) {
    eventDate = String(year)+"-"+event.monthDay;
    dateStatus = event.dateType === "approximate-annual" ? "approximate annual date; verify exact date/time" : "recurring civil date";
  } else if (event.dateType === "year-specific" || event.dateType === "year-specific-verify") {
    return null; // Do not reuse a date from another year.
  }
  const plannedPublishDate = eventDate
    ? new Date(Date.parse(eventDate+"T12:00:00Z")-Number(event.leadDays||10)*DAY).toISOString().slice(0,10)
    : null;
  const eventAtOrNearTargetMonth = eventDate
    ? (eventDate >= monthStart.toISOString().slice(0,10) && eventDate <= monthEnd.toISOString().slice(0,10))
      || (plannedPublishDate >= monthStart.toISOString().slice(0,10) && plannedPublishDate <= monthEnd.toISOString().slice(0,10))
    : true;
  return {...event,eventDate,dateStatus,plannedPublishDate,calendarWindowRelevant:eventAtOrNearTargetMonth,
    action: eventDate ? (plannedPublishDate < new Date().toISOString().slice(0,10) ? "lead window has passed; publish only if still timely" : "schedule before the event") : "resolve local date, then calculate lead time"};
}).filter(Boolean).sort((a,b) => {
  const ad=a.plannedPublishDate||a.date||"9999-12-31";
  const bd=b.plannedPublishDate||b.date||"9999-12-31";
  return ad.localeCompare(bd);
});
const dayNames = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const chosen = [];
const traditionCount = {};
for (const t of evidenceByTopic) {
  if (chosen.length>=daysInMonth) break;
  if (chosen.filter(x=>x.tradition===t.tradition).length>=5) continue;
  chosen.push(t); traditionCount[t.tradition]=(traditionCount[t.tradition]||0)+1;
}
for (const t of evidenceByTopic) if (chosen.length<daysInMonth && !chosen.includes(t)) chosen.push(t);
const calendar = chosen.map((t,i)=>{
  const date = new Date(Date.UTC(year,month-1,i+1));
  return {day:i+1,date:date.toISOString().slice(0,10),topic:t.topic,tradition:t.tradition,evidenceScore:t.evidenceScore,confidence:t.confidence,hookHindi:makeHook(t),evidenceLinks:t.evidence.slice(0,3).map(v=>({title:v.title,url:v.url,channel:v.channel,views:v.views,viewsPerDay:v.viewsPerDay,outlierRatio:v.outlierRatio,ageDays:v.ageDays})),researchQueries:t.queries};
});
function makeHook(t) {
  const hooks = {
    "Mesopotamian":"उसने मौत को हराने की कोशिश की… लेकिन असली जवाब कुछ और था।",
    "Greek":"उसकी सबसे बड़ी सज़ा दर्द नहीं थी… बल्कि एक अंतहीन कोशिश थी।",
    "Norse":"ज्ञान पाने के लिए उसने वह कीमत चुकाई, जिसकी कल्पना भी मुश्किल है।",
    "Japanese":"वह मौत के दरवाज़े तक गया… मगर एक नियम ने सब बदल दिया।",
    "Egyptian":"एक साम्राज्य, एक विश्वासघात… और मौत के बाद शुरू हुई कहानी।",
    "West African":"सबसे चालाक मकड़ी ने वह हासिल किया, जिसे देवता भी आसानी से नहीं देते।",
    "Maya":"अंडरवर्ल्ड के शासकों को लगा कि कोई लौट नहीं सकता… फिर दो भाई आए।",
    "Aztec":"इंसानियत की शुरुआत के पीछे छिपी थी एक खतरनाक यात्रा।",
    "Polynesian":"जब सूरज बहुत तेज़ चलता था, एक नायक ने उसे रोकने की ठानी।",
    "Aboriginal Australian":"एक प्राचीन सृष्टि-कथा, जिसमें धरती खुद कहानी बन जाती है।",
    "Chinese":"स्वर्ग के नियमों को चुनौती देने वाला एक नायक… जिसे कोई रोक नहीं पाया।",
    "Indian":"इस कहानी में जीत से बड़ा सवाल है—क्या सही था, और किस कीमत पर?"
  };
  return hooks[t.tradition] || "एक प्राचीन कथा… और ऐसा मानवीय संघर्ष जो आज भी हमारे भीतर है।";
}
const output = {generatedAt:new Date().toISOString(),targetMonth,market:"Hindi-first; global mythology",methodology:{windowDays:180,searchLanguage:"Hindi-relevant YouTube search",formats:"Short <=180s; long >180s",outlierDefinition:"At least 2x the median views of the same creator's recent same-format uploads; minimum 5 baseline uploads",evidenceScore:"Transparent heuristic based on number of outlier videos, independent creators, median views/day and median channel-relative outlier ratio; not a probability of virality",calendarPolicy:"Festival calendar is a separate editorial signal, not proof of outlier performance. Year-specific and lunar dates require verification; do not schedule an event topic without checking local observance.",caveats:["YouTube search is not a complete census.","Public views/likes/comments cannot reveal retention, swipe-away rate, or traffic sources for other creators.","A topic with weak evidence is marked as such, not silently promoted as a proven outlier.","Myth versions vary; verify a reliable primary or scholarly source before scripting.","Festival dates and observances may vary by region, calendar, and local tradition."]},quotaEstimate,topics:calendar,rankedResearch:evidenceByTopic,calendarOpportunities};
fs.mkdirSync("reports",{recursive:true});
fs.writeFileSync("reports/global-mythology-topic-"+targetMonth+".json",JSON.stringify(output,null,2));
const lines = ["# KATHAAYA Global Mythology Topic Plan — "+targetMonth,"","> Evidence-led research, not a guarantee of virality. Every topic must pass source verification before scripting.","", "## Scoring notes","- Search window: last 180 days; one Hindi-relevant YouTube search query per story (to control API quota).","- A channel-relative outlier is at least 2x the median views of that channel's recent same-format uploads, with at least five baseline videos.","- Confidence reflects public evidence availability, not certainty that a new KATHAAYA video will succeed.","- Views/day is age-normalized but still affected by recommendation spikes and platform changes.","", "## 30-day calendar","", "| Day | Tradition | Topic | Evidence score | Evidence confidence | Hindi hook |", "|---:|---|---|---:|---|---|"];
for(const t of calendar) lines.push("| "+t.day+" | "+t.tradition+" | "+t.topic+" | "+t.evidenceScore+" | "+t.confidence+" | "+t.hookHindi+" |");
lines.push("","## Evidence cards","");
for(const t of calendar) {
  lines.push("### "+t.day+". "+t.topic,"","**Tradition:** "+t.tradition+"  ","**Evidence score:** "+t.evidenceScore+" / 100  ","**Confidence:** "+t.confidence,"","**Research queries:** "+t.researchQueries.join("; "),"");
  if(!t.evidenceLinks.length) lines.push("No qualifying public video evidence found in this run. Treat as an exploratory idea, not a validated outlier.","");
  else {
    lines.push("| Source video | Channel | Views | Views/day | Same-format outlier | Age |","|---|---|---:|---:|---:|---:|");
    for(const v of t.evidenceLinks) lines.push("| ["+v.title.replace(/\|/g," ")+"]("+v.url+") | "+v.channel+" | "+v.views+" | "+v.viewsPerDay+" | "+(v.outlierRatio===null?"not measurable":v.outlierRatio+"x")+" | "+v.ageDays+"d |");
    lines.push("");
  }
  lines.push("**Script gate:** Verify the story against a primary text or reputable scholarly source; record which tradition/version is used; create an original angle rather than copying source-video packaging.","");
}
lines.push("## Festival and cultural-calendar opportunities","","These are editorial timing signals, not proof of video outlier performance. Publish before the event where possible. Verify local observances and source each cultural/religious story respectfully before scripting.","","| Event | Region | Event date | Recommended publish date | Status | Story angles | Source |","|---|---|---|---|---|---|---|");
for (const e of calendarOpportunities.filter(e => e.calendarWindowRelevant || !e.eventDate)) {
  lines.push("| "+e.name+" | "+e.region+" | "+(e.eventDate||"verify date")+" | "+(e.plannedPublishDate||"after date verification")+" | "+e.dateStatus+" | "+e.storyAngles.join("; ")+" | [Calendar/source]("+e.source+") |");
}
lines.push("","## Full research ranking","","| Rank | Tradition | Topic | Score | Confidence | Outlier videos | Independent creators | Median views/day |","|---:|---|---|---:|---|---:|---:|---:|");
for(const t of evidenceByTopic) lines.push("| "+(evidenceByTopic.indexOf(t)+1)+" | "+t.tradition+" | "+t.topic+" | "+t.evidenceScore+" | "+t.confidence+" | "+t.outlierCount+" | "+t.independentOutlierCreators+" | "+t.medianViewsPerDay+" |");
lines.push("","## What this report cannot prove","","- It cannot guarantee virality, audience retention, shares, or subscriber growth.","- Public competitor analytics do not expose average percentage viewed or Shorts 'chose to view' rates; validate those on KATHAAYA's own uploads in YouTube Studio.","- Evidence is limited to searchable public videos and can miss relevant results.","");
fs.writeFileSync("reports/global-mythology-topic-"+targetMonth+".md",lines.join("\n"));
console.log(lines.join("\n"));
