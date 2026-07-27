import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminPromptDomains,
  beastAdminPromptStatuses,
  buildBeastAdminPromptStatusCounts,
  filterBeastAdminPromptAssets,
  getLatestReleasedPromptVersion,
  isBeastAdminPromptVersion,
  normalizeBeastAdminPromptAssets,
  type BeastAdminPromptAsset,
} from "../src/lib/beastAdminPromptLibrary";

const asset: BeastAdminPromptAsset = {
  id: "prompt-1",
  key: "education.guidance.system",
  name: "Guidance Counselor system prompt",
  domain: "education",
  description: "Professional educational planning behavior.",
  versions: [
    {
      id: "version-2",
      version: "1.1.0",
      systemPrompt: "Lead naturally and use known educational context.",
      constraints: ["Never invent member facts."],
      variables: ["memberContext"],
      changeSummary: "Improved conversational leadership.",
      status: "released",
      releaseDate: "2026-07-26",
      authorId: "owner-1",
      authorName: "Sean",
      supersedesVersionId: "version-1",
      rollbackOfVersionId: null,
      createdAt: "2026-07-26T12:00:00.000Z",
      updatedAt: "2026-07-26T12:00:00.000Z",
    },
    {
      id: "version-1",
      version: "1.0.0",
      systemPrompt: "Provide educational guidance.",
      constraints: [],
      variables: [],
      changeSummary: "Initial managed prompt.",
      status: "archived",
      releaseDate: "2026-07-20",
      authorId: null,
      authorName: "Former owner",
      supersedesVersionId: null,
      rollbackOfVersionId: null,
      createdAt: "2026-07-20T12:00:00.000Z",
      updatedAt: "2026-07-26T12:00:00.000Z",
    },
  ],
  createdAt: "2026-07-20T12:00:00.000Z",
  updatedAt: "2026-07-26T12:00:00.000Z",
};

test("BA-107 supports every managed prompt area and lifecycle status", () => {
  assert.deepEqual(beastAdminPromptDomains, [
    "money",
    "education",
    "health",
    "goals",
    "fusion",
    "shared",
  ]);
  assert.deepEqual(beastAdminPromptStatuses, [
    "draft",
    "in_review",
    "approved",
    "released",
    "archived",
  ]);
});

test("BA-107 validates semantic versions and complete prompt history", () => {
  assert.equal(isBeastAdminPromptVersion("1.0.0"), true);
  assert.equal(isBeastAdminPromptVersion("2.1.0-beta.1"), true);
  assert.equal(isBeastAdminPromptVersion("v1"), false);
  assert.deepEqual(normalizeBeastAdminPromptAssets([asset]), [asset]);
  assert.equal(
    normalizeBeastAdminPromptAssets([
      {
        ...asset,
        versions: [{ ...asset.versions[0], releaseDate: null }],
      },
    ]),
    null
  );
});

test("BA-107 filters managed assets and reports version status honestly", () => {
  assert.deepEqual(
    filterBeastAdminPromptAssets([asset], {
      query: "conversational leadership",
      domain: "education",
      status: "released",
    }).map((item) => item.id),
    ["prompt-1"]
  );
  assert.equal(
    filterBeastAdminPromptAssets([asset], { domain: "money" }).length,
    0
  );
  assert.deepEqual(buildBeastAdminPromptStatusCounts([asset]), {
    draft: 0,
    in_review: 0,
    approved: 0,
    released: 1,
    archived: 1,
  });
  assert.equal(getLatestReleasedPromptVersion(asset)?.version, "1.1.0");
});

