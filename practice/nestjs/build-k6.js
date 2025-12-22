const esbuild = require('esbuild');

esbuild.build({
    entryPoints: {
        notices: 'test/load/notices.k6.ts',
        otp: 'test/load/otp.k6.ts',
        search: 'test/load/search.k6.ts',
        ranking: 'test/load/ranking.k6.ts',
        coupon: 'test/load/coupon.k6.ts'
    },
    bundle: true,
    outdir: 'dist/k6',
    platform: 'node',
    external: ['k6', 'k6/http', 'k6/execution'],
}).catch(() => process.exit(1));
