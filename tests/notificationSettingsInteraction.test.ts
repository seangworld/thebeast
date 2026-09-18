import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import type PageType from "../src/app/dashboard/settings/notifications/page";
const dom = new JSDOM("<html><body></body></html>", { url: "https://beast.test" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  Notification: { value: { permission: "granted" }, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, writable: true, configurable: true },
});
Object.defineProperty(dom.window, "Notification", { value: globalThis.Notification });
let hash: string | null = "local";
let subscriptions = 0;
let unsubscribes = 0;
const registration = { pushManager: { subscribe: async () => {
  subscriptions++;
  return { toJSON: () => ({ endpoint: "test" }), unsubscribe: async () => { unsubscribes++; } };
} } };
Object.defineProperty(navigator, "serviceWorker", { value: {
  register: async () => registration, ready: Promise.resolve(registration),
} });
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (id: string, ...args: unknown[]) {
  if (id === "next/link") return { __esModule: true, default: ({ children, ...props }: any) => React.createElement("a", props, children) };
  if (id === "@/lib/notifications/pushClient") return {
    supportsPush: () => true, needsHomeScreen: () => false,
    currentPushHash: async () => hash, applicationServerKey: () => new Uint8Array(), stopLocalPush: async () => {},
  };
  return originalLoad.call(this, id, ...args);
};
const Page = require("../src/app/dashboard/settings/notifications/page").default as typeof PageType;
Module._load = originalLoad;
const { render, cleanup, waitFor, fireEvent } = require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(() => cleanup());
const device = {
  id: "phone", endpoint_hash: "local", label: "Sean’s iPhone", enabled: true,
  due_today: true, due_tomorrow: false, messages_enabled: true, show_details: false,
  notify_hour: 6, time_zone: "America/New_York", quiet_start: 20, quiet_end: 6, last_sent_at: null,
};
test("returning device restores preferences, saves updates without subscribing, and targets its test", async () => {
  hash = "local";
  const posts: any[] = [];
  let saved = { ...device };
  globalThis.fetch = (async (_url: unknown, options: any) => {
    if (options?.method === "POST") {
      const body = JSON.parse(options.body); posts.push(body);
      if (body.action === "update") saved = { ...saved, ...body };
      return Response.json({ message: "Test accepted" });
    }
    return Response.json({ devices: [saved], publicKey: "test", schedulerReady: true });
  }) as typeof fetch;
  const ui = render(React.createElement(Page));
  await ui.findByText("Notifications are on for this device");
  assert.equal(ui.queryByRole("button", { name: "Enable notifications" }), null);
  assert.equal((ui.getByLabelText("Device name") as HTMLInputElement).value, device.label);
  assert.equal((ui.getByLabelText("Bill reminder hour") as HTMLSelectElement).value, "6");
  assert.equal((ui.getByLabelText("Bills due tomorrow") as HTMLInputElement).checked, false);
  fireEvent.click(ui.getByLabelText("Bills due tomorrow"));
  fireEvent.click(ui.getByRole("button", { name: "Save device settings" }));
  await ui.findByText("Device settings saved.");
  await waitFor(() => assert.equal(ui.getByRole("button", { name: "Save device settings" }).hasAttribute("disabled"), false));
  assert.equal(posts[0].action, "update"); assert.equal(posts[0].id, "phone"); assert.equal(posts[0].due_tomorrow, true);
  assert.equal(subscriptions, 0);
  fireEvent.click(ui.getByRole("button", { name: "Send a test to this device" }));
  await ui.findByText("Test accepted");
  assert.deepEqual(posts[1], { action: "test", id: "phone" });
});
test("failed first save keeps subscription for retry and successful retry becomes connected", async () => {
  hash = null; subscriptions = 0; unsubscribes = 0;
  let attempts = 0;
  globalThis.fetch = (async (_url: unknown, options: any) => {
    if (options?.method === "POST") {
      attempts++;
      if (attempts === 1) return Response.json({ error: "Save failed" }, { status: 503 });
      hash = "local";
      return Response.json({ device });
    }
    return Response.json({ devices: hash ? [device] : [], publicKey: "test", schedulerReady: true });
  }) as typeof fetch;
  const ui = render(React.createElement(Page));
  await waitFor(() => assert.equal(ui.getByRole("button", { name: "Enable notifications" }).hasAttribute("disabled"), false));
  fireEvent.click(ui.getByRole("button", { name: "Enable notifications" }));
  await ui.findByText("Save failed");
  assert.equal(unsubscribes, 0);
  fireEvent.click(ui.getByRole("button", { name: "Enable notifications" }));
  await ui.findByText("Notifications are on for this device");
  assert.equal(ui.queryByRole("button", { name: "Enable notifications" }), null);
});
