import type { ExternalResourceEventType, ExternalResourceRecommendation } from "@/lib/platform/externalResources";
import { externalResourceLinkProps } from "@/lib/platform/externalResources";

export function ExternalResourceCard({ recommendation, onEvent }: {
  recommendation: ExternalResourceRecommendation;
  onEvent?: (type: ExternalResourceEventType, recommendation: ExternalResourceRecommendation) => void;
}) {
  return (
    <article className="grid min-w-0 content-between gap-4 rounded-xl border border-[#2a3242] bg-[#0f1419] p-4">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase text-indigo-200">
          <span aria-hidden="true" className="grid h-7 min-w-7 place-items-center rounded-md bg-indigo-300/10 px-1">{recommendation.providerIcon}</span>
          <span className="truncate">{recommendation.providerName}</span>
        </div>
        <h3 className="mt-3 break-words font-black text-white">{recommendation.title}</h3>
        <p className="mt-2 text-sm leading-5 text-[#aeb9ca]">{recommendation.whyRecommended}</p>
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#8d9aae]">
          <div><dt className="sr-only">Cost</dt><dd>{recommendation.cost}</dd></div>
          <div><dt className="sr-only">Difficulty</dt><dd>{recommendation.difficulty}</dd></div>
          <div><dt className="sr-only">Estimated time</dt><dd>{recommendation.estimatedTime}</dd></div>
        </dl>
        {recommendation.verificationNote ? <p className="mt-3 text-xs leading-5 text-[#78869a]">{recommendation.verificationNote}</p> : null}
        {recommendation.disclosure ? <p className="mt-3 text-xs leading-5 text-amber-100">{recommendation.disclosure}</p> : null}
      </div>
      <a
        {...externalResourceLinkProps}
        href={recommendation.externalUrl}
        onClick={() => onEvent?.("resource-opened", recommendation)}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-indigo-300/40 bg-indigo-300/10 px-4 py-2 text-sm font-bold text-indigo-100 hover:border-indigo-200"
      >
        Open resource <span aria-hidden="true" className="ml-2">↗</span><span className="sr-only"> in a new tab</span>
      </a>
    </article>
  );
}
