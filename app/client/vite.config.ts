import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { isProduction } from 'std-env';

const TURN_SERVER_ENV_NAMES = isProduction
  ? ([
      'TURN_SERVER_USERNAME',
      'TURN_SERVER_PASSWORD',
      'TURN_SERVER_HOSTNAME',
      'TURN_SERVER_PORT',
    ] as const)
  : [];

const define = Object.fromEntries(
  TURN_SERVER_ENV_NAMES.map((envName) => [
    `process.env.${envName}`,
    JSON.stringify(process.env[envName]),
  ]),
);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  define,
});
