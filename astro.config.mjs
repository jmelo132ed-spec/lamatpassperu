// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  adapter: vercel(),
  server: {
    host: true,
    port: 4322,
    allowedHosts: true,
  },
  devToolbar: { enabled: false },
  env: {
    schema: {
      FLIGHTAPI_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      BINLOOKUP_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TELEGRAM_BOT_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      TELEGRAM_CHAT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
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
