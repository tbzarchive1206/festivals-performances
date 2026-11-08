import { useRef, useState } from "react";
import catalog from "../app/data/music-shows.json";
import "./music-shows.css";

const { performances, fancams } = catalog;
export const musicShowCounts = { performances: performances.length, fancams: fancams.length };
type Performance = (typeof performances)[number];
type Fancam = (typeof fancams)[number];
type FilterKey = "year" | "era" | "show" | "member" | "kind" | "sort";
type Selection = { stage: Performance; camera: Fancam | null };

const pageSize = 8;
const defaults = { year: "", era: "", show: "", member: "", kind: "", sort: "new" };
const stageById = new Map(performances.map(stage => [stage.id, stage]));
const fancamsByStage = new Map<string, Fancam[]>();
for (const camera of fancams) {
  const group = fancamsByStage.get(camera.stageId);
  if (group) group.push(camera);
  else fancamsByStage.set(camera.stageId, [camera]);
}

const eraLabel = (era: string) => era === "導火線" ? "導火線 (TRIGGER)" : era;
const eraSortKey = (era: string) => era === "導火線" ? "TRIGGER" : era;
const titleOf = (stage: Performance) => stage.title || stage.titleKo;
const normalize = (value: string) => value.normalize("NFKC").toLowerCase();
const unique = (values: string[]) => [...new Set(values)];
const years = unique(performances.map(stage => stage.date.slice(0, 4))).sort().reverse();
const eras = unique(performances.map(stage => stage.era)).sort((a, b) => eraSortKey(a).localeCompare(eraSortKey(b), "en"));
const shows = unique(performances.map(stage => stage.show)).sort((a, b) => a.localeCompare(b, "en"));
const members = [
  "Sangyeon", "Jacob", "Younghoon", "Hyunjae", "Juyeon", "Kevin", "Q", "Sunwoo", "Eric",
  "Hwall", "Ju Haknyeon", "New",
];
const historicalLabels: Record<string, string> = {
  Hwall: "Hwall (2017–2019)",
  "Ju Haknyeon": "Haknyeon (2017–2025)",
  New: "New (2017–2026)",
};

function Filter({ label, value, onChange, options, all, format = value => value }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  all?: string;
  format?: (value: string) => string;
}) {
  return <label>{label}
    <select value={value} onChange={event => onChange(event.target.value)}>
      {all && <option value="">{all}</option>}
      {options.map(option => <option key={option} value={option}>{format(option)}</option>)}
    </select>
  </label>;
}

