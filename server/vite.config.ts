import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
    plugins: [react(), viteSingleFile()],
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:8080", // rust dev server
                ws: true
            },
        }
    },
});
