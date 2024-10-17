import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
    plugins: [viteSingleFile()],
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:8080", // rust dev server
            }
        }
    },
});
