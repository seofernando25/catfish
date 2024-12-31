import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [preact()],
    server: {
        host: "127.0.0.1",
        proxy: {
            "/server": {
                target: "http://localhost:3000/",
                // Rewrite the path of the request
                rewrite: (path) => path.replace(/^\/server/, ""),
            },
            "/ws": {
                target: "http://localhost:3000/",
                ws: true,
                rewriteWsOrigin: true,
                autoRewrite: true,
            },
        },
    },
});
