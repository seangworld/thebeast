import assert from "node:assert/strict";
import test, { after, afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import { OverlayPopover } from "../src/app/dashboard/money/cashflow/components/OverlayPopover";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/dashboard/money/cashflow",
});

Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  CustomEvent: { value: dom.window.CustomEvent, configurable: true },
  requestAnimationFrame: {
    value: (callback: FrameRequestCallback) => {
      callback(Date.now());
      return 0;
    },
    configurable: true,
  },
  cancelAnimationFrame: {
    value: () => undefined,
    configurable: true,
  },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true, writable: true },
});

const { cleanup, fireEvent, render, screen, waitFor } = require("@testing-library/react") as typeof import("@testing-library/react");

afterEach(() => cleanup());
after(() => dom.window.close());

function renderPopover() {
  return render(React.createElement(OverlayPopover, {
    label: "Payment actions",
    panelAriaLabel: "Payment actions",
    children: () => React.createElement(
      React.Fragment,
      null,
      React.createElement("button", { type: "button", role: "menuitem" }, "Edit"),
      React.createElement("button", { type: "button", role: "menuitem" }, "Archive")
    ),
  }));
}

test("popover exposes menu semantics, cycles focus, and restores its trigger", async () => {
  renderPopover();
  const trigger = screen.getByRole("button", { name: "Payment actions" });

  assert.equal(trigger.getAttribute("aria-haspopup"), "menu");
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  fireEvent.keyDown(trigger, { key: "ArrowDown" });

  const menu = await screen.findByRole("menu", { name: "Payment actions" });
  assert.ok(menu);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  await waitFor(() => assert.equal(document.activeElement?.textContent, "Edit"));
  fireEvent.keyDown(document, { key: "ArrowDown" });
  assert.equal(document.activeElement?.textContent, "Archive");

  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => assert.equal(screen.queryByRole("menu"), null));
  await waitFor(() => assert.equal(document.activeElement, trigger));
});
