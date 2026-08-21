// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    host: true,
    port: 4322,
    allowedHosts: true,
  },
  devToolbar: { enabled: false },
  env: {
    schema: {
      FLIGHTAPI_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PORCENTAJE_DESCUENTO: envField.number({
        context: 'client',
        access: 'public',
        default: 0,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
