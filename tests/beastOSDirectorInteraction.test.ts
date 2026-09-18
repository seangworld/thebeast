import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import type DirectorComponent from "../src/app/dashboard/director/DirectorExperience";
const dom = new JSDOM("<html><body></body></html>", {
  url: "https://beast.test/dashboard/director",
});
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, writable: true, configurable: true },
});
let submit: (value: string) => Promise<void> = async () => {};
const pass = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", null, children);
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (id: string, ...args: unknown[]) {
  if (id === "next/link")
    return {
      __esModule: true,
      default: ({
        children,
        ...props
      }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
        React.createElement("a", props, children),
    };
  if (id === "@/app/components/agents/AgentExperience")
    return new Proxy(
      {},
      {
        get: (_t, name) =>
          name === "AgentConversationInput"
            ? (props: any) => {
                submit = props.onSubmit;
                return React.createElement("input", {
                  "aria-label": "Question",
                  value: props.value,
                  onChange: (e: any) => props.onChange(e.target.value),
                });
              }
            : name === "AgentExperience"
              ? (props: any) =>
                  React.createElement(
                    "div",
                    null,
                    props.conversation,
                    props.children,
                  )
              : pass,
      },
    );
  if (id === "@/app/components/agents/ProfessionalConversationWorkspace")
    return {
      ProfessionalConversationWorkspace: ({ history, children }: any) =>
        React.createElement("div", null, history, children),
      ProfessionalConversationComposer: pass,
      ProfessionalConversationTimeline: ({ messages }: any) =>
        React.createElement(
          "div",
          null,
          messages.map((m: any) =>
            React.createElement("div", { key: m.id }, m.content),
          ),
        ),
    };
  if (id === "@/app/components/agents/ProfessionalConversationIdentity")
    return {
      directorConversationIdentity: {},
      formatProfessionalMessageTime: () => "",
      ProfessionalConversationAvatar: () => null,
    };
  if (id === "@/lib/digitalStaffRuntime/security")
    return { digitalStaffUnavailableMessage: "Please try again." };
  return originalLoad.call(this, id, ...args);
};
const Director = require("../src/app/dashboard/director/DirectorExperience")
  .default as typeof DirectorComponent;
Module._load = originalLoad;
const { render, cleanup, waitFor, fireEvent, act } =
  require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(() => cleanup());
const threads = [
  {
    id: "one",
    title: "First thread",
    messageCount: 0,
    createdAt: "2026-09-18T12:00:00Z",
    updatedAt: "2026-09-18T12:00:00Z",
    messages: [],
  },
  {
    id: "two",
    title: "Second thread",
    messageCount: 0,
    createdAt: "2026-09-18T12:00:00Z",
    updatedAt: "2026-09-18T12:00:00Z",
    messages: [],
  },
];
test("Director allows one pending submission and blocks switching threads until it finishes", async () => {
  let writes = 0;
  let finish: (response: Response) => void = () => {};
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    if (init?.method === "POST") {
      writes++;
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }
    return Response.json({ conversations: threads });
  }) as typeof fetch;
  const view = render(React.createElement(Director));
  await waitFor(() =>
    assert.ok(view.getByRole("button", { name: /First thread/ })),
  );
  await act(async () => {
    void submit("My question");
    void submit("My question");
  });
  assert.equal(writes, 1);
  assert.equal(
    (view.getByRole("button", { name: /Second thread/ }) as HTMLButtonElement)
      .disabled,
    true,
  );
  await act(async () => finish(Response.json({ conversation: { id: "one" } })));
  await waitFor(() =>
    assert.equal(
      (view.getByRole("button", { name: /Second thread/ }) as HTMLButtonElement)
        .disabled,
      false,
    ),
  );
});
test("a failed Director question does not appear in a different selected conversation", async () => {
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) =>
    init?.method === "POST"
      ? Response.json({ error: "Unavailable" }, { status: 503 })
      : Response.json({ conversations: threads })) as typeof fetch;
  const view = render(React.createElement(Director));
  await waitFor(() =>
    assert.ok(view.getByRole("button", { name: /First thread/ })),
  );
  await act(async () => {
    await submit("Question from first thread");
  });
  assert.ok(view.getByText("Question from first thread"));
  fireEvent.click(view.getByRole("button", { name: /Second thread/ }));
  assert.equal(view.queryByText("Question from first thread"), null);
});
