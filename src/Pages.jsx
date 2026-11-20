/* eslint-disable */
// ═══════════════════════════════════════════════════════════
// src/Pages.jsx — the workspace pages that run on real data:
//   Approvals, Calendar, Insights, Next Moves, Publishing, Settings,
//   plus the Product Chamber's Assets and Performance tabs.
// Nothing here is mocked: every list comes from Supabase, every button
// writes back to it (or calls a real endpoint).
// App.jsx passes in the shared pieces (supabase client, apiFetch, callAPI…).
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from "react";

const STATUS_COLOR = { draft: "#9BA0AC", approved: "#4DE8FF", scheduled: "#f0b429", published: "#4ADE80" };
const STATUS_LABEL = { draft: "Draft", approved: "Approved", scheduled: "Scheduled", published: "Published" };

const card = {
  background: "rgba(255,255,255,.04)", backdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "16px 18px",
};

// ── shared bits ────────────────────────────────────────────
function Shell({ eyebrow, title, sub, isMobile, gold, children, wide }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", padding: isMobile ? "24px 16px 100px" : "48px 40px", minHeight: 0 }}>
      <div style={{ width: "100%", maxWidth: wide || 940 }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 8 }}>{eyebrow}</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 500, fontStyle: "italic", fontSize: isMobile ? 28 : 36, color: "#F8F7FF", lineHeight: 1.15 }}>{title}</div>
          {sub && <div style={{ fontSize: 13.5, color: "#9591AC", marginTop: 8, maxWidth: 560, lineHeight: 1.6 }}>{sub}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ children, action, onAction }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: "34px 20px" }}>
      <div style={{ fontSize: 14, color: "#9BA0AC", lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}>{children}</div>
      {action && <button className="sm" onClick={onAction} style={{ marginTop: 16, borderColor: "#4DE8FF55", color: "#4DE8FF" }}>{action}</button>}
    </div>
  );
}

function SignInNeeded({ isMobile, gold, eyebrow, title }) {
  return (
    <Shell eyebrow={eyebrow} title={title} isMobile={isMobile} gold={gold}>
      <Empty>Sign in from the Account panel (top right) to see your saved work here.</Empty>
    </Shell>
  );
}

function StatusPill({ status }) {
  const c = STATUS_COLOR[status] || "#9BA0AC";
  return <span style={{ fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, color: c, border: `1px solid ${c}55`, borderRadius: 999, padding: "3px 9px" }}>{STATUS_LABEL[status] || status}</span>;
}

function ErrorLine({ children }) {
  return children ? <div style={{ fontSize: 12, color: "#ff6a6a", margin: "0 0 14px" }}>{children}</div> : null;
}

