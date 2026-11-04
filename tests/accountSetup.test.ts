import test from 'node:test';
import assert from 'node:assert/strict';
import {accountSetupPath, accountSetupStage, usernameClaimFailure} from '../src/lib/auth/accountSetup';
test('setup requires verified identity, own canonical username, and existing profile completion',()=>{
 const profile={preferred_name:'Sean',birthday:'1980-01-01'};
 assert.equal(accountSetupStage(false,'existing',profile),'verification');
 assert.equal(accountSetupStage(true,null,profile),'username');
 assert.equal(accountSetupStage(true,'existing',{...profile,birthday:null}),'profile');
 assert.equal(accountSetupStage(true,'existing',profile),'ready');
 assert.equal(accountSetupStage(true,'EXISTING',{full_name:'Existing name',birthday:'1980-01-01'}),'ready');
});
test('setup return destinations cannot become an external redirect',()=>{
 assert.equal(accountSetupPath('/dashboard/beastguide'),'/account-setup?next=%2Fdashboard%2Fbeastguide');
 for(const url of ['https://evil.test','//evil.test','/\\evil.test','/account-setup'])assert.equal(accountSetupPath(url),'/account-setup?next=%2Fdashboard%2Ftoday');
});
test('claim failures distinguish unavailable names and already-assigned identities without raw SQL',()=>{
 assert.match(usernameClaimFailure({code:'23505',message:'usernames_user_id_key'}),/already has/);
 assert.match(usernameClaimFailure({code:'23505',message:'usernames_pkey'}),/unavailable/);
 assert.match(usernameClaimFailure({code:'23514'}),/3–32/);
 assert.doesNotMatch(usernameClaimFailure({code:'XX000',message:'private SQL details'}),/private SQL/);
});