test("BA-107 migration keeps prompt assets owner-only and version history immutable", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000500_add_beast_admin_prompt_library.sql",
    "utf8"
  );

  assert.match(migration, /beast_admin_prompt_assets/);
  assert.match(migration, /beast_admin_prompt_versions/);
  assert.match(
    migration,
    /'money', 'education', 'health', 'goals', 'fusion', 'shared'/
  );
  assert.match(
    migration,
    /'draft', 'in_review', 'approved', 'released', 'archived'/
  );
  assert.match(migration, /version ~ '\^\(0\|/);
  assert.match(migration, /change_summary/);
  assert.match(migration, /release_date/);
  assert.match(migration, /author_id/);
  assert.match(migration, /author_name/);
  assert.match(migration, /supersedes_version_id/);
  assert.match(migration, /rollback_of_version_id/);
  assert.match(migration, /Prompt version content is immutable/);
  assert.match(migration, /Rollback source must belong to the same prompt/);
  assert.match(migration, /one_release_idx/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /public\.is_profile_admin\(\)/g);
  assert.match(migration, /auth\.uid\(\) = owner_id/g);
  assert.match(migration, /BeastAdmin owner access required/g);
  assert.match(migration, /get_beast_admin_prompt_library/);
  assert.match(migration, /save_beast_admin_prompt_asset/);
  assert.match(migration, /create_beast_admin_prompt_version/);
  assert.match(migration, /transition_beast_admin_prompt_version/);
  assert.match(
    migration,
    /current_version\.status = 'approved'[\s\S]*selected_status in \('in_review', 'released', 'archived'\)/
  );
  assert.match(migration, /Released prompts require a release date/);
  assert.match(migration, /revoke all on function/g);
  assert.doesNotMatch(
    migration,
    /insert into public\.beast_admin_prompt_assets[\s\S]*values \(\s*'[a-z]/
  );
});

test("BA-107 presents central management, release history, and future rollback", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/prompts/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/prompts/BeastAdminPromptLibraryWorkspace.tsx",
    "utf8"
  );
  const model = readFileSync(
    "src/lib/beastAdminPromptLibrary.ts",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(page, /Prompt Library/);
  assert.match(page, /BeastAdminPromptLibraryWorkspace/);
  assert.match(workspace, /\.rpc\(\s*"get_beast_admin_prompt_library"/);
  assert.match(workspace, /save_beast_admin_prompt_asset/);
  assert.match(workspace, /create_beast_admin_prompt_version/);
  assert.match(workspace, /transition_beast_admin_prompt_version/);
  assert.match(model, /money: "Money"/);
  assert.match(model, /education: "Education"/);
  assert.match(model, /health: "Health"/);
  assert.match(model, /goals: "Goals"/);
  assert.match(model, /fusion: "Fusion"/);
  assert.match(model, /shared: "Shared prompts"/);
  assert.match(workspace, /Version History/);
  assert.match(workspace, /What changed/);
  assert.match(workspace, /Release date/);
  assert.match(workspace, /authorName/);
  assert.match(workspace, /Prepare rollback/);
  assert.match(workspace, /No managed prompts exist yet/);
  assert.match(workspace, /live AI behavior remains unchanged/i);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.match(navigation, /Prompt Library/);
});

test("BA-125 explains prompt structure governance and explicit runtime adoption", () => {
  const workspace = readFileSync(
    "src/app/dashboard/admin/prompts/BeastAdminPromptLibraryWorkspace.tsx",
    "utf8"
  );

  for (const example of [
    "money.coach.system",
    "education.guidance.system",
    "health.advisor.system",
    "goals.coach.system",
    "fusion.shared-context",
  ]) {
    assert.match(workspace, new RegExp(example.replace(/[.-]/g, "\\$&")));
  }

  assert.match(workspace, /Prompt key/);
  assert.match(workspace, /Purpose/);
  assert.match(workspace, /Area/);
  assert.match(
    workspace,
    /Prompt Assets[\s\S]*Prompt Versions[\s\S]*Approved[\s\S]*Released[\s\S]*Runtime Adoption/
  );
  assert.match(workspace, /Prompt Library governs prompts/);
  assert.match(
    workspace,
    /does not automatically change runtime AI behavior/
  );
  assert.match(workspace, /separate, explicit implementation decision/);
});
