import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const backendBaseUrl = env.BE_BASE_URL || "http://127.0.0.1:8000";

    return {
        plugins: [react()],
        server: {
            proxy: {
                "/api": {
                    target: backendBaseUrl,
                    changeOrigin: true,
                },
            },
        },
        define: {
            __BE_BASE_URL__: JSON.stringify(backendBaseUrl),
        },
    };
});