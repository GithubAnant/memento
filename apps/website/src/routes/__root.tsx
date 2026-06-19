/// <reference types="vite/client" />

import type { ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";

import styles from "../styles.css?url";

const TITLE = "Memento — Fast and lightweight markdown editor";
const DESCRIPTION =
  "Fast and lightweight app for your workspace's markdown files. Local-first. macOS.";
const OG_DESCRIPTION = "Fast and lightweight app for your workspace's markdown files.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Memento" },
      { property: "og:description", content: OG_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://memento.anants.studio" },
      { property: "og:image", content: "https://memento.anants.studio/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://memento.anants.studio/og.jpg" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "stylesheet", href: styles },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <script
          defer
          src="https://umami.highpath.studio/script.js"
          data-website-id="7b3faf71-9025-4378-b7dd-4562a9ab55d9"
        />
        <Scripts />
      </body>
    </html>
  );
}
