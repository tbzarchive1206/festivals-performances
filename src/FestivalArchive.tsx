import { useEffect, useMemo, useState } from "react";

type RawNode = { id: string; name: string; mimeType: string; type: "file" | "folder"; size?: string | null; path: string[] };
export type RawArchive = { generatedAt: string; sourceFolderId: string; spreadsheetId: string; nodes: RawNode[]; kconRows: string[][] };
type Media = RawNode & { kind: "video" | "image" | "audio" | "other"; members: string[] };
type ArchiveEvent = { id: string; title: string; categoryId: string; categoryTitle: string; sourceId: string; sourceType: "file" | "folder"; media: Media[]; dates: string[]; date: string; year: number; eventType: string; setlist?: string; extra?: string };
type Category = { id: string; title: string; sourceIds: string[]; events: ArchiveEvent[]; featured?: boolean; order: number };

const ROOT_NAME = "FESTIVALS & PERFORMANCES";
const pageSize = 24;
const memberOrder = ["SANGYEON", "JACOB", "YOUNGHOON", "HYUNJAE", "JUYEON", "KEVIN", "Q", "SUNWOO", "ERIC", "HAKNYEON", "NEW"];
const memberPatterns: [string, RegExp][] = [
  ["SANGYEON", /SANGYEON|상연/iu], ["JACOB", /JACOB|제이콥/iu], ["YOUNGHOON", /YOUNGHOON|영훈/iu],
  ["HYUNJAE", /HYUNJAE|현재/iu], ["JUYEON", /JUYEON|주연/iu], ["KEVIN", /KEVIN|케빈/iu],
  ["Q", /(?:^|[^A-Z])Q(?:[^A-Z]|$)|큐/iu], ["SUNWOO", /SUNWOO|선우/iu], ["ERIC", /ERIC|에릭/iu],
  ["HAKNYEON", /HAKNYEON|JUHAKNYEON|학년/iu], ["NEW", /(?:^|[^A-Z])NEW(?:[^A-Z]|$)|뉴/iu],
];
const categoryRules = [
  { id: "music-shows", title: "MUSIC SHOWS", test: (name: string) => /MUSIC SHOWS/iu.test(name), order: 2 },
  { id: "kcon", title: "KCON", test: (name: string) => /^KCON\b/iu.test(name), order: 3 },
  { id: "showcases", title: "SHOWCASES & COMEBACK LIVES", test: (name: string) => /SHOWCASES/iu.test(name), order: 4 },
  { id: "road-to-kingdom", title: "ROAD TO KINGDOM", test: (name: string) => /ROAD TO KINGDOM/iu.test(name), order: 5 },
  { id: "the100", title: "THE100 MINI CONCERT", test: (name: string) => /THE100 MINI CONCERT/iu.test(name), order: 6 },
];

