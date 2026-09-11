// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import HomePage from "../../app/page";
import { authConfig } from "../../lib/supabase/config";
import { createClient, householdSession } from "../../lib/supabase/server";

vi.mock("../../lib/supabase/config", () => ({ authConfig: vi.fn() }));
vi.mock("../../lib/supabase/server", () => ({ createClient: vi.fn(), householdSession: vi.fn() }));
vi.mock("../../components/mission/MissionAtlas", () => ({ MissionAtlas: ({ childId, allowLocalFallback }: { childId: string; allowLocalFallback: boolean }) => <div data-testid="mission" data-child={childId} data-demo={String(allowLocalFallback)} /> }));
const order = vi.fn();
const eq = vi.fn(() => ({ order }));
beforeEach(() => {
  vi.mocked(authConfig).mockReturnValue({ url: "https://example.supabase.co", key: "sb_publishable_test" });
  vi.mocked(householdSession).mockResolvedValue({ userId: "household", accessToken: "private" });
  vi.mocked(createClient).mockResolvedValue({ from: () => ({ select: () => ({ eq }) }) } as unknown as Awaited<ReturnType<typeof createClient>>);
  order.mockResolvedValue({ data: [{ id: "owned", display_name: "Explorer" }], error: null });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("chooses only an owned explorer and disables public-demo substitution", async () => {
  render(await HomePage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByTestId("mission").dataset).toMatchObject({ child: "owned", demo: "false" });
  expect(eq).toHaveBeenCalledWith("parent_id", "household");
  expect(document.body.textContent).not.toContain("private");
});

it("does not pass a caller-supplied foreign child to the mission", async () => {
  render(await HomePage({ searchParams: Promise.resolve({ child: "foreign" }) }));
  expect(screen.queryByTestId("mission")).toBeNull();
  expect(screen.getByRole("link", { name: "Explorer" }).getAttribute("href")).toBe("/?child=owned");
});

it("requires sign-in when the household session has expired", async () => {
  vi.mocked(householdSession).mockResolvedValue(null);
  render(await HomePage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("link", { name: "Household sign-in" }).getAttribute("href")).toBe("/parent/sign-in?next=/");
  expect(createClient).not.toHaveBeenCalled();
  expect(screen.queryByTestId("mission")).toBeNull();
});

it("shows household recovery when its database fails", async () => {
  order.mockResolvedValue({ data: null, error: { message: "private database details" } });
  render(await HomePage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("heading", { name: "Your universe is resting" })).toBeTruthy();
  expect(document.body.textContent).not.toContain("private database details");
  expect(screen.queryByTestId("mission")).toBeNull();
});
