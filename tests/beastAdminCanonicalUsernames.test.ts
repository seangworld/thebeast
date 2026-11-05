import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {normalizeBeastAdminMemberDirectory} from "../src/lib/beastAdminMemberTimeline";
import {getBeastAdminMemberUsernameLabel,buildBeastAdminManagedMemberDirectory,filterBeastAdminManagedMembers,sortBeastAdminManagedMembers,paginateBeastAdminManagedMembers} from "../src/lib/beastAdminMemberManagement";
const raw={id:"guide-account",username:"GuideChosen",displayName:"Different display",email:"prefix@example.invalid",emailVerificationStatus:"verified",accountStatus:"active",accountKind:"member",role:"member",householdRole:null,moduleAccessOverrides:[],betaAssignments:[],createdAt:"2026-11-04T12:00:00Z",profileCreatedAt:null,lastSignInAt:null,lastActivityAt:null,eventCount:0};
test("canonical username survives normalization; missing assignment never uses display name or email",()=>{
 const entries=normalizeBeastAdminMemberDirectory([raw,{...raw,id:"unset",username:null},{...raw,id:"legacy",username:undefined}])!;
 assert.equal(getBeastAdminMemberUsernameLabel(entries[0]),"GuideChosen");
 assert.equal(getBeastAdminMemberUsernameLabel(entries[1]),"Setup Required");assert.equal(getBeastAdminMemberUsernameLabel(entries[2]),"Setup Required");
 assert.equal(normalizeBeastAdminMemberDirectory([{...raw,username:42}]),null);
 const members=buildBeastAdminManagedMemberDirectory({members:entries,usage:[],usageEvidenceAvailable:true});
 assert.equal(filterBeastAdminManagedMembers(members,{query:"guidechosen",role:"all",accountStatus:"all",emailVerification:"all",moduleUsage:"all",betaStatus:"all",lastActive:"all"}).length,1);
 assert.equal(sortBeastAdminManagedMembers(members,"username","asc")[0].id,"guide-account");
 assert.equal(paginateBeastAdminManagedMembers(members,1,15).items.length,3);
});
test("directory SQL changes only canonical readback; retains owner authorization and all account rows",()=>{
 const old=readFileSync("supabase/migrations/20260726001000_add_beast_admin_member_account_editing.sql","utf8"); const start=old.indexOf("create or replace function public.get_beast_admin_member_directory()");const original=old.slice(start,old.indexOf("$$;",start)+3);
 const sql=readFileSync("supabase/migrations/20261105041820_admin_canonical_member_usernames.sql","utf8");const newStart=sql.indexOf("create or replace function");const updated=sql.slice(newStart,sql.indexOf("$$;",newStart)+3);
 assert.equal(updated.replace("        'username', canonical_username.username,\n","").replace("\n  left join beast_identity.usernames canonical_username on canonical_username.user_id = auth_user.id",""),original);
 assert.match(sql,/revoke all[\s\S]*from public, anon/);assert.match(sql,/grant execute[\s\S]*to authenticated/);
 const ui=readFileSync("src/app/dashboard/admin/members/BeastAdminMemberManagementTable.tsx","utf8");assert.equal((ui.match(/\{getBeastAdminMemberUsernameLabel\(member\)\}/g)||[]).length,5);assert.match(ui,/\["Username", "username"\]/);
});