export function MusicShows() {
  const [view, setView] = useState<"stage" | "cam">("stage");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(defaults);
  const [shown, setShown] = useState(pageSize);
  const [selection, setSelection] = useState<Selection | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const update = (key: FilterKey) => (value: string) => {
    setFilters(previous => ({ ...previous, [key]: value }));
    setShown(pageSize);
  };
  function open(stage: Performance, camera: Fancam | null, button: HTMLButtonElement) {
    opener.current = button;
    setSelection({ stage, camera });
    requestAnimationFrame(() => document.getElementById("music-shows-back")?.focus());
  }
  function close() {
    setSelection(null);
    requestAnimationFrame(() => opener.current?.focus());
  }

  const words = normalize(query).trim().split(/\s+/u).filter(Boolean);
  const rows: Selection[] = view === "stage"
    ? performances.map(stage => ({ stage, camera: null }))
    : fancams.flatMap(camera => {
        const stage = stageById.get(camera.stageId);
        return stage ? [{ stage, camera }] : [];
      });
  const matches = rows.filter(({ stage, camera }) => {
    const dateCode = stage.date.slice(2).replaceAll("-", "");
    const text = normalize([stage.date, dateCode, stage.title, stage.titleKo, stage.show, stage.showKo, eraLabel(stage.era), camera?.member, historicalLabels[camera?.member || ""]].join(" "));
    return (!filters.year || stage.date.startsWith(filters.year))
      && (!filters.era || stage.era === filters.era)
      && (!filters.show || stage.show === filters.show)
      && (!camera || ((!filters.member || camera.member === filters.member) && (!filters.kind || camera.kind === filters.kind)))
      && words.every(word => text.includes(word));
  }).sort((a, b) => (filters.sort === "old" ? 1 : -1) * a.stage.date.localeCompare(b.stage.date)
    || a.stage.id.localeCompare(b.stage.id));
  const activeRecording = selection?.camera || selection?.stage;
  const startSeconds = selection?.camera ? undefined : selection?.stage.startSeconds;

  return <section className="music-shows" aria-label="Music Shows">
    <header className="music-mast">
      <div className="music-caption"><a href="#home">THE BOYZ / FAN ARCHIVE / PERFORMANCES</a></div>
      <h1>MUSIC SHOWS</h1>
      <div className="music-caption">{performances.length} performances / {fancams.length.toLocaleString("en-US")} fancams / {years.at(-1)}–{years[0]}</div>
    </header>
    {selection && <section className="music-detail" aria-label="Selected recording">
      <button id="music-shows-back" type="button" className="music-action" onClick={close}>← BACK TO RESULTS</button>
      <div className="music-recording">
        <h2>{titleOf(selection.stage)}</h2>
        <p className="music-caption">{selection.stage.date} · {selection.stage.show} · {eraLabel(selection.stage.era)}</p>
        {activeRecording?.youtubeId
          ? <iframe className="music-player" key={activeRecording.id}
              title={`${titleOf(selection.stage)} — ${selection.camera?.member || "Main stage"} (YouTube)`}
              src={`https://www.youtube.com/embed/${activeRecording.youtubeId}?autoplay=1&playsinline=1${startSeconds ? `&start=${startSeconds}` : ""}`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin" />
          : <div className="music-player music-unavailable" role="status">VIDEO UNAVAILABLE</div>}
        {activeRecording?.download && <a className="music-caption" href={activeRecording.download} target="_blank" rel="noreferrer">DOWNLOAD ↓</a>}
        <div className="music-shots" aria-label="Recordings from this performance">
          <button type="button" aria-pressed={!selection.camera} onClick={() => setSelection({ stage: selection.stage, camera: null })}>Main stage</button>
          {(fancamsByStage.get(selection.stage.id) || []).map(camera =>
            <button type="button" key={camera.id} aria-pressed={selection.camera?.id === camera.id}
              onClick={() => setSelection({ stage: selection.stage, camera })}>{camera.member}</button>)}
        </div>
      </div>
    </section>}
    <div hidden={Boolean(selection)}>
      <div className="music-tabs" aria-label="Gallery view">
        {(["stage", "cam"] as const).map(mode =>
          <button type="button" key={mode} aria-pressed={view === mode} onClick={() => { setView(mode); setShown(pageSize); }}>
            {mode === "stage" ? "Performances" : "Fancams"}
          </button>)}
      </div>
      <input className="music-search" type="search" aria-label="Search by title, show or date" placeholder="Search song, show or YYMMDD date…"
        value={query} onChange={event => { setQuery(event.target.value); setShown(pageSize); }} />
      <div className="music-filters">
        <Filter label="Year" value={filters.year} onChange={update("year")} options={years} all="All years" />
        <Filter label="Era" value={filters.era} onChange={update("era")} options={eras} all="All eras" format={eraLabel} />
        <Filter label="Show" value={filters.show} onChange={update("show")} options={shows} all="All shows" />
        {view === "cam" && <>
          <Filter label="Member" value={filters.member} onChange={update("member")} options={members} all="All members" format={member => historicalLabels[member] || member} />
          <Filter label="Fancam type" value={filters.kind} onChange={update("kind")} options={["Group", "Individual"]} all="All types" />
        </>}
        <Filter label="Sort" value={filters.sort} onChange={update("sort")} options={["new", "old"]} format={value => value === "new" ? "Newest first" : "Oldest first"} />
      </div>
      <div className="music-results">
        <strong className="music-caption" aria-live="polite">Music Shows · {matches.length.toLocaleString("en-US")} {view === "stage" ? "performances" : "fancams"}</strong>
        <button type="button" className="music-action" onClick={() => { setQuery(""); setFilters(defaults); setShown(pageSize); }}>RESET FILTERS</button>
      </div>
      <div className="music-grid">
        {matches.slice(0, shown).map(({ stage, camera }) => {
          const recording = camera || stage;
          return <article className="music-entry" key={recording.id}>
            <button type="button" className="music-thumb" aria-label={`Open ${titleOf(stage)} · ${camera?.member || "Main stage"}`}
              onClick={event => open(stage, camera, event.currentTarget)}>
              {recording.youtubeId && <img
                src={`https://i.ytimg.com/vi/${recording.youtubeId}/mqdefault.jpg`}
                alt="" loading="lazy" decoding="async"
                onError={event => { event.currentTarget.hidden = true; }}
              />}
              <span className="music-badge music-caption">{camera?.kind || "Stage"}</span>
            </button>
            <div>
              <div className="music-caption">{stage.date} · {stage.show}</div>
              <h2>{titleOf(stage)}</h2>
              <div className="music-caption">{camera?.member || `${fancamsByStage.get(stage.id)?.length || 0} fancams`} · {eraLabel(stage.era)}</div>
              <button type="button" className="music-action" onClick={event => open(stage, camera, event.currentTarget)}>
                {camera ? "OPEN FANCAM →" : "OPEN STAGE →"}
              </button>
            </div>
          </article>;
        })}
        {!matches.length && <p className="music-caption">No recordings match these filters.</p>}
      </div>
      {matches.length > shown && <button type="button" className="load-more" onClick={() => setShown(value => value + pageSize)}>LOAD MORE ↓</button>}
    </div>
  </section>;
}
