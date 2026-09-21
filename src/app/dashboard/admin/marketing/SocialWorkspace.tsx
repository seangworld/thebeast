"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { socialChannels, socialLabels, socialPostText, socialShareUrl, type SocialChannel, type SocialContent, type SocialConnection, type SocialPost } from "@/lib/marketingSocial";
import type { SocialTraffic } from "@/lib/marketingSocialTraffic";
import { MarketingSectionNav } from "./MarketingSectionNav";

type WorkspaceData = {
  posts: SocialPost[]; connections: SocialConnection[];
  controls: { paused: boolean; x_paid_enabled: boolean };
  configuration: { meta: boolean; x: boolean; scheduler: boolean; callback: string };
  campaigns: { id: string; title: string }[];
  assets: { id: string; campaign_id: string; name: string; body: string }[];
};
const endpoint = "/api/admin/beast-marketing/social";
const input = "mt-1 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-3 text-base text-white focus:border-amber-300 focus:outline-none";
const button = "min-h-11 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed";
const primary = `${button} border-amber-300 bg-amber-300 text-slate-950 hover:bg-amber-200`;
const empty: SocialContent = { text: "", destination: "https://seangworld.com", mediaUrl: "", mediaType: "none", campaignId: "" };
const formatTime = (value: string) => new Date(value).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
const statusLabel: Record<SocialPost["status"], string> = { draft: "Draft", scheduled: "Scheduled", publishing: "Sending — do not retry", processing: "Instagram processing", published: "Published", unconfirmed: "Check social account", failed: "Needs attention", cancelled: "Cancelled", shared_manually: "Manually posted · owner confirmed" };
async function api(body: unknown, suffix = "") {
  const response = await fetch(`${endpoint}${suffix}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "The action could not be completed.");
  return data;
}

export function SocialWorkspace() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState<SocialChannel>("facebook_personal");
  const [content, setContent] = useState<SocialContent>(empty);
  const [connectionId, setConnectionId] = useState("");
  const [draftId, setDraftId] = useState("");
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<"compose" | "queue" | "accounts">("compose");
  const [filter, setFilter] = useState("all");
  const [traffic, setTraffic] = useState<SocialTraffic[]>([]);
  const refresh = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load Social.");
    setData(payload);
  }, []);
  useEffect(() => {
    setDraftId(crypto.randomUUID());
    refresh().catch(e => setError(e.message));
    const result = new URLSearchParams(window.location.search).get("connection");
    if (result) setMessage(result === "connected" ? "Account connected. Select it on your draft before publishing." : result === "no_accounts" ? "No eligible accounts found. Check Page access and the linked professional Instagram account." : "Connection was not completed. Check app setup and permissions, then reconnect.");
  }, [refresh]);
  const hasPending = data?.posts.some(p => ["scheduled", "publishing", "processing"].includes(p.status));
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => { refresh().catch(() => undefined); }, 30_000);
    return () => clearInterval(timer);
  }, [hasPending, refresh]);
  async function run(task: () => Promise<unknown>, success?: string) {
    setBusy(true); setError(""); setMessage("");
    try { await task(); await refresh(); if (success) setMessage(success); }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }
  function newDraft() { setDraftId(crypto.randomUUID()); setRevision(0); setContent(empty); setConnectionId(""); setTab("compose"); }
  function adapt(post: SocialPost) { setDraftId(crypto.randomUUID()); setRevision(0); setContent(post.content); setChannel(post.channel); setConnectionId(""); setTab("compose"); }
  function edit(post: SocialPost) { setDraftId(post.id); setRevision(post.revision); setContent(post.content); setChannel(post.channel); setConnectionId(post.connection_id || ""); setTab("compose"); }
  async function upload(file?: File) {
    if (!file) return;
    await run(async () => {
      const signed = await api({ type: file.type, size: file.size }, "/media");
      const result = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type, "x-upsert": "false" }, body: file });
      if (!result.ok) throw new Error("Upload failed. Check the file type and size.");
      setContent(c => ({ ...c, mediaUrl: signed.publicUrl, mediaType: file.type.startsWith("video/") ? "video" : "image" }));
    }, "Media uploaded. It is public and ready to attach to a draft.");
  }
  const preview = socialPostText(content, channel, draftId);
  const accountOptions = data?.connections.filter(c => c.channel === channel) || [];
  return <>
    <MarketingSectionNav />
    <section className="space-y-5 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-black">Your next post starts here.</h2><p className="mt-1 text-base text-slate-300">Prepare, review, and share from BEAST.</p></div><span className="rounded-full border border-amber-300/40 px-4 py-2 text-sm text-amber-100">{data?.controls.paused !== false ? "Direct publishing paused" : "Approved queue enabled"}</span></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Social workspace views">{(["compose", "queue", "accounts"] as const).map(t => <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={tab === t ? primary : button}>{t === "compose" ? "Write a post" : t === "queue" ? `Posts & queue${data ? ` (${data.posts.length})` : ""}` : "Accounts & controls"}</button>)}<button className={button} disabled={busy} onClick={() => run(refresh)}>Refresh</button></div>
      {error && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-950/30 p-4">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-4">{message}</p>}
      {!data && !error && <p role="status">Loading your social workspace…</p>}
      {data && tab === "compose" && <div className="grid gap-5 xl:grid-cols-2">
        <form className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5" onSubmit={event => {
          event.preventDefault();
          run(async () => { const saved = await api({ action: "save", id: draftId, revision, channel, connectionId, content }); setRevision(saved.post.revision); setTab("queue"); }, "Draft saved. Review its exact text and account before publishing.");
        }}>
          <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-bold">{revision ? "Edit draft" : "New draft"}</h3><button type="button" className={button} onClick={newDraft}>New post</button></div>
          <label className="block">Post to<select className={input} value={channel} onChange={e => { setChannel(e.target.value as SocialChannel); setConnectionId(""); }}>{socialChannels.map(c => <option value={c} key={c}>{socialLabels[c]}</option>)}</select></label>
          {channel !== "facebook_personal" && <label className="block">Account<select className={input} value={connectionId} onChange={e => setConnectionId(e.target.value)}><option value="">Manual sharing / choose later</option>{accountOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}
          <details className="rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-sm font-bold">Use an existing campaign or draft</summary>
            <label className="mt-3 block">Campaign<select className={input} value={content.campaignId} onChange={e => setContent(c => ({ ...c, campaignId: e.target.value }))}><option value="">Standalone post</option>{data.campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
            <label className="mt-3 block">Saved marketing content<select className={input} value="" onChange={e => { const asset = data.assets.find(a => a.id === e.target.value); if (asset) setContent(c => ({ ...c, text: asset.body, campaignId: asset.campaign_id })); }}><option value="">Choose content to adapt</option>{data.assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          </details>
          <label className="block">Post text<textarea className={`${input} min-h-40`} required value={content.text} onChange={e => setContent(c => ({ ...c, text: e.target.value }))} placeholder="What’s new, who is it useful for, and why should they check it out?" /></label>
          <p className="text-sm text-slate-400">{content.text.length.toLocaleString()} / {channel === "x" ? "250" : channel === "instagram" ? "1,800" : "5,000"} characters before the tracked link</p>
          <label className="block">SEANGWORLD or BEAST link<input type="url" className={input} value={content.destination} onChange={e => setContent(c => ({ ...c, destination: e.target.value }))} /></label>
          <div className="rounded-xl border border-white/10 p-4 space-y-3">
            <label className="block font-bold">Image or video<input type="file" accept="image/jpeg,image/png,video/mp4" disabled={busy} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white" onChange={e => { upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
            <p className="text-sm text-slate-400">JPEG, PNG, or MP4 · up to 50 MB. Uploaded media is public. Use content you intend to share.</p>
            <details><summary className="cursor-pointer text-sm">Use an existing public media URL</summary><label className="mt-2 block">Media type<select className={input} value={content.mediaType} onChange={e => setContent(c => ({ ...c, mediaType: e.target.value as SocialContent["mediaType"] }))}><option value="none">No attachment</option><option value="image">Image</option><option value="video">Video</option></select></label><label className="mt-2 block">Owned media URL<input className={input} type="url" value={content.mediaUrl} onChange={e => setContent(c => ({ ...c, mediaUrl: e.target.value }))} /></label></details>
            {content.mediaUrl && <button className={button} type="button" onClick={() => setContent(c => ({ ...c, mediaType: "none", mediaUrl: "" }))}>Remove attachment</button>}
          </div>
          {channel === "instagram" && <p className="text-sm text-amber-100">Instagram requires an image or video. Use JPEG for direct image publishing; videos publish as Reels. Caption URLs generally aren’t clickable—use your profile link for traffic.</p>}
          {channel === "facebook_personal" && <p className="text-sm text-slate-300">Copy your text, open Facebook, and finish posting there. Facebook controls the share dialog and account selection.</p>}
          <button type="submit" disabled={busy || !draftId} className={primary}>{busy ? "Saving…" : "Save draft"}</button>
        </form>
        <div><div className="rounded-2xl border border-white/15 bg-slate-900 p-5 xl:sticky xl:top-5"><p className="text-sm uppercase tracking-wider text-amber-200">Post preview</p><h3 className="mt-2 font-bold">{accountOptions.find(c => c.id === connectionId)?.label || socialLabels[channel]}</h3><p className="mt-4 whitespace-pre-wrap break-words text-base leading-relaxed">{preview || "Your post will appear here."}</p><SocialMedia content={content} /><p className="mt-4 text-sm text-slate-400">Links include campaign and post tags for analytics. The platform determines its final layout.</p></div></div>
      </div>}
      {data && tab === "queue" && <>
        <div className="flex flex-wrap items-end justify-between gap-3"><label>Show<select className={input} value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All posts</option><option value="draft">Drafts</option><option value="scheduled">Scheduled</option><option value="published">Published / manually posted</option><option value="attention">Needs attention</option></select></label><button className={primary} onClick={newDraft}>Write a post</button></div>
        {!data.posts.length && <div className="rounded-2xl border border-dashed border-white/20 p-8"><h3 className="text-xl font-bold">Your queue is clear.</h3><p className="mt-2 text-slate-300">Write a post or adapt a saved marketing draft to get started.</p></div>}
        <div className="grid gap-4 lg:grid-cols-2">{data.posts.filter(p => filter === "all" || (filter === "published" ? ["published", "shared_manually"].includes(p.status) : filter === "attention" ? ["failed", "unconfirmed"].includes(p.status) : p.status === filter)).map(post => <PostCard key={`${post.id}:${post.revision}:${post.status}`} post={post} data={data} busy={busy} edit={edit} adapt={adapt} run={run} traffic={traffic.find(t => t.postId === post.id)} />)}</div>
        <p className="text-sm text-slate-400">Latest 100 posts. Times display in Eastern time. The queue checks every minute; processing, platform limits, or other posts may delay delivery. Delivery receipts are not visitor counts.</p><button className={button} disabled={busy} onClick={() => run(async () => { const response = await fetch(`${endpoint}/traffic`); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Analytics unavailable."); setTraffic(result.evidence); }, "Traffic evidence refreshed for published posts. Missing data is shown as unavailable.")}>Check post traffic</button> <a className="inline-block text-amber-200 underline" href="/dashboard/operations/marketing/analytics">Open traffic analytics</a>
      </>}
      {data && tab === "accounts" && <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 p-5 space-y-3"><h3 className="text-xl font-bold">Publishing controls</h3><p className="text-slate-300">Only posts you explicitly approve are sent. Pausing stops future queue work; a request already sent may finish.</p><button disabled={busy} className={primary} onClick={() => run(() => api({ action: "controls", paused: !data.controls.paused, xPaidEnabled: data.controls.x_paid_enabled, confirmXCharges: data.controls.x_paid_enabled }), data.controls.paused ? "Approved publishing enabled." : "Publishing paused.")}>{data.controls.paused ? "Enable approved publishing" : "Pause publishing"}</button>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={data.controls.x_paid_enabled} disabled={busy} onChange={e => { const checked = e.target.checked; run(() => api({ action: "controls", paused: data.controls.paused, xPaidEnabled: checked, confirmXCharges: checked }), "X publishing preference saved."); }} />Allow direct X API posting. I understand X API activity may incur charges. Manual sharing doesn’t use the X API.</label>
          {!data.configuration.scheduler && <p className="text-sm text-amber-100">Scheduled publishing needs server setup. Drafts and manual sharing remain available.</p>}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">{(["meta", "x"] as const).map(provider => <div key={provider} className="rounded-2xl border border-white/10 p-5 space-y-3"><h3 className="text-xl font-bold">{provider === "meta" ? "Facebook Page & Instagram" : "X / Twitter"}</h3><p className="text-slate-300">{provider === "meta" ? "Connect your managed Page and its linked professional Instagram account. Your personal profile uses manual sharing." : "Connect X for text and link publishing. Use the manual composer to attach images or videos."}</p><button className={button} disabled={busy || !data.configuration[provider]} onClick={() => run(async () => { const result = await api({ provider }, "/connect"); window.location.assign(result.url); })}>{data.configuration[provider] ? "Connect account" : "App setup needed"}</button>{!data.configuration[provider] && <p className="text-sm text-amber-100">Platform app credentials must be configured before account sign-in can open.</p>}</div>)}</div>
        {data.connections.map(account => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"><div><strong>{account.label}</strong><p className="text-sm text-slate-400">{socialLabels[account.channel]}{account.expires_at && Date.parse(account.expires_at) < Date.now() ? " · Reconnect if authorization has expired" : " · Connected"}</p></div><button className={button} disabled={busy} onClick={() => run(() => api({ action: "disconnect", id: account.id }), "Saved credentials removed. Platform app access can also be revoked in its settings.")}>Disconnect</button></div>)}
        <details className="rounded-xl border border-white/10 p-4"><summary className="cursor-pointer font-bold">Connection setup details</summary><p className="mt-3 text-sm break-all">Callback URL: {data.configuration.callback}</p><p className="mt-2 text-sm text-slate-300">Meta needs a developer app with Page publishing and Instagram permissions. X needs a developer app with user authorization and write access. Keep credentials in server environment settings, never in a post or browser field.</p></details>
      </div>}
    </section>
  </>;
}
function SocialMedia({ content }: { content: SocialContent }) {
  if (!content.mediaUrl || content.mediaType === "none") return null;
  return content.mediaType === "video" ? <video className="mt-4 max-h-96 w-full rounded-xl bg-black" src={content.mediaUrl} controls preload="metadata" /> : <Image src={content.mediaUrl} alt="Post attachment" width={640} height={640} unoptimized className="mt-4 max-h-96 w-full rounded-xl object-contain" />;
}
function PostCard({ post, data, busy, edit, adapt, run, traffic }: { traffic?: SocialTraffic; adapt: (p: SocialPost) => void; post: SocialPost; data: WorkspaceData; busy: boolean; edit: (p: SocialPost) => void; run: (task: () => Promise<unknown>, success?: string) => Promise<void> }) {
  const [approved, setApproved] = useState(false);
  const [time, setTime] = useState("");
  const text = socialPostText(post.content, post.channel, post.id);
  const direct = post.channel !== "facebook_personal" && !!post.connection_id && !(post.channel === "x" && post.content.mediaType !== "none");
  const account = data.connections.find(c => c.id === post.connection_id);
  const action = (name: string, extra: Record<string, unknown> = {}) => api({ action: name, id: post.id, revision: post.revision, ...extra });
  return <article className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{socialLabels[post.channel]}</h3><p className="text-sm text-slate-400">{account?.label || "Manual sharing"}</p></div><span className="rounded-lg bg-white/10 px-3 py-1 text-sm">{statusLabel[post.status]}</span></div>
    {post.scheduled_at && ["scheduled", "processing"].includes(post.status) && <p className="text-sm text-amber-100">{formatTime(post.scheduled_at)}</p>}
    <p className="whitespace-pre-wrap break-words text-base leading-relaxed">{text}</p><SocialMedia content={post.content} />
    {traffic && <div className="rounded-xl border border-white/10 p-3 text-sm"><strong>{traffic.sessions === null ? "Traffic unavailable" : `${traffic.sessions} sessions · ${traffic.engagedSessions} engaged · ${traffic.qualifiedActions ?? "Unknown"} intent actions`}</strong>{traffic.period && <p>{traffic.period}</p>}<p className="mt-1 text-slate-400">{traffic.note}</p></div>}
    {post.last_error && <p className="rounded-lg border border-amber-300/30 p-3 text-sm">{post.last_error}</p>}
    {post.status === "unconfirmed" && <p className="text-sm text-amber-100">Check the platform before preparing another post. Automatic retries are disabled for this attempt.</p>}
    {post.provider_post_id && <p className="break-all text-sm text-slate-400">Platform receipt: {post.provider_post_id}{post.channel === "x" && <a className="ml-2 text-amber-200 underline" href={`https://x.com/i/status/${post.provider_post_id}`} target="_blank" rel="noreferrer">View post</a>}</p>}
    <button className={button} disabled={busy} onClick={() => adapt(post)}>Adapt for another channel</button>
    {post.status === "draft" && <>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={() => edit(post)}>Edit</button><button className={button} disabled={busy} onClick={() => run(() => navigator.clipboard.writeText(text), "Post text copied. Paste it into the platform composer.")}>Copy text</button><a className={button} href={socialShareUrl(post)} target="_blank" rel="noreferrer">Open {post.channel === "x" ? "X" : post.channel === "instagram" ? "Instagram" : "Facebook"}</a>{post.content.mediaUrl && <a className={button} href={post.content.mediaUrl} target="_blank" rel="noreferrer">Open media</a>}</div>
      <details className="rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-sm font-bold">Finished posting manually?</summary><p className="mt-2 text-sm text-slate-300">Opening the platform does not confirm publication. Mark this only after completing the post there.</p><button className={`${button} mt-3`} disabled={busy} onClick={() => run(() => action("manual", { confirm: true }), "Recorded as manually posted, based on your confirmation.")}>I completed the post</button></details>
      {direct && <div className="space-y-3 border-t border-white/10 pt-4"><label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={approved} onChange={e => setApproved(e.target.checked)} />I approve this exact text, attachment, tracked link, and account for publication.</label><button disabled={busy || !approved || data.controls.paused} className={primary} onClick={() => run(() => action("publish", { confirm: true }), "Publish request processed. Check the post’s status.")}>Publish now</button><label className="block text-sm">Or schedule in your device’s timezone<input type="datetime-local" className={input} value={time} onChange={e => setTime(e.target.value)} /></label>{time && Number.isFinite(Date.parse(time)) && <p className="text-sm text-slate-300">{formatTime(new Date(time).toISOString())}</p>}<button disabled={busy || !approved || !time || data.controls.paused || !data.configuration.scheduler} className={button} onClick={() => run(() => action("schedule", { confirm: true, scheduledAt: new Date(time).toISOString() }), "Approved post scheduled.")}>Approve & schedule</button></div>}
    </>}
    {["scheduled", "cancelled", "failed"].includes(post.status) && <button className={button} disabled={busy} onClick={() => run(() => action("edit"), "Returned to draft. Review and approve again before sending.")}>Return to draft</button>}
    {["draft", "scheduled", "processing"].includes(post.status) && <button className={button} disabled={busy} onClick={() => run(() => action("cancel"), "Post cancelled.")}>Cancel post</button>}
  </article>;
}
