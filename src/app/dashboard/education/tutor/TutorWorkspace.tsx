"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ServerAgentConversationRepository,
  SupabaseAgentConversationStore,
} from "@/lib/platform/agents/serverConversationPersistence";
import type { AgentConversationThread } from "@/lib/platform/agents/conversationPersistence";
import type { AgentMessage } from "@/lib/platform/agents/types";
import type { LearningImageAttachment, OpenAILearningMessage } from "@/lib/learning/types";
import { buildPersistedTutorAnswer, maximumTutorImageBytes } from "@/lib/learning/tutorRequest";
import {
  ProfessionalConversationAvatar,
  tutorConversationIdentity,
} from "@/app/components/agents/ProfessionalConversationIdentity";

const tutorId = "beasteducation.tutor";
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type Turn = { id: string; role: "user" | "assistant"; text: string; timestamp: string; attachmentName?: string };

function turnsFromThread(thread: AgentConversationThread | null): Turn[] {
  if (!thread) return [];
  const turns: Turn[] = [];
  for (const message of thread.messages) {
    if (message.sender.kind === "user" && typeof message.content === "string") {
      turns.push({ id: message.id, role: "user", text: message.content, timestamp: message.timestamp });
      continue;
    }
    if (message.sender.kind === "agent" && message.content && typeof message.content === "object") {
      const content = message.content as Record<string, unknown>;
      if (content.kind === "tutor_answer" && typeof content.text === "string") {
        turns.push({ id: message.id, role: "assistant", text: content.text, timestamp: message.timestamp, attachmentName: typeof content.attachmentName === "string" ? content.attachmentName : undefined });
      }
    }
  }
  return turns;
}

function fileAsAttachment(file: File): Promise<LearningImageAttachment> {
  if (!imageTypes.has(file.type)) return Promise.reject(new Error("Use a JPEG, PNG, or WebP image."));
  if (file.size > maximumTutorImageBytes) return Promise.reject(new Error("Homework images must be 3 MB or smaller."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => resolve({ dataUrl: String(reader.result), fileName: file.name.slice(0, 120), mediaType: file.type as LearningImageAttachment["mediaType"] });
    reader.readAsDataURL(file);
  });
}

