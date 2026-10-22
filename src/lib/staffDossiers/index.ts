import { digitalProfessionals } from '../digitalStaff';
import { professionalConfigs } from '../digitalStaffRuntime/config';
import { developmentAgentProfiles } from '../developmentAgentProfiles';
import { getDevelopmentAgentCapabilityAssessment } from '../developmentAgentCapabilityFramework';
import inventory from './external-inventory.json';
import reviews from './reviews.json';
import maintenance from './maintenance.json';
import type { Assessment, Dossier, Evidence } from './types';
export const competencyScale = ['L1 — basic role questions', 'L2 — directed routine tasks', 'L3 — contextual workflows and corrections', 'L4 — reliable complex workflows and tools', 'L5 — full intended role across demanding scenarios'];
const issue = 'https://github.com/seangworld/thebeast/issues/274';
export const inventorySources = inventory.sources;
export const inventoryReconciliation = inventory.reconciliation;
const base = (id: string, name: string, role: string, departments: string[], duties: string[], permissions: string[], limitations: string[], source: string): Dossier => ({
 id, name, role, departments, products: departments, aliases: [], reportsTo: 'Sean — Owner', mission: role, duties, permissions,
 lifecycle: 'limited', assignment: 'Maintain existing approved duties; no new activation.', availability: 'Unknown — static source review, not live telemetry.',
 target: null, demonstrated: null, released: null, assessments: [], strengths: [], limitations, blockers: [], releases: [],
 deferred: [{title:'Reconcile role-specific evidence',priority:'normal',desiredLevel:null,gap:'No supported competency level assigned.',requiredWork:'Review existing role evidence and unresolved criteria locally; do not initiate paid testing.',success:'Each claimed level has role-specific dated evidence and reviewer attribution.',cost:'Unknown; no paid evaluation or new service authorized.',status:'Deferred — owner prioritization; any spending decision belongs to Sean.'}],
 evidence:[{title:'Existing profile / source',url:source,kind:'source registry',reviewer:'Codex source reconciliation (executor)',date:'2026-10-21',version:'Issue #274 initial import'}],
 history:[{date:'2026-10-21',executor:'Codex',why:'Centralized existing identity and evidence without inferring competency or availability.',version:'Issue #274'}],reviewedAt:'2026-10-21',
 costs:{confirmedChargesUsd:null,usageEstimateUsd:null,unresolvedReservationsUsd:null,note:'No invoice-confirmed cost record. Unknown is not zero.'},
});
const staff: Dossier[] = digitalProfessionals.map(p => {
 const config = professionalConfigs[p.canonicalId as keyof typeof professionalConfigs];
 const d = base(p.canonicalId,p.name,p.role,[p.team],[...p.responsibilities],[...config.allowedTools.map(x=>'Tool: '+x),...config.dataDomains.map(x=>'Permissioned data: '+x),...config.approvalRequiredTools.map(x=>'Owner approval required: '+x)], [...p.limitations,...p.unavailableData.map(x=>'Unavailable data: '+x),...config.prohibitedActions.map(x=>'Prohibited: '+x)],'https://github.com/seangworld/thebeast/blob/main/src/lib/digitalStaff.ts');
 d.aliases=[p.id,config.name];d.products=[...p.assignedModules];d.reportsTo=p.reportsTo;d.mission=p.mission;d.lifecycle='active';
 return d;
});
for (const p of developmentAgentProfiles) {
 const d=base('beastfusion.'+p.id,p.name,p.role,['BeastFusion'],[...p.responsibilities],[p.authorityBoundary],[...p.limitations],'https://github.com/seangworld/thebeast/blob/main/src/lib/developmentAgentProfiles.ts');
 d.aliases=[p.id,...(p.id==='orchestrator-3'?['ecosystem_orchestrator']:p.id==='reviewer-agent'?['validation_reviewer','reviewer_agent']:[p.id.replace(/-/g,'_')])];d.mission=p.purpose;
 const a=getDevelopmentAgentCapabilityAssessment(p.id);
 if(a){d.autonomy=JSON.stringify(a.autonomy);d.assessments=[{role:p.role,summary:'Existing BeastFusion assessment retained in its own autonomy/capability framework. Not mapped to staff competency L1–L5.',criteria:a.capability.map(c=>({criterion:JSON.stringify(c),result:'not applicable',reason:'Different framework; see preserved dimension verdict and evidence, not a new competency grade.'})),evidence:[{title:a.assessmentId,url:'https://github.com/seangworld/thebeast/blob/main/src/lib/development-agent-capability-projection.json',kind:'source registry',reviewer:'Canonical BeastFusion projection; independence not inferred',date:a.assessedAt,version:a.assessedVersion}]}];}
 staff.push(d);
}
for (const p of inventory.staff) {
 const d=base(p.id,p.name,p.role,p.departments,[...p.duties],[...p.permissions],[...p.limitations],p.source);
 d.lifecycle=p.lifecycle as Dossier['lifecycle'];d.aliases=[...p.aliases];d.mission=p.mission;staff.push(d);
}
for (const d of staff) {
 const r=(reviews as Record<string, Partial<Dossier>>)[d.id]; if(r)Object.assign(d,r);
 if(!d.assessments.length)d.assessments=[{role:d.role,summary:'Source-defined duties; acceptance remains unassessed. No test count or lifecycle is converted to a competency level.',criteria:d.duties.map(criterion=>({criterion,result:'not tested',reason:'No reviewed role-specific assessment linked for this criterion.'})),evidence:d.evidence} satisfies Assessment];
 d.history=[...d.history,...maintenance.changes.filter(c=>c.affectedStaffIds.includes(d.id)).map(c=>({date:c.date,executor:c.executor,why:c.reason,version:c.version}))];
 d.evidence=[...d.evidence,...d.assessments.flatMap(a=>a.evidence)];
}
export const staffDossiers: readonly Dossier[] = staff;
export function getStaffDossier(id: string) { return staffDossiers.find(d=>d.id===id || d.aliases.includes(id)); }
export { filterStaffDossiers } from './filter';
export const staffDossierPolicy = {canonicalHome:'/dashboard/operations/staff',tracking:issue,noPaidTesting:true,lastReviewed:'2026-10-21'};
