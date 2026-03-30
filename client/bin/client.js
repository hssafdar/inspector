#!/usr/bin/env node

import open from "open";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import handler from "serve-handler";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, "../dist");

function openInspectorGui(url, guiMode) {
  if (guiMode === "macos-app") {
    if (process.platform === "darwin") {
      console.log("🍎 Opening macOS app window...");
      open.openApp("Safari", { arguments: [url] }).catch(() => {
        console.warn(
          "⚠️  Failed to open macOS app window. Opening browser instead.",
        );
        console.log(`🌐 Opening browser...`);
        open(url);
      });
      return;
    }
    console.warn(
      "⚠️  --gui-mode macos-app is only supported on macOS. Opening browser instead.",
    );
  }

  console.log(`🌐 Opening browser...`);
  open(url);
}

const server = http.createServer((request, response) => {
  const handlerOptions = {
    public: distPath,
    rewrites: [{ source: "/**", destination: "/index.html" }],
    headers: [
      {
        // Ensure index.html is never cached
        source: "index.html",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, max-age=0",
          },
        ],
      },
      {
        // Allow long-term caching for hashed assets
        source: "assets/**",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ],
  };

  return handler(request, response, handlerOptions);
});

const port = parseInt(process.env.CLIENT_PORT || "6274", 10);
const host = process.env.HOST || "localhost";
server.on("listening", () => {
  const url = process.env.INSPECTOR_URL || `http://${host}:${port}`;
  console.log(`\n🚀 MCP Inspector is up and running at:\n   ${url}\n`);
  if (process.env.MCP_AUTO_OPEN_ENABLED !== "false") {
    openInspectorGui(url, process.env.MCP_GUI_MODE || "browser");
  }
});
server.on("error", (err) => {
  if (err.message.includes(`EADDRINUSE`)) {
    console.error(
      `❌  MCP Inspector PORT IS IN USE at http://${host}:${port} ❌ `,
    );
  } else {
    throw err;
  }
});
server.listen(port, host);
