import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import react from "@vitejs/plugin-react-swc";
import unoCss from "unocss/vite";

export default defineConfig({
  plugins: [react(), unoCss(), viteSingleFile()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080", // rust dev server
        ws: true,
      },
    },
  },
});
