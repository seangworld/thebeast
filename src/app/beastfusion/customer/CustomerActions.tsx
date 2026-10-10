"use client";

import {useRef, useState} from "react";
import {flushSync} from "react-dom";

type Action = "download" | "save" | "copy" | "print";
type Props = {active: boolean; licenseId: string};

async function readCustomerResource(path: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, {cache: "no-store", signal: controller.signal});
    if (!response.ok) {
      if (response.status === 401) throw new Error("Please sign in again, then retry.");
      if (response.status === 403 || response.status === 404) throw new Error("An active license is required. Refresh your account or contact support.");
      throw new Error("This download is temporarily unavailable. Please retry or contact support.");
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("The request took too long. Please retry.");
    if (error instanceof TypeError || error instanceof SyntaxError) throw new Error("We couldn't reach the download service. Please retry.");
    throw error;
  } finally {clearTimeout(timer);}
}

function startDownload(href: string, filename?: string) {
  const link = document.createElement("a");
  link.href = href;
  link.rel = "noreferrer";
  link.referrerPolicy = "no-referrer";
  if (filename) link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function CustomerActions({active, licenseId}: Props) {
  const [busy, setBusy] = useState<Action | null>(null);
  const locked = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [printKey, setPrintKey] = useState("");
  const [release, setRelease] = useState<{version: string; sha256: string} | null>(null);

  async function perform(action: Action) {
    if (!active || locked.current) return;
    locked.current = true;
    setBusy(action); setMessage(""); setError(""); setPrintKey("");
    try {
      if (action === "download") {
        const data = await readCustomerResource("/api/beastfusion/customer/download");
        const url = new URL(data.download_url);
        if (url.protocol !== "https:" || url.username || url.password ||
            typeof data.version !== "string" || !/^[a-f0-9]{64}$/i.test(data.sha256 ?? "")) {
          throw new Error("The download link is unavailable. Please contact support.");
        }
        setRelease({version: data.version, sha256: data.sha256});
        startDownload(url.href);
        setMessage("Download started. Check your browser's downloads.");
        return;
      }
      const data = await readCustomerResource("/api/beastfusion/customer/license");
      if (typeof data.license_key !== "string" || !data.license_key) throw new Error("Your activation key is unavailable. Please contact support.");
      if (action === "copy") {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable. Use Save license instead.");
        try {await navigator.clipboard.writeText(data.license_key);}
        catch {throw new Error("Clipboard access was denied. Use Save license instead.");}
        setMessage("Activation key copied. Keep it private.");
      } else if (action === "save") {
        const blob = new Blob([data.license_key + "\n"], {type: "text/plain;charset=utf-8"});
        const url = URL.createObjectURL(blob);
        try {startDownload(url, "beastfusion-activation-key.txt");}
        finally {setTimeout(() => URL.revokeObjectURL(url), 1000);}
        setMessage("License file download started. Store it somewhere private.");
      } else {
        flushSync(() => setPrintKey(data.license_key));
        try {window.print();} finally {setPrintKey("");}
        setMessage("Print dialog opened. Keep your printed key private.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please retry.");
    } finally {locked.current = false; setBusy(null);}
  }

  const buttons: {action: Action; label: string}[] = [
    {action: "download", label: "Download software"}, {action: "save", label: "Save license"},
    {action: "copy", label: "Copy key"}, {action: "print", label: "Print license details"}
  ];
  return <section aria-label="Software and license" className="mt-5">
    <div className="flex flex-wrap gap-3 print:hidden" aria-busy={busy !== null}>
      {buttons.map(({action, label}) => <button key={action} type="button" className="beast-button disabled:cursor-not-allowed disabled:opacity-50" disabled={!active || busy !== null} onClick={() => void perform(action)}>{busy === action ? "Working…" : label}</button>)}
    </div>
    <p className="mt-3 text-sm text-slate-300 print:hidden">Save your activation key before installation. You can retrieve it here later while your license is active. Keep saved and printed copies private.</p>
    {message ? <p role="status" className="mt-3 text-sm text-emerald-300 print:hidden">{message}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-300 print:hidden">{error}</p> : null}
    {release ? <div className="mt-3 text-sm print:hidden"><p>Software version: {release.version}</p><p className="mt-1 break-all text-slate-400">SHA-256: {release.sha256}</p></div> : null}
    {printKey ? <div className="hidden print:block"><h2>Private activation key</h2><p>License: {licenseId}</p><p className="break-all whitespace-pre-wrap font-mono text-xs">{printKey}</p></div> : null}
  </section>;
}
