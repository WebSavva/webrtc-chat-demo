import { defineConfig } from "tsup";

export default defineConfig((options) => {
    const isDev = !!options.watch;
    
  return {
    entry: ['src/index.ts'],
    outDir: 'dist',

    noExternal: ['@webrtc-chat/types'],

    format: "cjs",

    minify: false,
    dts: false,
    clean: true,

    env: {
      NODE_ENV: isDev ? 'development' : 'production',
    },
    
    watch: isDev,
    onSuccess: isDev ? 'node dist/index.js' : async () => {},
  };
});
