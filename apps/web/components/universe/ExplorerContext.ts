import { createContext } from "react";
import type { InputRef } from "./world";
export const ExplorerContext = createContext<InputRef | null>(null);
