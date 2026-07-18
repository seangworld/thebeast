import manifest from "./version-manifest.json";

export const versionManifest = manifest.identities;
export const APP_VERSION = `v${versionManifest.beastos.version}`;
export const APP_VERSION_LABEL = `${versionManifest.beast.name} v${versionManifest.beast.version}`;
export const BEAST_MONEY_VERSION = `v${versionManifest.beastmoney.version}`;
export const BEAST_MONEY_VERSION_LABEL = `${versionManifest.beastmoney.name} ${BEAST_MONEY_VERSION}`;
export const BEAST_LEARNING_VERSION = `v${versionManifest.beastlearning.version} ${versionManifest.beastlearning.channel}`;
export const formatVersionIdentity = (identity: keyof typeof versionManifest) => {
  const version = versionManifest[identity];
  return `${version.name} v${version.version} · ${version.channel} · Build ${version.buildId}`;
};
export const BEASTOS_UI_POLISH_NOTE = "two-tone module branding restored";
