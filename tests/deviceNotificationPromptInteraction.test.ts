import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import type { DeviceNotificationPrompt as PromptType } from "../src/app/components/DeviceNotificationPrompt";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://beast.test" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  localStorage: { value: dom.window.localStorage, configurable: true }, navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true }, Node: { value: dom.window.Node, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true }, IS_REACT_ACT_ENVIRONMENT: { value: true, writable: true, configurable: true },
});
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function(id: string, ...args: unknown[]) {
  if (id === "next/link") return { __esModule: true, default: ({ children, ...props }: any) => React.createElement("a", props, children) };
  if (id === "next/navigation") return { usePathname: () => "/dashboard/today" };
  return originalLoad.call(this, id, ...args);
};
const { DeviceNotificationPrompt } = require("../src/app/components/DeviceNotificationPrompt") as { DeviceNotificationPrompt: typeof PromptType };
Module._load = originalLoad;
const { render, cleanup, waitFor, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(() => { cleanup(); localStorage.clear(); });
test("phone enrollment hides the desktop invitation after returning to the page", async () => {
  let devices: { enabled: boolean; endpoint_hash: string }[] = [];
  globalThis.fetch = (async () => Response.json({ ownerId: "member", devices })) as typeof fetch;
  const ui = render(React.createElement(DeviceNotificationPrompt));
  await ui.findByRole("region", { name: "Enable device notifications" });
  devices = [{ enabled: true, endpoint_hash: "another-device-phone" }];
  await act(async () => { window.dispatchEvent(new dom.window.Event("focus")); });
  assert.equal(ui.queryByRole("region") === null, true);
});
test("already connected account stays hidden without browser push support", async () => {
  globalThis.fetch = (async () => Response.json({ ownerId: "member", devices: [{ enabled: true }] })) as typeof fetch;
  let ui: ReturnType<typeof render>;
  await act(async () => { ui = render(React.createElement(DeviceNotificationPrompt)); });
  assert.equal(ui!.queryByRole("region"), null);
});
test("paused devices do not imply setup is active; dismissal survives focus", async () => {
  globalThis.fetch = (async () => Response.json({ ownerId: "member", devices: [{ enabled: false }] })) as typeof fetch;
  const ui = render(React.createElement(DeviceNotificationPrompt));
  fireEvent.click(await ui.findByRole("button", { name: "Not now" }));
  await act(async () => { fireEvent.focus(window); });
  assert.equal(ui.queryByRole("region"), null);
});
