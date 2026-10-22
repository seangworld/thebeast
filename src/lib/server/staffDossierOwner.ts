import { redirect } from 'next/navigation';
import { createRouteClient } from '../supabase/server';
import { isBeastAdminOwnerRole } from '../beastAdmin';
/** No dossier payload is rendered/serialized before verified owner authorization. */
export async function requireStaffDossierOwner() {
 const client=createRouteClient();
 const {data:{user},error}=await client.auth.getUser();
 if(error || !user)redirect('/login?next=%2Fdashboard%2Foperations%2Fstaff');
 const profile=await client.from('profiles').select('role').eq('id',user.id).maybeSingle();
 if(profile.error || !isBeastAdminOwnerRole(profile.data?.role))redirect('/dashboard');
}
