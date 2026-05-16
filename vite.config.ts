import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    target: "es2020",
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/": {
        target: "http://localhost:5000",
        ws: true,
        // Only proxy WebSocket upgrades; let Vite serve HTML/JS/CSS
        bypass(req) {
          if (req.headers.accept?.includes("text/html")) return req.url;
          if (req.url?.match(/\.(ts|js|css|svg|png|ico|json)(\?.*)?$/))
            return req.url;
          return null;
        },
      },
    },
  },
});
