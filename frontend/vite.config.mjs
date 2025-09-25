import { fileURLToPath, URL } from "node:url";

import { PrimeVueResolver } from "@primevue/auto-import-resolver";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const FRONTEND_HOST = env.VITE_FRONTEND_HOST;
  const FRONTEND_PORT = process.env.PORT ? Number(process.env.PORT) : Number(env.VITE_FRONTEND_PORT);
  return {
    optimizeDeps: {
      noDiscovery: true,
    },
    plugins: [
      vue(),
      Components({
        resolvers: [PrimeVueResolver()],
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      host: FRONTEND_HOST,
      port: FRONTEND_PORT,
    },
  };
});
