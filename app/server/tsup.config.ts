import { defineConfig } from "tsup";

export default defineConfig((options) => {
    const isDev = !!options.watch;
    
  return {
    entry: ['src/index.ts'],
    outDir: 'dist',

    format: "cjs",

    minify: false,
    dts: false,
    clean: true,
    
    watch: isDev,
    onSuccess: isDev ? 'node dist/index.js' : async () => {},
  };
});