export default function TutorWorkspace() {
  const [ownerId, setOwnerId] = useState("");
  const [repository, setRepository] = useState<ServerAgentConversationRepository | null>(null);
  const [thread, setThread] = useState<AgentConversationThread | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [request, setRequest] = useState("");
  const [attachment, setAttachment] = useState<LearningImageAttachment>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const conversationMessages = useMemo<OpenAILearningMessage[]>(() => turns.slice(-12).map((turn) => ({ role: turn.role === "assistant" ? "assistant" : "user", content: turn.text })), [turns]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const client = createClient();
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (authError || !user) throw new Error("Sign in to use your AI Tutor.");
        const nextRepository = new ServerAgentConversationRepository(new SupabaseAgentConversationStore(client));
        const existing = await nextRepository.list({ ownerId: user.id, agentId: tutorId });
        const activeThread = existing[0] || await nextRepository.create({ ownerId: user.id, agentId: tutorId, title: "Tutor session", tags: ["beasteducation", "tutor"] });
        if (!active) return;
        setOwnerId(user.id); setRepository(nextRepository); setThread(activeThread); setTurns(turnsFromThread(activeThread));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Your Tutor workspace could not load.");
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function startNewConversation() {
    if (!repository || !ownerId || busy) return;
    const next = await repository.create({ ownerId, agentId: tutorId, title: "Tutor session", tags: ["beasteducation", "tutor"] });
    setThread(next); setTurns([]); setRequest(""); setAttachment(undefined); setError("");
  }

  async function chooseImage(file?: File) {
    if (!file) return;
    try { setAttachment(await fileAsAttachment(file)); setError(""); }
    catch (cause) { setAttachment(undefined); setError(cause instanceof Error ? cause.message : "The image could not be attached."); }
  }

  async function send() {
    const text = request.trim() || (attachment ? "Help me understand this assignment. Start by telling me what you can clearly read, then guide me through the first step." : "");
    if (!text || !repository || !thread || !ownerId || busy) return;
    setBusy(true); setError("");
    const timestamp = new Date().toISOString();
    const userMessage: AgentMessage = { id: crypto.randomUUID(), threadId: thread.id, sender: { kind: "user", id: ownerId }, recipient: { kind: "agent", id: tutorId }, content: text, timestamp };
    const pendingTurn: Turn = { id: userMessage.id, role: "user", text, timestamp, attachmentName: attachment?.fileName };
    setTurns((current) => [...current, pendingTurn]); setRequest("");
    try {
      await repository.append(ownerId, thread.id, [userMessage]);
      const response = await fetch("/api/learning/ai", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userRequest: text, subject: "Homework", goal: attachment ? "Review the provided homework image through guided reasoning" : "Teach for understanding", messages: [...conversationMessages, { role: "user", content: text }], imageAttachment: attachment }) });
      const payload = await response.json() as { error?: string; response?: { content?: string; status?: string } };
      if (!response.ok || !payload.response?.content) throw new Error(payload.error || "Your Tutor could not respond.");
      const answer = payload.response.content;
      const agentMessage: AgentMessage = { id: crypto.randomUUID(), threadId: thread.id, sender: { kind: "agent", id: tutorId }, recipient: { kind: "module", id: "beasteducation" }, content: buildPersistedTutorAnswer(answer, attachment?.fileName), timestamp: new Date().toISOString() };
      const updated = await repository.append(ownerId, thread.id, [agentMessage]);
      setThread(updated); setTurns(turnsFromThread(updated)); setAttachment(undefined);
      if (fileInput.current) fileInput.current.value = "";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your Tutor could not respond.");
    } finally { setBusy(false); }
  }

  return (
    <main className="beast-page" data-tour-id="beasteducation-tutor-workspace">
      <div className="beast-container space-y-6">
        <header className="rounded-2xl border border-indigo-300/20 bg-[#111827] p-6" data-tour-step="tutor-welcome">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4"><ProfessionalConversationAvatar identity={tutorConversationIdentity} size="lg" /><div><p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-300">BeastEducation</p><h1 className="text-3xl font-black text-white">AI Tutor & Homework Helper</h1><p className="mt-1 text-sm text-slate-300">Riley teaches schoolwork. Your Guidance Counselor helps plan where your education is going.</p></div></div>
            <button type="button" className="beast-button-secondary" onClick={() => void startNewConversation()} data-analytics-event="conversation_created" data-analytics-category="ai_tutor">New session</button>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#111827] p-5" aria-label="Tutor conversation" data-tour-step="tutor-conversation">
          {turns.length ? <div className="space-y-4" aria-live="polite">{turns.map((turn) => <article key={turn.id} className={`rounded-xl border p-4 ${turn.role === "user" ? "ml-auto max-w-3xl border-indigo-300/20 bg-indigo-300/10" : "mr-auto max-w-4xl border-white/10 bg-black/20"}`}><p className="text-xs font-black uppercase tracking-wide text-indigo-200">{turn.role === "user" ? "You" : "Riley · AI Tutor"}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">{turn.text}</p>{turn.attachmentName ? <p className="mt-2 text-xs text-slate-400">Used in this request: {turn.attachmentName}. Image bytes were not saved in conversation history.</p> : null}</article>)}</div> : <div className="rounded-xl border border-dashed border-indigo-300/20 p-8 text-center"><h2 className="text-xl font-black text-white">What are you working on?</h2><p className="mt-2 text-sm text-slate-300">Type a question, attach a clear homework photo, or ask Riley to check work you already completed.</p></div>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827] p-5" data-tour-step="tutor-upload">
          <label className="block text-sm font-black text-white" htmlFor="tutor-request">Ask Riley</label>
          <textarea id="tutor-request" className="beast-input mt-2 min-h-28 w-full" value={request} onChange={(event) => setRequest(event.target.value)} placeholder="Example: I tried question 4. Can you find the first step where my work went wrong?" maxLength={8000} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="beast-button-secondary cursor-pointer"><input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseImage(event.target.files?.[0])} />Take or attach a homework photo</label>
            {attachment ? <span className="text-sm text-indigo-200">Attached: {attachment.fileName}</span> : null}
            {attachment ? <button type="button" className="text-sm font-bold text-slate-300 underline" onClick={() => { setAttachment(undefined); if (fileInput.current) fileInput.current.value = ""; }}>Remove</button> : null}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">JPEG, PNG, or WebP up to 3 MB. The image is sent only for this tutoring request and is not saved in Tutor conversation history. Riley will say when text is unreadable.</p>
          {error ? <p role="alert" className="mt-3 rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p> : null}
          <button type="button" className="beast-button mt-4" disabled={busy || (!request.trim() && !attachment) || !thread} onClick={() => void send()} data-analytics-event="call_to_action_selected" data-analytics-category="ai_tutor" data-analytics-status="started">{busy ? "Riley is working…" : "Start tutoring"}</button>
        </section>

        <aside className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-50"><strong>Learning first:</strong> Riley gives hints, examples, and guided corrections before simply revealing an answer. Check important graded work against your teacher’s instructions or official answer key.</aside>
      </div>
    </main>
  );
}
