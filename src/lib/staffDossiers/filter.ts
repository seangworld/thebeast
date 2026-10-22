import type { Dossier } from './types';
export function filterStaffDossiers(input: readonly Dossier[], filters: {query?:string;department?:string;lifecycle?:string;competency?:string;dimension?:'target'|'demonstrated'|'released'}) {
 return input.filter(d=>(!filters.query || [d.name,d.role,d.id,...d.aliases].join(' ').toLowerCase().includes(filters.query.toLowerCase())) && (!filters.department || d.departments.includes(filters.department)) && (!filters.lifecycle || d.lifecycle===filters.lifecycle) && (!filters.competency || (filters.competency==='unassessed' ? !d[filters.dimension||'demonstrated'] : d[filters.dimension||'demonstrated']===filters.competency)));
}
