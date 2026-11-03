// Helpers for component tests that render move labels.
import { render } from "@testing-library/svelte";
import type { Component } from "svelte";
import TooltipHost from "./tooltip-host.svelte";

/** Renders `component` inside a Tooltip.Provider, as +page.svelte does. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const renderWithTooltips = <P extends Record<string, any>>(component: Component<P>, props: P) =>
  render(TooltipHost, { props: { component: component as Component<any>, props } }); // eslint-disable-line @typescript-eslint/no-explicit-any

/** The accessible description: the text of every element `aria-describedby` points at. */
export const description = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
    .join(" ");
