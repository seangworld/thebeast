import type { ConversationState, RuntimeMessage } from '../digitalStaffRuntime/types';
import type { VeteranClaim } from './veteranClaims';

export type VeteransTurnSelection = {
  version: 1;
  claim: { id: string; revision: number; updatedAt: string | null } | null;
  documents: { id: string; sha256: string | null; updatedAt: string | null }[];
};
export type VeteransContext = { selection: VeteransTurnSelection; memberClaim: VeteranClaim | null };
export type VeteransHistoryRow = {
  id: string; sender: {kind?: string} | null; created_at: string;
  content: unknown;
};
const emptyState: ConversationState = {currentTopic:null,currentWorkspace:null,lastProfessionalQuestion:null,unresolvedQuestions:[],corrections:[],pendingApprovals:[],currentGoal:null,previousDecisions:[]};
function runtimeOf(row: VeteransHistoryRow) {
  const content=row.content as {runtime?:{veteransSelection?:VeteransTurnSelection;sourceMessageId?:string}} | null;
  return content && typeof content==='object' ? content.runtime : undefined;
}
function claimKey(scope: VeteransTurnSelection | null | undefined) {
  return !scope ? 'health' : scope.claim ? `${scope.claim.id}:${scope.claim.revision}:${scope.claim.updatedAt}` : `veterans-general:${JSON.stringify(scope.documents || [])}`;
}
function selectionKey(scope: VeteransTurnSelection | null | undefined) {
  return `${claimKey(scope)}:${JSON.stringify(scope?.documents || [])}`;
}
/** Preserve stored conversations, but never silently reuse another issue's facts/state. */
export function scopeVeteransHistory(rows: VeteransHistoryRow[], current: VeteransTurnSelection | null, previous: VeteransTurnSelection | null | undefined, state: ConversationState) {
  const userScopes=new Map<string,VeteransTurnSelection>();
  for(const row of rows){const meta=runtimeOf(row);if(meta?.veteransSelection && typeof meta.sourceMessageId==='string')userScopes.set(meta.sourceMessageId,meta.veteransSelection);}
  const messages: RuntimeMessage[]=[];
  for(const row of rows){
    const scope=runtimeOf(row)?.veteransSelection || userScopes.get(row.id);
    // Untagged legacy turns cannot be asserted to belong to a selected claim.
    if(current ? !scope || claimKey(scope)!==claimKey(current) : Boolean(scope))continue;
    const value=row.content as {text?:unknown} | null;
    const text=typeof value==='string' ? value : typeof value?.text==='string' ? value.text : '';
    if(text)messages.push({id:row.id,role:row.sender?.kind==='user'?'user':'assistant',text,createdAt:row.created_at,...(scope?{veteransSelection:scope}:{})});
  }
  return {messages,state:selectionKey(current)===selectionKey(previous)?state:structuredClone(emptyState),excludedCount:rows.length-messages.length};
}

export const veteransEvidenceBoundary = 'The selected claim, tracker statuses, saved draft and health source labels are member-entered/unverified. Stored/canonical provenance means loaded from the member store, not clinically or VA verified. A claimed condition is not a diagnosis; submitted is self-reported. Selected originals were supplied this turn, but their authenticity, completeness and relevance to this claim are not independently verified. Cite only visible document text/pages; say when missing or unreadable. Prior assistant drafts/examples/state are not factual sources. Prior documents not attached this turn are not freshly reviewed. Preserve conflicts and laterality; never infer a nexus, continuous symptoms, dates, deadlines, diagnoses or eligibility. Ground each draft clause in explicit member account or visible supplied evidence; mark unknowns/questions outside the draft. Saving preparation is not filing or contacting VA.';