const normalize = (value = "") => value.normalize("NFKD").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const cleanTitle = (value: string) => value.replace(/^\s*\d+\.\s*/u, "").replace(/\.(mp4|webm|mkv|mov|jpg|jpeg|png|srt)$/iu, "").trim();
const slug = (value: string) => normalize(value).replace(/\s+/gu, "-") || "collection";
const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
const fileUrl = (id: string) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
const downloadUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
const thumbnailUrl = (id: string) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`;
const kindOf = (mime = ""): Media["kind"] => mime.startsWith("video/") ? "video" : mime.startsWith("image/") ? "image" : mime.startsWith("audio/") ? "audio" : "other";
const membersOf = (value: string) => memberPatterns.filter(([, pattern]) => pattern.test(value)).map(([member]) => member);
const dateCodes = (value: string) => [...value.matchAll(/(?:^|\D)([12]\d{5})(?=\D|$)/gu)].map((match) => match[1]);
const formatDate = (value: string) => /^\d{6}$/u.test(value) ? `20${value.slice(0, 2)}.${value.slice(2, 4)}.${value.slice(4, 6)}` : "DATE UNKNOWN";
const displayMember = (value: string) => value === "HAKNYEON" ? "HAKNYEON (2017–2025)" : value === "NEW" ? "NEW (2017–2026)" : value;

function classifyEvent(title: string, categoryId: string) {
  if (categoryId === "music-shows") return "MUSIC SHOW";
  if (categoryId === "kcon") return "KCON";
  if (categoryId === "showcases") return /SPECIAL STAGE/iu.test(title) ? "SPECIAL STAGE" : /COMEBACK LIVE/iu.test(title) ? "COMEBACK LIVE" : "SHOWCASE";
  if (categoryId === "road-to-kingdom") return "PERFORMANCE";
  if (categoryId === "the100") return "MINI CONCERT";
  if (/AWARD|GAYO|MAMA|MMA|AAA|ASEA|KGMA|GOLDEN DISC|SEOUL MUSIC|GAON|SORIBADA|DAEJEON|DAECHUKJE|DAEJEJEON/iu.test(title)) return "AWARDS & YEAR-END";
  if (/FESTIVAL|CONCERT|K-?POP NATION|K-LINK|LIVE IN|M:ZINE|IPSELENTI/iu.test(title)) return "FESTIVAL & LIVE";
  return "SPECIAL STAGE";
}

function buildArchive(data: RawArchive) {
  const rootFolders = data.nodes.filter((node) => node.type === "folder" && node.path.length === 1);
  const yearFolders = rootFolders.filter((folder) => /^20\d{2}$/u.test(folder.name));
  const assigned = new Set(yearFolders.map((folder) => folder.id));
  const definitions: { id: string; title: string; folders: RawNode[]; order: number; featured?: boolean }[] = [];
  if (yearFolders.length) definitions.push({ id: "events-by-year", title: "EVENTS BY YEAR", folders: yearFolders, order: 1, featured: true });
  for (const rule of categoryRules) {
    const folders = rootFolders.filter((folder) => rule.test(folder.name));
    folders.forEach((folder) => assigned.add(folder.id));
    if (folders.length) definitions.push({ id: rule.id, title: rule.title, folders, order: rule.order });
  }
  rootFolders.filter((folder) => !assigned.has(folder.id)).forEach((folder, index) => definitions.push({ id: `auto-${slug(folder.name)}-${folder.id.slice(0, 5)}`, title: cleanTitle(folder.name), folders: [folder], order: 100 + index }));

  const sheetRows = data.kconRows.slice(1).filter((row) => row[0] && row[1]);
  const categories: Category[] = definitions.map((definition) => {
    const events: ArchiveEvent[] = [];
    for (const topFolder of definition.folders) {
      const direct = data.nodes.filter((node) => node.path.length === 2 && node.path[1] === topFolder.name && node.mimeType !== "application/vnd.google-apps.spreadsheet");
      for (const source of direct) {
        const mediaNodes = source.type === "file" ? [source] : data.nodes.filter((node) => node.type === "file" && node.path[1] === topFolder.name && node.path[2] === source.name && node.mimeType !== "application/vnd.google-apps.spreadsheet");
        if (!mediaNodes.length && source.type === "folder") continue;
        const media = mediaNodes.map((node) => ({ ...node, kind: kindOf(node.mimeType), members: membersOf(node.name) }));
        const ownDates = dateCodes(source.name);
        const mediaDates = media.flatMap((item) => dateCodes(item.name));
        const yearFallback = /^20\d{2}$/u.test(topFolder.name) ? Number(topFolder.name) : 0;
        const title = cleanTitle(source.name);
        let sheet = definition.id === "kcon" ? sheetRows.find((row) => normalize(row[2] || row[0]).includes(normalize(title).replace(/^\d{6}\s*/u, "")) || normalize(title).includes(normalize(row[0]))) : undefined;
        if (!sheet && definition.id === "kcon") sheet = sheetRows.find((row) => ownDates.includes(String(row[1])));
        const dates = [...new Set([...ownDates, ...mediaDates, ...(sheet?.[1] ? [String(sheet[1])] : [])])].sort();
        const date = dates.at(-1) || "";
        events.push({
          id: source.id, title, categoryId: definition.id, categoryTitle: definition.title, sourceId: source.id, sourceType: source.type,
          media, dates, date, year: date ? 2000 + Number(date.slice(0, 2)) : yearFallback,
          eventType: classifyEvent(title, definition.id), setlist: sheet?.[3] || "", extra: sheet?.[4] || "",
        });
      }
    }
    return { id: definition.id, title: definition.title, sourceIds: definition.folders.map((folder) => folder.id), events: events.sort((a, b) => (b.date || "").localeCompare(a.date || "")), featured: definition.featured, order: definition.order };
  }).sort((a, b) => a.order - b.order);
  return { categories, events: categories.flatMap((category) => category.events) };
}

function representative(event: ArchiveEvent) {
  return event.media.find((item) => item.kind === "video") || event.media.find((item) => item.kind === "image") || null;
}

function MediaTile({ media }: { media: Media }) {
  const visual = media.kind === "video" || media.kind === "image";
  return <figure className={`media-tile ${media.kind}-tile`}>
    <a className="media-visual" href={fileUrl(media.id)} target="_blank" rel="noreferrer">
      {visual ? <img src={thumbnailUrl(media.id)} alt="" loading="lazy" /> : <span className="no-cover">{media.kind === "other" ? "FILE" : media.kind.toUpperCase()}</span>}
      {media.kind === "video" && <span className="play-mark">VIDEO / GOOGLE DRIVE ↗</span>}
    </a>
    <div className="image-actions"><span className="file-name" title={media.name}>{media.name}</span><span className="file-action-links"><a href={fileUrl(media.id)} target="_blank" rel="noreferrer">VIEW ↗</a><a href={downloadUrl(media.id)} target="_blank" rel="noreferrer">DOWNLOAD ↓</a></span></div>
  </figure>;
}

function EventCard({ event, open }: { event: ArchiveEvent; open: () => void }) {
  const cover = representative(event);
  const firstVideo = event.media.find((item) => item.kind === "video");
  const shownDate = event.dates.length > 1 ? `${formatDate(event.dates[0])}–${formatDate(event.dates.at(-1)!)}` : formatDate(event.date);
  return <article className="card">
    <button className="thumb" onClick={open} aria-label={`Open ${event.title}`}>
      {cover ? <img src={thumbnailUrl(cover.id)} alt="" loading="lazy" /> : <span className="no-cover">NO PREVIEW</span>}
      <span className="number">{event.eventType}</span><span className="photo-count">{event.media.length} FILES</span>
    </button>
    <div className="card-info"><span className="eyebrow">{shownDate} · {event.categoryTitle}</span><h2>{event.title}</h2>
      <div className="meta"><span>YEAR</span><strong>{event.year || "—"}</strong><span>MEDIA</span><strong>{event.media.length} FILES</strong>{event.setlist && <><span>SETLIST</span><strong>AVAILABLE</strong></>}</div>
      <div className="card-actions">{firstVideo && <a href={fileUrl(firstVideo.id)} target="_blank" rel="noreferrer">WATCH ↗</a>}<button onClick={open}>OPEN EVENT →</button></div>
    </div>
  </article>;
}

function parseHash() {
  const [kind, categoryId, eventId] = location.hash.replace(/^#\/?/u, "").split("/");
  return kind === "event" ? { categoryId, eventId } : kind === "category" ? { categoryId, eventId: "" } : { categoryId: "", eventId: "" };
}

export function FestivalArchive({ data }: { data: RawArchive }) {
  const archive = useMemo(() => buildArchive(data), [data]);
  const [route, setRoute] = useState(parseHash);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("desc");
  const [memberFilter, setMemberFilter] = useState("all");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [shown, setShown] = useState(pageSize);
  useEffect(() => { const change = () => { setRoute(parseHash()); setShown(pageSize); window.scrollTo({ top: 0, behavior: "smooth" }); }; window.addEventListener("hashchange", change); return () => window.removeEventListener("hashchange", change); }, []);

  const selectedCategory = archive.categories.find((category) => category.id === route.categoryId);
  const selectedEvent = selectedCategory?.events.find((event) => event.id === route.eventId);
  const years = [...new Set(archive.events.map((event) => event.year).filter(Boolean))].sort((a, b) => b - a);
  const eventTypes = [...new Set(archive.events.map((event) => event.eventType))].sort();
  const normalizedQuery = normalize(query);
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const baseEvents = selectedCategory ? selectedCategory.events : archive.events;
  const filtered = baseEvents.filter((event) => {
    if (categoryFilter !== "all" && event.categoryId !== categoryFilter) return false;
    if (yearFilter !== "all" && String(event.year) !== yearFilter) return false;
    if (typeFilter !== "all" && event.eventType !== typeFilter) return false;
    const haystack = normalize([event.title, event.categoryTitle, event.date, event.dates.join(" "), event.setlist, event.extra, ...event.media.map((item) => item.name)].join(" "));
    return tokens.every((token) => haystack.includes(token));
  }).sort((a, b) => sort === "asc" ? (a.date || "").localeCompare(b.date || "") : (b.date || "").localeCompare(a.date || ""));

  const totalMedia = archive.events.reduce((sum, event) => sum + event.media.length, 0);
  const updated = new Date(data.generatedAt).toLocaleDateString("en-GB");
  const goHome = () => { location.hash = "home"; setQuery(""); setCategoryFilter("all"); };
  const goCategory = (id: string) => { location.hash = `category/${id}`; setCategoryFilter("all"); setYearFilter("all"); setTypeFilter("all"); };
  const goEvent = (event: ArchiveEvent) => { location.hash = `event/${event.categoryId}/${event.id}`; };

  if (selectedEvent) {
    const availableMembers = memberOrder.filter((member) => selectedEvent.media.some((item) => item.members.includes(member)));
    const media = selectedEvent.media.filter((item) => (memberFilter === "all" || item.members.includes(memberFilter)) && (mediaFilter === "all" || item.kind === mediaFilter));
    return <main id="top"><Header categories={archive.categories.length} events={archive.events.length} media={totalMedia} updated={updated} />
      <section className="event-page">
        <header className="member-gallery-head"><button onClick={() => goCategory(selectedEvent.categoryId)}>← ALL EVENTS</button><div><span>{selectedEvent.categoryTitle} / EVENT</span><h2>{selectedEvent.title}</h2></div><a href={selectedEvent.sourceType === "folder" ? folderUrl(selectedEvent.sourceId) : fileUrl(selectedEvent.sourceId)} target="_blank" rel="noreferrer">OPEN SOURCE ↗</a></header>
        {(selectedEvent.setlist || selectedEvent.extra) && <div className="event-notes">{selectedEvent.setlist && <div><span>SETLIST</span><p>{selectedEvent.setlist}</p></div>}{selectedEvent.extra && <div><span>ADDITIONAL CONTENT</span><p>{selectedEvent.extra}</p></div>}</div>}
        <div className="member-filters"><label>MEDIA TYPE<select value={mediaFilter} onChange={(event) => setMediaFilter(event.target.value)}><option value="all">ALL MEDIA</option><option value="video">VIDEO</option><option value="image">PHOTOS</option><option value="other">OTHER FILES</option></select></label>{availableMembers.length ? <label>MEMBER<select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}><option value="all">ALL MEMBERS</option>{availableMembers.map((member) => <option key={member} value={member}>{displayMember(member)}</option>)}</select></label> : <div className="blank-filter" />}<p>{media.length} RESULTS</p></div>
        <div className="member-period"><p>MEDIA GALLERY</p><span>GOOGLE DRIVE SOURCE</span></div>
        {media.length ? <div className="media-grid">{media.map((item) => <MediaTile key={item.id} media={item} />)}</div> : <div className="empty"><strong>NO MEDIA</strong>NO FILES MATCH THESE FILTERS.</div>}
      </section><Footer sourceId={data.sourceFolderId} /></main>;
  }

  const showResults = Boolean(query || selectedCategory || categoryFilter !== "all" || yearFilter !== "all" || typeFilter !== "all");
  return <main id="top"><Header categories={archive.categories.length} events={archive.events.length} media={totalMedia} updated={updated} />
    <section className="controls">
      <div className="search"><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setShown(pageSize); }} placeholder="SEARCH TITLE OR YYMMDD DATE…" aria-label="Search archive" />{query && <button className="clear" onClick={() => setQuery("")}>CLEAR</button>}</div>
      <div className="filter-row"><label>COLLECTION<select value={selectedCategory?.id || categoryFilter} onChange={(event) => event.target.value === "all" ? goHome() : goCategory(event.target.value)}><option value="all">ALL COLLECTIONS</option>{archive.categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label><label>YEAR<select value={yearFilter} onChange={(event) => { setYearFilter(event.target.value); setShown(pageSize); }}><option value="all">ALL YEARS</option>{years.map((year) => <option key={year}>{year}</option>)}</select></label><label>EVENT TYPE<select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setShown(pageSize); }}><option value="all">ALL TYPES</option>{eventTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label>SORT<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="desc">NEWEST FIRST</option><option value="asc">OLDEST FIRST</option></select></label></div>
    </section>
    {!showResults ? <section className="category-picker"><div className="picker-head"><p>SELECT A COLLECTION · {archive.categories.length} SECTIONS</p><a href={folderUrl(data.sourceFolderId)} target="_blank" rel="noreferrer">OPEN SOURCE FOLDER ↗</a></div><div className="category-grid">{archive.categories.map((category, index) => <button className={category.featured ? "featured" : ""} key={category.id} onClick={() => goCategory(category.id)}><span>{String(index + 1).padStart(2, "0")} / COLLECTION</span><strong>{category.title}</strong><small>{category.events.length} EVENTS · {category.events.reduce((sum, event) => sum + event.media.length, 0)} FILES →</small></button>)}</div></section> : <section className="archive-section"><div className="results-head"><p>{selectedCategory?.title || "SEARCH RESULTS"} · {filtered.length} EVENTS</p><button onClick={goHome}>ALL COLLECTIONS ↑</button></div>{filtered.length ? <div className="cards">{filtered.slice(0, shown).map((event) => <EventCard key={event.id} event={event} open={() => goEvent(event)} />)}</div> : <div className="empty"><strong>NO RESULTS</strong>TRY AN EVENT NAME OR YYMMDD DATE.</div>}{shown < filtered.length && <button className="load-more" onClick={() => setShown((value) => value + pageSize)}>LOAD MORE EVENTS ↓</button>}</section>}
    <Footer sourceId={data.sourceFolderId} /></main>;
}

function Header({ categories, events, media, updated }: { categories: number; events: number; media: number; updated: string }) {
  return <header className="masthead"><div className="utility"><a className="brand" href="https://tbzarchive1206.github.io/tbzarchive/">THE BOYZ / FAN ARCHIVE</a><nav><span>FESTIVALS & PERFORMANCES</span><span>/</span><a href="https://x.com/tbzarchive1206_" target="_blank" rel="noreferrer">TWITTER ↗</a></nav></div><a href="#home"><h1><span className="solid">FESTIVALS &</span><span className="outline">PERFORMANCES</span></h1></a><div className="stats"><p><strong>{categories}</strong> COLLECTIONS</p><i /><p><strong>{events}</strong> EVENTS</p><i /><p><strong>{media.toLocaleString("en-US")}</strong> MEDIA FILES</p><i /><p>UPDATED <strong>{updated}</strong></p></div></header>;
}

function Footer({ sourceId }: { sourceId: string }) { return <footer><span>© THE BOYZ FAN ARCHIVE</span><a href={folderUrl(sourceId)} target="_blank" rel="noreferrer">SOURCE FOLDER ↗</a><a href="#top">BACK TO TOP ↑</a></footer>; }