// Splits a generated campaign piece into its parts.
export function parsePiece(content) {
  const text = (content || "").replace(/\*\*/g, "").replace(/^\s*#+\s*/gm, "").replace(/^\s*-{3,}\s*$/gm, "");
  const grab = (label, until) => {
    const re = new RegExp(label + "\\s*:?\\s*([\\s\\S]*?)(?=" + until + "|$)", "i");
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };
  const caption = grab("HOOK\\/CAPTION", "\\n\\s*HASHTAGS\\s*:|\\n\\s*VISUAL DIRECTION\\s*:");
  const hashtags = grab("HASHTAGS", "\\n\\s*VISUAL DIRECTION\\s*:");
  const visual = grab("VISUAL DIRECTION", "$^");
  return { caption: caption || text.trim(), hashtags, visual };
}

const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => fmt(new Date());
function addDays(str, n) {
  const [y, m, d] = str.split("-").map(Number);
  return fmt(new Date(y, m - 1, d + n));
}

// Loads the active brand's campaigns, their pieces, and (optionally) metrics.
function useCampaignData({ supabase, session, activeProfileId, withLogs }) {
  const [state, setState] = useState({ loading: true, campaigns: [], pieces: [], logs: [], error: "" });
  const uid = session?.user?.id;

  const reload = useCallback(async () => {
    if (!uid) { setState({ loading: false, campaigns: [], pieces: [], logs: [], error: "" }); return; }
    setState(s => ({ ...s, loading: true, error: "" }));
    let q = supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    if (activeProfileId) q = q.eq("brand_profile_id", activeProfileId);
    const { data: campaigns, error: cErr } = await q;
    if (cErr) { setState({ loading: false, campaigns: [], pieces: [], logs: [], error: "Couldn't load your campaigns. Try again." }); return; }
    const ids = (campaigns || []).map(c => c.id);
    let pieces = [], logs = [], error = "";
    if (ids.length) {
      const { data, error: pErr } = await supabase.from("campaign_pieces").select("*").in("campaign_id", ids).order("day_number");
      if (pErr) error = "Couldn't load campaign pieces."; else pieces = data || [];
      if (withLogs && pieces.length) {
        const { data: l } = await supabase.from("performance_logs").select("*").in("piece_id", pieces.map(p => p.id));
        logs = l || [];
      }
    }
    setState({ loading: false, campaigns: campaigns || [], pieces, logs, error });
  }, [supabase, uid, activeProfileId, withLogs]);

  useEffect(() => { reload(); }, [reload]);

  const patchPiece = useCallback(async (id, patch) => {
    const { data, error } = await supabase.from("campaign_pieces").update(patch).eq("id", id).select().single();
    if (error || !data) return { error: error?.message || "Couldn't save that change." };
    setState(s => ({ ...s, pieces: s.pieces.map(p => p.id === id ? data : p) }));
    return { data };
  }, [supabase]);

  return { ...state, reload, patchPiece };
}

const sortPieces = (campaigns, pieces) => {
  const order = Object.fromEntries(campaigns.map((c, i) => [c.id, i]));
  return [...pieces].sort((a, b) => (order[a.campaign_id] - order[b.campaign_id]) || (a.day_number - b.day_number));
};

// ═══════════════════════════════════════════════════════════
// APPROVALS
// ═══════════════════════════════════════════════════════════
export function ApprovalsPage({ supabase, session, activeProfileId, gold, isMobile, onNavigate }) {
  const d = useCampaignData({ supabase, session, activeProfileId });
  const [tab, setTab] = useState("draft");
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState({});
  const [err, setErr] = useState("");

  if (!session?.user) return <SignInNeeded isMobile={isMobile} gold={gold} eyebrow="Campaigns" title="Approvals" />;

  const camp = Object.fromEntries(d.campaigns.map(c => [c.id, c]));
  const count = (s) => d.pieces.filter(p => p.status === s).length;
  const list = sortPieces(d.campaigns, d.pieces.filter(p => p.status === tab));

  async function act(piece, patch) {
    setBusy(b => ({ ...b, [piece.id]: true })); setErr("");
    const r = await d.patchPiece(piece.id, patch);
    if (r.error) setErr(r.error);
    else setEdits(e => { const n = { ...e }; delete n[piece.id]; return n; });
    setBusy(b => ({ ...b, [piece.id]: false }));
  }

  return (
    <Shell eyebrow="Campaigns" title="Approvals" isMobile={isMobile} gold={gold}
      sub="Nothing goes out until you say so. Review what BISHOP wrote, tweak it if you want, then approve it.">
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["draft", "Needs approval"], ["approved", "Approved"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="sm"
            style={{ borderColor: tab === id ? "#4DE8FF77" : "rgba(255,255,255,.1)", color: tab === id ? "#4DE8FF" : "#9BA0AC", background: tab === id ? "rgba(77,232,255,.08)" : "transparent" }}>
            {label} · {count(id)}
          </button>
        ))}
      </div>
      <ErrorLine>{err || d.error}</ErrorLine>
      {d.loading ? <div style={{ fontSize: 13, color: "#565A64" }}>Loading…</div>
        : list.length === 0 ? (
          <Empty action={d.campaigns.length === 0 ? "Build a campaign" : tab === "draft" && count("approved") ? "Go to Calendar" : null}
            onAction={() => onNavigate(d.campaigns.length === 0 ? "campaign-builder" : "calendar")}>
            {d.campaigns.length === 0 ? "No campaigns yet. Build one and its posts will land here for approval."
              : tab === "draft" ? "You're all caught up. Nothing is waiting on you." : "Nothing approved yet."}
          </Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {list.map(p => {
              const c = camp[p.campaign_id];
              const text = edits[p.id] ?? p.content ?? "";
              const dirty = edits[p.id] !== undefined && edits[p.id] !== p.content;
              return (
                <div key={p.id} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12.5, color: "#9BA0AC" }}>
                      <span style={{ color: "#F0F1F4" }}>{c?.name || "Campaign"}</span> · Day {p.day_number}{p.day_theme ? ` · ${p.day_theme}` : ""}
                      {p.scheduled_date ? ` · ${p.scheduled_date}` : ""}
                    </div>
                    <StatusPill status={p.status} />
                  </div>
                  <textarea className="inp" rows={7} value={text} onChange={e => setEdits(x => ({ ...x, [p.id]: e.target.value }))}
                    style={{ width: "100%", resize: "vertical", marginBottom: 12, fontSize: 13.5, lineHeight: 1.55 }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {dirty && <button className="sm" disabled={busy[p.id]} onClick={() => act(p, { content: text })} style={{ borderColor: gold + "66", color: gold }}>Save edits</button>}
                    {p.status === "draft" && <button className="sm" disabled={busy[p.id]} onClick={() => act(p, { status: "approved", ...(dirty ? { content: text } : {}) })} style={{ borderColor: "#4ADE8066", color: "#4ADE80" }}>{busy[p.id] ? "…" : "Approve"}</button>}
                    {p.status === "approved" && <>
                      <button className="sm" onClick={() => onNavigate("calendar")} style={{ borderColor: "#4DE8FF55", color: "#4DE8FF" }}>Schedule</button>
                      <button className="sm" disabled={busy[p.id]} onClick={() => act(p, { status: "draft", scheduled_date: null })} style={{ borderColor: "rgba(255,255,255,.14)", color: "#9BA0AC" }}>Send back to draft</button>
                    </>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════════════════════
export function CalendarPage({ supabase, session, activeProfileId, gold, isMobile, onNavigate }) {
  const d = useCampaignData({ supabase, session, activeProfileId });
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [err, setErr] = useState("");
  const [pickCampaign, setPickCampaign] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [filling, setFilling] = useState(false);
  const [sel, setSel] = useState(null);

  if (!session?.user) return <SignInNeeded isMobile={isMobile} gold={gold} eyebrow="Campaigns" title="Calendar" />;

  const camp = Object.fromEntries(d.campaigns.map(c => [c.id, c]));
  const live = d.pieces.filter(p => p.status !== "published" || p.scheduled_date);
  const byDate = {};
  d.pieces.forEach(p => { if (p.scheduled_date) (byDate[p.scheduled_date] = byDate[p.scheduled_date] || []).push(p); });
  const unscheduled = sortPieces(d.campaigns, d.pieces.filter(p => !p.scheduled_date && p.status !== "published"));

  const first = new Date(ym.y, ym.m, 1);
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let day = 1; day <= daysIn; day++) cells.push(`${ym.y}-${pad(ym.m + 1)}-${pad(day)}`);
  const monthName = first.toLocaleString(undefined, { month: "long", year: "numeric" });
  const selected = sel ? d.pieces.find(p => p.id === sel) : null;

  async function setDate(piece, date) {
    setErr("");
    const patch = { scheduled_date: date || null };
    if (date && piece.status === "approved") patch.status = "scheduled";
    if (!date && piece.status === "scheduled") patch.status = "approved";
    const r = await d.patchPiece(piece.id, patch);
    if (r.error) setErr(r.error);
  }

  async function autoSchedule() {
    const target = d.pieces.filter(p => p.campaign_id === pickCampaign && p.status !== "published");
    if (!target.length || !startDate) return;
    setFilling(true); setErr("");
    for (const p of target) {
      const patch = { scheduled_date: addDays(startDate, (p.day_number || 1) - 1) };
      if (p.status === "approved") patch.status = "scheduled";
      const r = await d.patchPiece(p.id, patch);
      if (r.error) { setErr(r.error); break; }
    }
    setFilling(false);
  }

  const today = todayStr();

  return (
    <Shell eyebrow="Campaigns" title="Calendar" isMobile={isMobile} gold={gold} wide={1080}
      sub="Every campaign post, on the day it goes out. Pick a date for any post, or lay a whole campaign out in one click.">
      <ErrorLine>{err || d.error}</ErrorLine>
      {d.loading ? <div style={{ fontSize: 13, color: "#565A64" }}>Loading…</div>
        : d.pieces.length === 0 ? (
          <Empty action="Build a campaign" onAction={() => onNavigate("campaign-builder")}>No posts to schedule yet. Build a campaign and its days will show up here.</Empty>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 320px", gap: 20, alignItems: "start" }}>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <button className="sm" onClick={() => setYm(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })}>‹</button>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, color: "#F0F1F4" }}>{monthName}</div>
                <button className="sm" onClick={() => setYm(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
                {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => <div key={i} style={{ fontSize: 10, color: "#565A64", textAlign: "center", letterSpacing: 1 }}>{l}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {cells.map((ds, i) => !ds ? <div key={i} /> : (
                  <div key={ds} style={{ minHeight: isMobile ? 56 : 82, padding: 5, borderRadius: 8, background: ds === today ? "rgba(201,169,97,.10)" : "rgba(255,255,255,.025)", border: `1px solid ${ds === today ? gold + "66" : "rgba(255,255,255,.05)"}` }}>
                    <div style={{ fontSize: 10.5, color: ds === today ? gold : "#6B6F7A", marginBottom: 3 }}>{Number(ds.slice(8))}</div>
                    {(byDate[ds] || []).map(p => (
                      <div key={p.id} onClick={() => setSel(p.id)} title={`${camp[p.campaign_id]?.name || ""} · Day ${p.day_number}`}
                        style={{ fontSize: 9.5, padding: "2px 5px", marginBottom: 2, borderRadius: 5, cursor: "pointer", color: STATUS_COLOR[p.status], background: `${STATUS_COLOR[p.status]}18`, border: sel === p.id ? `1px solid ${STATUS_COLOR[p.status]}` : "1px solid transparent", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        D{p.day_number} · {camp[p.campaign_id]?.name || "Post"}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
                {Object.keys(STATUS_COLOR).map(s => <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "#9BA0AC" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLOR[s] }} />{STATUS_LABEL[s]}</div>)}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {selected && (
                <div style={{ ...card, borderColor: STATUS_COLOR[selected.status] + "55" }}>
                  <div style={{ fontSize: 11, color: "#9BA0AC", marginBottom: 6 }}>{camp[selected.campaign_id]?.name} · Day {selected.day_number}</div>
                  <div style={{ marginBottom: 10 }}><StatusPill status={selected.status} /></div>
                  <div style={{ fontSize: 12.5, color: "#C9CBD3", lineHeight: 1.5, maxHeight: 110, overflow: "hidden", marginBottom: 10 }}>{parsePiece(selected.content).caption}</div>
                  <input type="date" className="inp" value={selected.scheduled_date || ""} onChange={e => setDate(selected, e.target.value)} style={{ marginBottom: 8 }} />
                  <button className="sm" onClick={() => setDate(selected, null)} style={{ borderColor: "rgba(255,255,255,.14)", color: "#9BA0AC" }}>Clear date</button>
                </div>
              )}

              <div style={card}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 10 }}>Lay out a campaign</div>
                <select className="inp" value={pickCampaign} onChange={e => setPickCampaign(e.target.value)} style={{ marginBottom: 8 }}>
                  <option value="">Choose a campaign…</option>
                  {d.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="date" className="inp" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 11.5, color: "#6B6F7A", marginBottom: 10, lineHeight: 1.5 }}>Day 1 goes on the start date, Day 2 the next day, and so on.</div>
                <button className="gbtn" disabled={!pickCampaign || filling} onClick={autoSchedule} style={{ background: "linear-gradient(115deg,#4DE8FF,#7C5AFF)", color: "#0A0620" }}>{filling ? "Scheduling…" : "Schedule it"}</button>
              </div>

              <div style={card}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 10 }}>Not scheduled · {unscheduled.length}</div>
                {unscheduled.length === 0 ? <div style={{ fontSize: 12.5, color: "#565A64" }}>Everything has a date.</div> :
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                    {unscheduled.map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "#C9CBD3", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ color: STATUS_COLOR[p.status] }}>●</span> {camp[p.campaign_id]?.name} · D{p.day_number}
                        </div>
                        <input type="date" className="inp" onChange={e => e.target.value && setDate(p, e.target.value)} style={{ width: 138, padding: "6px 8px", fontSize: 12 }} />
                      </div>
                    ))}
                  </div>}
              </div>
            </div>
          </div>
        )}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// INSIGHTS
// ═══════════════════════════════════════════════════════════
const engagement = (l) => (l.likes || 0) + (l.comments || 0) + (l.shares || 0);

export function InsightsPage({ supabase, session, activeProfileId, gold, isMobile, onNavigate, callAPI, claimGeneration, brand }) {
  const d = useCampaignData({ supabase, session, activeProfileId, withLogs: true });
  const [analysis, setAnalysis] = useState("");
  const [thinking, setThinking] = useState(false);

  const stats = useMemo(() => {
    const pieceById = Object.fromEntries(d.pieces.map(p => [p.id, p]));
    const campById = Object.fromEntries(d.campaigns.map(c => [c.id, c]));
    const rows = d.logs.map(l => ({ ...l, piece: pieceById[l.piece_id], campaign: campById[pieceById[l.piece_id]?.campaign_id] }));
    const tot = rows.reduce((a, l) => ({ views: a.views + (l.views || 0), likes: a.likes + (l.likes || 0), comments: a.comments + (l.comments || 0), shares: a.shares + (l.shares || 0) }), { views: 0, likes: 0, comments: 0, shares: 0 });
    const withNumbers = rows.filter(l => (l.views || 0) + engagement(l) > 0);
    const rate = (l) => (l.views > 0 ? engagement(l) / l.views : 0);
    const top = [...withNumbers].sort((a, b) => engagement(b) - engagement(a)).slice(0, 5);
    const themes = {};
    withNumbers.forEach(l => {
      const t = l.piece?.day_theme || "Other";
      themes[t] = themes[t] || { theme: t, posts: 0, views: 0, eng: 0 };
      themes[t].posts++; themes[t].views += l.views || 0; themes[t].eng += engagement(l);
    });
    const themeList = Object.values(themes).map(t => ({ ...t, avg: t.eng / t.posts })).sort((a, b) => b.avg - a.avg);
    return { rows, tot, withNumbers, top, themeList, rate: tot.views > 0 ? (tot.likes + tot.comments + tot.shares) / tot.views : 0 };
  }, [d.logs, d.pieces, d.campaigns]);

  if (!session?.user) return <SignInNeeded isMobile={isMobile} gold={gold} eyebrow="Intelligence" title="BISHOP Insights" />;

  async function askBishop() {
    if (!(await claimGeneration())) return;
    setThinking(true); setAnalysis("");
    const data = {
      totals: stats.tot,
      engagementRatePct: +(stats.rate * 100).toFixed(2),
      topPosts: stats.top.map(l => ({ campaign: l.campaign?.name, theme: l.piece?.day_theme, views: l.views, likes: l.likes, comments: l.comments, shares: l.shares, notes: l.notes })),
      byTheme: stats.themeList.map(t => ({ theme: t.theme, posts: t.posts, avgEngagement: Math.round(t.avg) })),
    };
    const text = await callAPI(`You are BISHOP, the marketing strategist inside GENTAGAI, reading real post performance for ${brand || "this brand"}.\n\nREAL NUMBERS (do not invent any others):\n${JSON.stringify(data, null, 1)}\n\nWrite a short, plain-spoken read for the founder: what's actually working, what isn't, and the 3 next moves. Only claim what these numbers show. If the sample is small, say so. Under 150 words, no headers, no bullet symbols other than numbers for the 3 moves.`);
    setAnalysis(text); setThinking(false);
  }

  const n = (v) => (v || 0).toLocaleString();

  return (
    <Shell eyebrow="Intelligence" title="BISHOP Insights" isMobile={isMobile} gold={gold}
      sub="What your posts are really doing, from the numbers you log on each published piece.">
      <ErrorLine>{d.error}</ErrorLine>
      {d.loading ? <div style={{ fontSize: 13, color: "#565A64" }}>Loading…</div>
        : stats.withNumbers.length === 0 ? (
          <Empty action="Open Campaigns" onAction={() => onNavigate("campaigns")}>
            No numbers yet. When a campaign post goes live, log its views, likes, comments and shares in Campaigns, and the analysis builds here.
          </Empty>
        ) : (<>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
            {[["Views", n(stats.tot.views)], ["Likes", n(stats.tot.likes)], ["Comments", n(stats.tot.comments)], ["Shares", n(stats.tot.shares)], ["Engagement", (stats.rate * 100).toFixed(1) + "%"]].map(([l, v]) => (
              <div key={l} style={{ ...card, padding: "14px 16px" }}>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, color: "#4DE8FF", fontWeight: 700 }}>{v}</div>
                <div style={{ fontSize: 11, color: "#9591AC", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div style={card}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 12 }}>Top posts</div>
              {stats.top.map((l, i) => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: i ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                  <div style={{ fontSize: 13, color: "#F0F1F4" }}>{l.campaign?.name || "Post"} <span style={{ color: "#6B6F7A" }}>· {l.piece?.day_theme || l.label}</span></div>
                  <div style={{ fontSize: 12, color: "#4ADE80", whiteSpace: "nowrap" }}>{n(engagement(l))} eng.</div>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 12 }}>What kind of post lands</div>
              {stats.themeList.map((t, i) => {
                const max = stats.themeList[0].avg || 1;
                return (
                  <div key={t.theme} style={{ padding: "6px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#C9CBD3", marginBottom: 4 }}>
                      <span>{t.theme}</span><span style={{ color: "#6B6F7A" }}>{Math.round(t.avg)} avg · {t.posts} post{t.posts > 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,.06)" }}><div style={{ height: "100%", width: `${Math.max(6, (t.avg / max) * 100)}%`, borderRadius: 4, background: i === 0 ? "linear-gradient(90deg,#4ADE80,#22C55E)" : `linear-gradient(90deg,${gold},#B8935A)` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: analysis || thinking ? 12 : 0 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase" }}>BISHOP's read</div>
                <div style={{ fontSize: 12, color: "#6B6F7A", marginTop: 3 }}>Uses 1 generation. Based only on the numbers above.</div>
              </div>
              <button className="sm" disabled={thinking} onClick={askBishop} style={{ borderColor: "#4DE8FF55", color: "#4DE8FF" }}>{thinking ? "Reading…" : analysis ? "Read again" : "Ask BISHOP"}</button>
            </div>
            {analysis && <div style={{ fontSize: 14, color: "#E4E5EA", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{analysis}</div>}
          </div>
        </>)}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// NEXT MOVES — computed from real state, with an optional BISHOP take
// ═══════════════════════════════════════════════════════════
export function NextMovesPage({ supabase, session, activeProfileId, gold, isMobile, onNavigate, callAPI, claimGeneration, brand, products, brandMemories, postizStatus, brandPct }) {
  const d = useCampaignData({ supabase, session, activeProfileId, withLogs: true });
  const [take, setTake] = useState("");
  const [thinking, setThinking] = useState(false);

  const moves = useMemo(() => {
    const m = [];
    const today = todayStr();
    const add = (priority, title, why, cta, page) => m.push({ priority, title, why, cta, page });
    if (!activeProfileId) add(1, "Save your brand profile", "BISHOP can't write in your voice until it knows who you are.", "Open Brand Brief", "brand-brief");
    else if (brandPct < 100) add(2, `Finish teaching BISHOP your brand (${brandPct}%)`, "The more it knows, the less generic everything it writes sounds.", "Finish Brand Brief", "brand-brief");
    if (activeProfileId && (brandMemories || []).filter(x => x.active).length === 0) add(5, "Give BISHOP a standing rule", "One line like \"never say cheap\" gets applied to everything it writes from now on.", "Add a rule", "brand-memory");
    const prods = products || [];
    if (activeProfileId && prods.length === 0) add(3, "Add your first product", "Campaigns land harder when they're built around a real product.", "Open Showroom", "product-library");
    const thin = prods.filter(p => !p.story || !p.customer || !p.positioning);
    if (thin.length) add(4, `${thin.length} product${thin.length > 1 ? "s" : ""} missing story, customer or positioning`, thin.slice(0, 3).map(p => p.name).join(", ") + (thin.length > 3 ? "…" : ""), "Finish them", "product-library");
    if (activeProfileId && !d.loading && d.campaigns.length === 0) add(3, "Build your first campaign", "A few days of posts, written and ready for you to approve.", "Open Campaign Builder", "campaign-builder");
    const drafts = d.pieces.filter(p => p.status === "draft").length;
    if (drafts) add(1, `${drafts} post${drafts > 1 ? "s" : ""} waiting for your approval`, "Written and sitting there. Nothing goes out until you approve.", "Review them", "approvals");
    const unsched = d.pieces.filter(p => p.status === "approved" && !p.scheduled_date).length;
    if (unsched) add(2, `${unsched} approved post${unsched > 1 ? "s" : ""} with no date`, "Approved is only half the job. Put them on the calendar.", "Open Calendar", "calendar");
    const due = d.pieces.filter(p => p.status === "scheduled" && p.scheduled_date && p.scheduled_date <= today).length;
    if (due) add(0, `${due} post${due > 1 ? "s" : ""} due to go out today or earlier`, "These are scheduled for today or already past their date.", "Publish now", "publishing");
    const logged = new Set(d.logs.filter(l => (l.views || 0) + engagement(l) > 0).map(l => l.piece_id));
    const unlogged = d.pieces.filter(p => p.status === "published" && !logged.has(p.id)).length;
    if (unlogged) add(4, `${unlogged} published post${unlogged > 1 ? "s" : ""} with no numbers logged`, "Without numbers BISHOP can't tell you what's working.", "Log numbers", "performance");
    if (session?.user && !postizStatus?.connected) add(3, "Connect your social accounts", "So approved posts can go out without copy and paste.", "Open Connections", "connections");
    return m.sort((a, b) => a.priority - b.priority);
  }, [d.pieces, d.campaigns, d.logs, d.loading, activeProfileId, brandPct, brandMemories, products, postizStatus, session]);

  if (!session?.user) return <SignInNeeded isMobile={isMobile} gold={gold} eyebrow="BISHOP" title="Next Moves" />;

  async function ask() {
    if (!(await claimGeneration())) return;
    setThinking(true); setTake("");
    const facts = {
      brand, brandKnowledgePct: brandPct, products: (products || []).length, campaigns: d.campaigns.length,
      postsByStatus: Object.fromEntries(Object.keys(STATUS_COLOR).map(s => [s, d.pieces.filter(p => p.status === s).length])),
      socialConnected: !!postizStatus?.connected, openMoves: moves.map(x => x.title),
    };
    const text = await callAPI(`You are BISHOP, the strategist inside GENTAGAI. Here is the real state of ${brand || "the business"}:\n${JSON.stringify(facts, null, 1)}\n\nIn under 110 words, tell the founder the single most valuable thing to do today and why, in plain spoken language. Only use the facts above. No headers, no lists.`);
    setTake(text); setThinking(false);
  }

  return (
    <Shell eyebrow="BISHOP" title="Next Moves" isMobile={isMobile} gold={gold}
      sub="What needs you right now, worked out from what's actually in your account. Most urgent first.">
      <ErrorLine>{d.error}</ErrorLine>
      {d.loading ? <div style={{ fontSize: 13, color: "#565A64" }}>Loading…</div>
        : moves.length === 0 ? (
          <Empty>Nothing needs you right now. Your brand is set up, your posts are approved and scheduled, and your numbers are logged.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
            {moves.map((mv, i) => (
              <div key={i} style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: isMobile ? "wrap" : "nowrap", borderColor: i === 0 ? gold + "55" : "rgba(255,255,255,.08)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, color: "#F0F1F4", marginBottom: 3 }}>{mv.title}</div>
                  <div style={{ fontSize: 12.5, color: "#9591AC", lineHeight: 1.5 }}>{mv.why}</div>
                </div>
                <button className="sm" onClick={() => onNavigate(mv.page)} style={{ borderColor: i === 0 ? gold : "#4DE8FF55", color: i === 0 ? gold : "#4DE8FF", flexShrink: 0 }}>{mv.cta} →</button>
              </div>
            ))}
          </div>
        )}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: take ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase" }}>BISHOP's take</div>
            <div style={{ fontSize: 12, color: "#6B6F7A", marginTop: 3 }}>Uses 1 generation.</div>
          </div>
          <button className="sm" disabled={thinking || d.loading} onClick={ask} style={{ borderColor: "#4DE8FF55", color: "#4DE8FF" }}>{thinking ? "Thinking…" : take ? "Ask again" : "Ask BISHOP"}</button>
        </div>
        {take && <div style={{ fontSize: 14, color: "#E4E5EA", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{take}</div>}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// PUBLISHING — sends approved/scheduled posts through the user's Postiz
// ═══════════════════════════════════════════════════════════
export function PublishingPage({ supabase, session, activeProfileId, gold, isMobile, onNavigate, apiFetch, postizStatus }) {
  const d = useCampaignData({ supabase, session, activeProfileId, withLogs: true });
  const [assets, setAssets] = useState([]);
  const [acct, setAcct] = useState({});      // piece id -> integration id
  const [img, setImg] = useState({});        // piece id -> image url
  const [state, setState] = useState({});    // piece id -> {status, msg}
  const uid = session?.user?.id;

  useEffect(() => {
    if (!uid || !activeProfileId) { setAssets([]); return; }
    supabase.from("brand_vault_assets").select("*").eq("brand_profile_id", activeProfileId)
      .then(({ data }) => setAssets((data || []).filter(a => /^image\//.test(a.file_type || "") || /\.(png|jpe?g|webp|gif)$/i.test(a.url || ""))));
  }, [supabase, uid, activeProfileId]);

  if (!uid) return <SignInNeeded isMobile={isMobile} gold={gold} eyebrow="Bridge" title="Publishing" />;

  const camp = Object.fromEntries(d.campaigns.map(c => [c.id, c]));
  const ready = sortPieces(d.campaigns, d.pieces.filter(p => p.status === "approved" || p.status === "scheduled"));
  const integrations = postizStatus?.integrations || [];

  async function publish(piece) {
    const integ = integrations.find(i => i.id === (acct[piece.id] || integrations[0]?.id));
    if (!integ) return;
    setState(s => ({ ...s, [piece.id]: { status: "busy" } }));
    const { caption, hashtags } = parsePiece(piece.content);
    const content = [caption, hashtags].filter(Boolean).join("\n\n");
    try {
      const res = await apiFetch("/api/postiz-publish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: integ.id, identifier: integ.identifier || integ.platform || "", content, imageUrl: img[piece.id] || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const reason = res.status === 401 ? "Your social connection expired. Reconnect it in Connections." : (typeof data.error === "string" ? data.error : data.error?.message || "That didn't go through. Try again in a moment.");
        setState(s => ({ ...s, [piece.id]: { status: "error", msg: reason } }));
        return;
      }
      const r = await d.patchPiece(piece.id, { status: "published" });
      if (!d.logs.some(l => l.piece_id === piece.id)) {
        await supabase.from("performance_logs").insert({ user_id: uid, brand_profile_id: camp[piece.campaign_id]?.brand_profile_id || activeProfileId, piece_id: piece.id, label: `Day ${piece.day_number} — ${piece.day_theme}` });
      }
      setState(s => ({ ...s, [piece.id]: { status: "done", msg: r.error ? "Posted, but couldn't update its status here." : "Posted." } }));
    } catch {
      setState(s => ({ ...s, [piece.id]: { status: "error", msg: "Connection error. Try again in a moment." } }));
    }
  }

  return (
    <Shell eyebrow="Bridge" title="Publishing" isMobile={isMobile} gold={gold}
      sub="Send approved posts straight to your connected accounts. Only approved or scheduled posts show up here.">
      <ErrorLine>{d.error}</ErrorLine>
      {!postizStatus?.connected || integrations.length === 0 ? (
        <Empty action="Connect accounts" onAction={() => onNavigate("connections")}>You haven't connected a social account yet. Connect one and your approved posts can go out from here.</Empty>
      ) : d.loading ? <div style={{ fontSize: 13, color: "#565A64" }}>Loading…</div>
        : ready.length === 0 ? (
          <Empty action="Open Approvals" onAction={() => onNavigate("approvals")}>Nothing is ready to publish. Approve a post and it will appear here.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ready.map(p => {
              const st = state[p.id] || {};
              const { caption, hashtags, visual } = parsePiece(p.content);
              return (
                <div key={p.id} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12.5, color: "#9BA0AC" }}><span style={{ color: "#F0F1F4" }}>{camp[p.campaign_id]?.name}</span> · Day {p.day_number}{p.scheduled_date ? ` · set for ${p.scheduled_date}` : ""}</div>
                    <StatusPill status={p.status} />
                  </div>
                  <div style={{ fontSize: 13.5, color: "#E4E5EA", lineHeight: 1.55, whiteSpace: "pre-wrap", marginBottom: 6 }}>{caption}</div>
                  {hashtags && <div style={{ fontSize: 12, color: "#6B6F7A", marginBottom: 8 }}>{hashtags}</div>}
                  {visual && <div style={{ fontSize: 11.5, color: "#565A64", marginBottom: 10 }}>Visual idea: {visual}</div>}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select className="inp" value={acct[p.id] || integrations[0].id} onChange={e => setAcct(a => ({ ...a, [p.id]: e.target.value }))} style={{ width: "auto", minWidth: 170 }}>
                      {integrations.map(i => <option key={i.id} value={i.id}>{i.name || i.username || i.identifier} ({i.identifier || i.platform})</option>)}
                    </select>
                    <select className="inp" value={img[p.id] || ""} onChange={e => setImg(a => ({ ...a, [p.id]: e.target.value }))} style={{ width: "auto", minWidth: 170 }}>
                      <option value="">No image</option>
                      {assets.map(a => <option key={a.id} value={a.url}>{a.name}</option>)}
                    </select>
                    <button className="sm" disabled={st.status === "busy" || st.status === "done"} onClick={() => publish(p)} style={{ borderColor: "#4ADE8066", color: "#4ADE80" }}>{st.status === "busy" ? "Posting…" : st.status === "done" ? "Posted ✓" : "Publish now"}</button>
                  </div>
                  {st.msg && <div style={{ fontSize: 12, marginTop: 10, color: st.status === "done" ? "#4ADE80" : "#ff6a6a" }}>{st.msg}</div>}
                </div>
              );
            })}
          </div>
        )}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════
export function SettingsPage({ session, gold, isMobile, plan, planName, gensUsed, genLimit, aiBrain, setAiBrain, aiBrains, postizStatus, onNavigate, onManagePlan, onLogout }) {
  if (!session?.user) return <SignInNeeded isMobile={isMobile} gold={gold} eyebrow="Account" title="Settings" />;
  const row = (label, value) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 13.5 }}>
      <span style={{ color: "#9591AC" }}>{label}</span><span style={{ color: "#F0F1F4", textAlign: "right" }}>{value}</span>
    </div>
  );
  const accounts = postizStatus?.integrations || [];
  return (
    <Shell eyebrow="Account" title="Settings" isMobile={isMobile} gold={gold} wide={760}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 6 }}>Your account</div>
          {row("Email", session.user.email)}
          {row("Plan", planName || plan)}
          {row("Generations this month", `${gensUsed}${genLimit === Infinity ? " (unlimited)" : ` of ${genLimit}`}`)}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="sm" onClick={onManagePlan} style={{ borderColor: gold + "66", color: gold }}>{plan === "free" ? "Upgrade plan" : "Manage plan"}</button>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 6 }}>Default AI brain</div>
          <div style={{ fontSize: 12.5, color: "#6B6F7A", marginBottom: 12, lineHeight: 1.5 }}>Which model BISHOP uses first for new generations. You can still switch any time inside Create.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {aiBrains.map(b => (
              <button key={b.id} className="sm" onClick={() => { setAiBrain(b.id); try { localStorage.setItem("gentagai_default_brain", b.id); } catch {} }}
                style={{ borderColor: aiBrain === b.id ? b.color : "rgba(255,255,255,.12)", color: aiBrain === b.id ? b.color : "#9BA0AC", background: aiBrain === b.id ? `${b.color}12` : "transparent" }}>{b.icon} {b.label}</button>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 6 }}>Connected accounts</div>
          {accounts.length === 0 ? <div style={{ fontSize: 13, color: "#565A64", padding: "8px 0" }}>None connected yet.</div>
            : accounts.map(i => row(i.name || i.username || i.identifier, (i.identifier || i.platform || "").toString()))}
          <button className="sm" onClick={() => onNavigate("connections")} style={{ marginTop: 12, borderColor: "#4DE8FF55", color: "#4DE8FF" }}>Manage connections</button>
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 10 }}>Legal</div>
          <div style={{ display: "flex", gap: 16, fontSize: 13.5 }}>
            <a href="/terms.html" target="_blank" rel="noreferrer" style={{ color: "#4DE8FF" }}>Terms of Service</a>
            <a href="/privacy.html" target="_blank" rel="noreferrer" style={{ color: "#4DE8FF" }}>Privacy Policy</a>
          </div>
        </div>

        <div><button className="sm" onClick={onLogout} style={{ borderColor: "#ff6a6a44", color: "#ff6a6a" }}>Sign out</button></div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// PRODUCT CHAMBER — Performance tab
// ═══════════════════════════════════════════════════════════
export function ProductPerformance({ supabase, session, product, gold, onNavigate }) {
  const [state, setState] = useState({ loading: true, rows: [], error: "" });
  const uid = session?.user?.id;

  useEffect(() => {
    let live = true;
    (async () => {
      if (!uid || !product?.name) { setState({ loading: false, rows: [], error: "" }); return; }
      setState(s => ({ ...s, loading: true }));
      const esc = product.name.replace(/[%_\\]/g, "\\$&");
      const { data: camps, error } = await supabase.from("campaigns").select("*").ilike("product_name", esc);
      if (error) { live && setState({ loading: false, rows: [], error: "Couldn't load this product's campaigns." }); return; }
      const ids = (camps || []).map(c => c.id);
      let pieces = [], logs = [];
      if (ids.length) {
        const { data: p } = await supabase.from("campaign_pieces").select("*").in("campaign_id", ids);
        pieces = p || [];
        if (pieces.length) { const { data: l } = await supabase.from("performance_logs").select("*").in("piece_id", pieces.map(x => x.id)); logs = l || []; }
      }
      const rows = (camps || []).map(c => {
        const ps = pieces.filter(p => p.campaign_id === c.id);
        const ls = logs.filter(l => ps.some(p => p.id === l.piece_id));
        return { camp: c, posts: ps.length, published: ps.filter(p => p.status === "published").length, views: ls.reduce((a, l) => a + (l.views || 0), 0), eng: ls.reduce((a, l) => a + engagement(l), 0) };
      });
      live && setState({ loading: false, rows, error: "" });
    })();
    return () => { live = false; };
  }, [supabase, uid, product?.name]);

  if (state.loading) return <div style={{ fontSize: 13, color: "#565A64" }}>Loading…</div>;
  if (state.error) return <ErrorLine>{state.error}</ErrorLine>;
  if (state.rows.length === 0) return <Empty action="Build a campaign" onAction={() => onNavigate("campaign-builder")}>No campaigns for {product.name} yet. Campaigns built with this product's name show their results here.</Empty>;
  const tot = state.rows.reduce((a, r) => ({ views: a.views + r.views, eng: a.eng + r.eng, posts: a.posts + r.posts }), { views: 0, eng: 0, posts: 0 });
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {[["Campaigns", state.rows.length], ["Views", tot.views.toLocaleString()], ["Engagement", tot.eng.toLocaleString()]].map(([l, v]) => (
          <div key={l} style={{ ...card, padding: "12px 14px" }}><div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, color: "#4DE8FF", fontWeight: 700 }}>{v}</div><div style={{ fontSize: 11, color: "#9591AC" }}>{l}</div></div>
        ))}
      </div>
      {state.rows.map(r => (
        <div key={r.camp.id} style={{ ...card, marginBottom: 10, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div><div style={{ fontSize: 14, color: "#F0F1F4" }}>{r.camp.name}</div><div style={{ fontSize: 12, color: "#6B6F7A" }}>{r.published} of {r.posts} posts published</div></div>
          <div style={{ fontSize: 12.5, color: "#9BA0AC", textAlign: "right" }}>{r.views.toLocaleString()} views · {r.eng.toLocaleString()} engagement</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRODUCT CHAMBER — Assets tab
// ═══════════════════════════════════════════════════════════
export function ProductAssets({ supabase, session, product, activeProfileId, gold, onProductUpdated, onNavigate }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const uid = session?.user?.id;

  useEffect(() => {
    if (!uid || !activeProfileId) { setLoading(false); return; }
    supabase.from("brand_vault_assets").select("*").eq("brand_profile_id", activeProfileId).order("created_at", { ascending: false })
      .then(({ data }) => { setAssets((data || []).filter(a => /^image\//.test(a.file_type || "") || /\.(png|jpe?g|webp|gif)$/i.test(a.url || ""))); setLoading(false); });
  }, [supabase, uid, activeProfileId]);

  async function setImage(url) {
    setBusy(url || "clear"); setErr("");
    const { data, error } = await supabase.from("products").update({ image_url: url }).eq("id", product.id).select().single();
    if (error || !data) setErr("Couldn't update the product image. Try again."); else onProductUpdated(data);
    setBusy("");
  }

  return (
    <div>
      <ErrorLine>{err}</ErrorLine>
      <div style={{ ...card, display: "flex", gap: 16, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ width: 96, height: 96, borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "#565A64", fontSize: 11 }}>
          {product.image_url ? <img src={product.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "No image"}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 14, color: "#F0F1F4", marginBottom: 4 }}>Main product image</div>
          <div style={{ fontSize: 12.5, color: "#6B6F7A", lineHeight: 1.5 }}>Pick one from your Brand Vault below. BISHOP uses it as the face of this product.</div>
          {product.image_url && <button className="sm" disabled={!!busy} onClick={() => setImage(null)} style={{ marginTop: 10, borderColor: "#ff6a6a44", color: "#ff6a6a" }}>Remove image</button>}
        </div>
      </div>
      <div style={{ fontSize: 11, letterSpacing: 2, color: gold, textTransform: "uppercase", marginBottom: 10 }}>From your Brand Vault</div>
      {loading ? <div style={{ fontSize: 13, color: "#565A64" }}>Loading…</div>
        : assets.length === 0 ? <Empty action="Open Brand Vault" onAction={() => onNavigate("brand-vault")}>No images in your Brand Vault yet. Add some there and pick one here.</Empty>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
            {assets.map(a => (
              <button key={a.id} disabled={!!busy} onClick={() => setImage(a.url)} title={a.name}
                style={{ padding: 0, border: `2px solid ${product.image_url === a.url ? "#4ADE80" : "rgba(255,255,255,.08)"}`, borderRadius: 12, overflow: "hidden", background: "transparent", cursor: "pointer", aspectRatio: "1" }}>
                <img src={a.url} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>}
    </div>
  );
}
