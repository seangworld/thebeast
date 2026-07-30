"use client";

import Link from "next/link";

export type ProfessionalKnowledgeConfidence =
  | "high"
  | "medium"
  | "low"
  | "unknown";

export type ProfessionalKnowledgeAction =
  | {
      label: string;
      mode: "detail" | "edit";
      href: string;
    }
  | {
      label: string;
      mode: "conversation";
      prompt: string;
    };

export type ProfessionalKnowledgeItem = {
  id: string;
  label: string;
  summary: string;
  confidence?: ProfessionalKnowledgeConfidence;
  why?: string;
  evidence?: readonly string[];
  relatedLinks?: readonly {
    id: string;
    label: string;
    href: string;
    kind: "document" | "goal" | "timeline" | "conversation" | "workspace";
  }[];
  action: ProfessionalKnowledgeAction;
};

export type ProfessionalKnowledgeModel = {
  professionalId: string;
  professionalName: string;
  known: readonly ProfessionalKnowledgeItem[];
  thinking: readonly ProfessionalKnowledgeItem[];
  needed: readonly ProfessionalKnowledgeItem[];
  emptyStates?: {
    known?: string;
    thinking?: string;
    needed?: string;
  };
};

function KnowledgeAction({
  item,
  onAction,
}: {
  item: ProfessionalKnowledgeItem;
  onAction?: (item: ProfessionalKnowledgeItem) => void;
}) {
  const className =
    "mt-3 inline-flex min-h-11 items-center rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300";

  if (item.action.mode === "conversation") {
    return (
      <button
        type="button"
        className={className}
        disabled={!onAction}
        onClick={() => onAction?.(item)}
      >
        {item.action.label} <span aria-hidden="true">→</span>
      </button>
    );
  }

  return (
    <Link className={className} href={item.action.href}>
      {item.action.label} <span aria-hidden="true">→</span>
    </Link>
  );
}

function KnowledgeItemCard({
  item,
  kind,
  onAction,
}: {
  item: ProfessionalKnowledgeItem;
  kind: "known" | "thinking" | "needed";
  onAction?: (item: ProfessionalKnowledgeItem) => void;
}) {
  return (
    <article
      className="rounded-xl border border-white/10 bg-black/10 p-4"
      data-professional-knowledge-item={kind}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-black text-white">{item.label}</h3>
        {item.confidence ? (
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold capitalize text-slate-300">
            {item.confidence} confidence
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{item.summary}</p>
      {kind === "thinking" ? (
        <details className="mt-3 border-t border-white/10 pt-3">
          <summary className="cursor-pointer text-xs font-bold text-cyan-200">
            Why I think this
          </summary>
          <p className="mt-3 text-xs leading-5 text-slate-300">
            {item.why ||
              "This working understanding does not yet have enough evidence to explain."}
          </p>
          {item.evidence?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">
              {item.evidence.map((evidence) => (
                <li key={evidence}>{evidence}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              No supporting evidence is available yet.
            </p>
          )}
        </details>
      ) : null}
      <KnowledgeAction item={item} onAction={onAction} />
      {item.relatedLinks?.length ? (
        <nav
          className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3"
          aria-label={`${item.label} related context`}
        >
          {item.relatedLinks.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className="rounded-full border border-white/10 px-2.5 py-1.5 text-xs font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </article>
  );
}

function KnowledgeColumn({
  headingId,
  title,
  description,
  items,
  kind,
  emptyState,
  onAction,
}: {
  headingId: string;
  title: string;
  description: string;
  items: readonly ProfessionalKnowledgeItem[];
  kind: "known" | "thinking" | "needed";
  emptyState: string;
  onAction?: (item: ProfessionalKnowledgeItem) => void;
}) {
  return (
    <section
      className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-4"
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="text-lg font-black text-white"
      >
        {title}
      </h2>
      <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
      <div className="mt-4 grid gap-3">
        {items.length ? (
          items.map((item) => (
            <KnowledgeItemCard
              key={item.id}
              item={item}
              kind={kind}
              onAction={onAction}
            />
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-400">
            {emptyState}
          </p>
        )}
      </div>
    </section>
  );
}

export function ProfessionalKnowledgeWorkspace({
  model,
  onAction,
  className = "",
}: {
  model: ProfessionalKnowledgeModel;
  onAction?: (item: ProfessionalKnowledgeItem) => void;
  className?: string;
}) {
  const idPrefix = `professional-knowledge-${model.professionalId.replace(
    /[^a-z0-9-]/gi,
    "-"
  )}`;
  return (
    <section
      className={`min-w-0 ${className}`}
      aria-label={`${model.professionalName} knowledge workspace`}
      data-professional-knowledge-workspace={model.professionalId}
      data-professional-capability="knowledge"
    >
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
          Professional understanding
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Review what {model.professionalName} knows, inspect evidence-backed
          working ideas, and answer the next question that would improve future
          guidance.
        </p>
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <KnowledgeColumn
          headingId={`${idPrefix}-known`}
          title="What I Know"
          description="Structured information learned from records or conversations."
          items={model.known}
          kind="known"
          emptyState={
            model.emptyStates?.known ||
            "Nothing is confirmed yet. This area grows from information you provide or save."
          }
          onAction={onAction}
        />
        <KnowledgeColumn
          headingId={`${idPrefix}-thinking`}
          title="What I Think"
          description="Working understanding kept separate from confirmed facts."
          items={model.thinking}
          kind="thinking"
          emptyState={
            model.emptyStates?.thinking ||
            "There is not enough evidence for a useful working understanding yet."
          }
          onAction={onAction}
        />
        <KnowledgeColumn
          headingId={`${idPrefix}-needed`}
          title="What I Still Need"
          description="The highest-value unanswered questions for future guidance."
          items={model.needed}
          kind="needed"
          emptyState={
            model.emptyStates?.needed ||
            "No additional information is needed for the current guidance."
          }
          onAction={onAction}
        />
      </div>
    </section>
  );
}
