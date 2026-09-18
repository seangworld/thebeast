import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import { NavigationScrollRegion } from "../src/app/components/navigation/NavigationScrollRegion";
const dom = new JSDOM("<html><body></body></html>", { url: "https://beast.test" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true }, MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, writable: true, configurable: true },
});
const { render, cleanup, fireEvent } = require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(cleanup);
test("navigation keeps its scroll through page-content changes and mobile reopening", () => {
  const positions = { current: {} as Record<string, number> };
  const node = (label: string) => React.createElement(NavigationScrollRegion, { positions, region: "desktop", children: label });
  const view = render(node("Money"));
  const rail = view.container.querySelector("[data-beast-navigation]") as HTMLDivElement;
  rail.scrollTop = 480; fireEvent.scroll(rail);
  view.rerender(node("Education"));
  assert.equal(view.container.querySelector("[data-beast-navigation]"), rail);
  assert.equal(rail.scrollTop, 480);
  view.unmount();
  const reopened = render(node("Goals"));
  assert.equal((reopened.container.querySelector("[data-beast-navigation]") as HTMLDivElement).scrollTop, 480);
  reopened.unmount();
  const mobile = render(React.createElement(NavigationScrollRegion, { positions, region: "mobile", children: "Mobile" }));
  const mobileRail = mobile.container.querySelector("[data-beast-navigation]") as HTMLDivElement;
  assert.equal(mobileRail.scrollTop, 0);
  mobileRail.scrollTop = 210; fireEvent.scroll(mobileRail);
  mobile.unmount();
  const desktop = render(node("Reports"));
  assert.equal((desktop.container.querySelector("[data-beast-navigation]") as HTMLDivElement).scrollTop, 480);
  assert.equal(positions.current.mobile, 210);
});
