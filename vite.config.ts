import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vite.dev/config/
export default defineConfig({
    plugins: [svelte()],
    server: {
        host: "127.0.0.1",
        proxy: {
            "/server": {
                target: "http://localhost:3000/",
                // Rewrite the path of the request
                rewrite: (path) => path.replace(/^\/server/, ""),
            },
            "/ws": {
                target: "ws://localhost:3000/",
                ws: true,
                rewriteWsOrigin: true,
            },
        },
    },
});
