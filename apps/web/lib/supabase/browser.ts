"use client";
import { createBrowserClient } from "@supabase/ssr";
import { authConfig } from "./config";

export function createClient() {
  const config = authConfig();
  if (!config) throw new Error("Household sign-in is not configured.");
  return createBrowserClient(config.url, config.key);
}
