// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ParentEntryLink } from "./ParentEntryLink";

afterEach(cleanup);

describe("ParentEntryLink", () => {
  it("links straight to Parent mission control by default", () => {
    render(<ParentEntryLink />);
    const link = screen.getByRole("link", { name: "Parent mission control" });
    expect(link.getAttribute("href")).toBe("/parent");
  });

  it("disables itself with an explanatory message when told to", () => {
    render(<ParentEntryLink disabled disabledMessage="Finish or leave your Maths mission before changing worlds." />);
    expect(screen.queryByRole("link")).toBeNull();
    const button = screen.getByRole("button", { name: "Parent mission control" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Finish or leave your Maths mission before changing worlds.")).toBeTruthy();
  });
});
