import { StatsPanel } from "@/components/stats-panel";
import { definePageKind } from "./types";

export type StatsLocation = { kind: "stats" };

export const statsKind = definePageKind<"stats", StatsLocation>({
  kind: "stats",
  title: () => "Stats",
  description: "Commit activity for this repo",
  Component: ({ isActive }) => <StatsPanel isActive={isActive} />,
  keepAlive: true,
});
