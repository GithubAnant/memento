import { ScmPanel } from "@/components/scm-panel";
import { definePageKind } from "./types";

export type ScmLocation = { kind: "scm" };

export const scmKind = definePageKind<"scm", ScmLocation>({
  kind: "scm",
  title: () => "Source Control",
  description: "Review and sync your changes",
  Component: ({ isActive }) => <ScmPanel isActive={isActive} />,
  keepAlive: true,
});
