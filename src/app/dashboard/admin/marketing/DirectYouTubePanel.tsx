"use client";
import { useEffect, useState } from "react";
type Snapshot = { configured: boolean; missing: string[]; redirectUri: string; connection: { channel_id: string; channel_title: string; channel_handle: string } | null; assets: { id: string; duration_ms: number; size_bytes: number }[]; uploads: { id: string; status: string; video_id: string | null }[] };
const endpoint = "/api/admin/beast-marketing/youtube";
export function DirectYouTubePanel() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "YouTube setup unavailable.");
      setData(result);
    } catch (error) { setData(null); throw error; }
  }
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("youtube") === "failed") setError("YouTube connection was not saved. Choose SEANGWORLD and grant both requested permissions; check Google setup if it fails again.");
    void refresh().catch(() => setError("YouTube setup unavailable. Refresh to try again."));
  }, []);
  async function connect() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${endpoint}/connect`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "YouTube connection unavailable.");
      const authorization = new URL(result.authorizationUrl);
      if (authorization.origin !== "https://accounts.google.com" || authorization.pathname !== "/o/oauth2/v2/auth") throw new Error("Invalid Google authorization destination.");
      window.location.assign(authorization.toString());
    } catch (error) {
      setError(error instanceof Error ? error.message : "YouTube connection unavailable.");
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) throw new Error("Disconnect could not be confirmed.");
      setMessage("Beast credentials removed. Existing YouTube videos remain; a transfer already in flight may finish.");
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Disconnect failed."); }
    finally { setBusy(false); }
  }
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`${endpoint}/upload`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetId: fields.get("asset"), title: fields.get("title"), description: fields.get("description"), madeForKids: fields.get("audience") === "kids", containsSyntheticMedia: fields.get("synthetic") === "yes", confirmPrivateUpload: fields.get("confirm") === "on" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload unavailable.");
      setMessage(result.reused ? result.note : "Video uploaded privately. Public publishing remains disabled.");
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Upload unavailable."); }
    finally { setBusy(false); }
  }
  const input = "mt-1 block w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-white";
  return <section className="mb-6 space-y-4 rounded-2xl border border-white/10 p-5 text-slate-200">
    <h2 className="text-xl font-black text-white">Direct YouTube · SEANGWORLD</h2>
    <p>Connect Google directly to Beast. Owner-reviewed videos can be uploaded privately; automatic and public publishing remain disabled.</p>
    {error && <p role="alert" className="text-rose-200">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!data ? <p>{error ? "Connection controls unavailable." : "Loading connection…"}</p> : <>
      {!data.configured && <div className="rounded-xl border border-amber-300/30 p-3 text-sm">
        <p className="font-bold text-amber-100">Google setup required before connecting</p>
        <p>Enable YouTube Data API v3 and configure a dedicated Web application OAuth client in Google Cloud.</p>
        <p className="mt-2 break-all">Authorized redirect URI: {data.redirectUri}</p>
        <p className="mt-2 break-words">Server configuration needed: {data.missing.join(", ")}. Credentials belong in the deployment&apos;s encrypted environment settings.</p>
      </div>}
      {data.connection ? <div><p>Connected: <strong>{data.connection.channel_title}</strong> ({data.connection.channel_handle})</p><p className="break-all text-sm">Verified channel ID: {data.connection.channel_id}</p><button className="mt-2 min-h-11 rounded-lg border border-white/20 px-4" disabled={busy} onClick={() => void disconnect()}>Disconnect Beast from YouTube</button></div> : <button type="button" onClick={() => void connect()} className="min-h-11 rounded-lg bg-amber-300 px-4 font-bold text-black disabled:opacity-50" disabled={!data.configured || busy}>Connect SEANGWORLD with Google</button>}
      <p className="text-sm text-amber-100">Google may require an API compliance audit before public uploads. A private receipt does not establish public distribution or campaign effectiveness.</p>
      {data.connection && <details><summary className="cursor-pointer font-bold">Upload an approved Short privately</summary>
        <p className="my-3 text-sm">Approve the current render below and release the global publishing pause first. Uploads require a licensed production MP4, a vertical one-to-three-minute render, and a maximum size of 32 MiB. An uncertain attempt is retained for inspection in YouTube Studio instead of being retried automatically.</p>
        <form onSubmit={upload} className="space-y-3">
          <label className="block">Reviewed video<select name="asset" required className={input} defaultValue=""><option value="" disabled>Select an approved render</option>{data.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.id} · {Math.round(asset.duration_ms / 1000)} seconds</option>)}</select></label>
          <label className="block">Title<input name="title" required maxLength={100} className={input} /></label>
          <label className="block">Description<textarea name="description" maxLength={5000} className={input} /></label>
          <label className="block">Audience<select name="audience" required defaultValue="" className={input}><option value="" disabled>Choose audience</option><option value="general">Not made for kids</option><option value="kids">Made for kids</option></select></label>
          <label className="block">Realistic altered or synthetic content?<select name="synthetic" required defaultValue="" className={input}><option value="" disabled>Choose disclosure</option><option value="yes">Yes</option><option value="no">No</option></select></label>
          <label className="flex gap-2"><input type="checkbox" name="confirm" required />I approve transferring this reviewed video and its metadata to SEANGWORLD on YouTube as a private video.</label>
          <button disabled={busy || !data.configured || !data.assets.length} className="min-h-11 rounded-lg bg-amber-300 px-4 font-bold text-black disabled:opacity-50">{busy ? "Working…" : "Upload privately"}</button>
        </form>
      </details>}
      <ul className="space-y-2">{data.uploads.map((upload) => <li key={upload.id} className="rounded-lg border border-white/10 p-3">{upload.status === "uploaded_private" ? "Uploaded privately" : "Completion unconfirmed — inspect YouTube Studio"}{upload.video_id && <a className="ml-2 text-amber-100" href={`https://www.youtube.com/watch?v=${upload.video_id}`} target="_blank" rel="noreferrer">Open private video</a>}</li>)}</ul>
    </>}
  </section>;
}
