
const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['test/load/notices.k6.ts'],
    bundle: true,
    outfile: 'dist/k6/notices.js',
    platform: 'node',
    target: 'es2015',
    external: ['k6', 'k6/*'], // k6 modules are external
}).catch(() => process.exit(1));
