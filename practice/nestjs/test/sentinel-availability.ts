import Redis from 'ioredis';

async function testSentinel() {
    console.log('Starting Sentinel HA Availability Test...');

    const sentinelNodes = [
        { host: '127.0.0.1', port: 26379 },
        { host: '127.0.0.1', port: 26380 },
        { host: '127.0.0.1', port: 26381 },
    ];

    const redis = new Redis({
        sentinels: sentinelNodes,
        name: 'mymaster',
        natMap: {
            '172.19.0.2:6379': { host: '127.0.0.1', port: 6379 },
            '172.19.0.3:6379': { host: '127.0.0.1', port: 6380 },
            '172.19.0.4:6379': { host: '127.0.0.1', port: 6381 },
        },
    });

    redis.on('error', (err) => {
        console.error('Redis Error:', err.message);
    });

    redis.on('sentinel', (sentinel) => {
        console.log('Sentinel event:', sentinel);
    });

    let count = 0;
    const interval = setInterval(async () => {
        try {
            const key = 'ha-test-sentinel';
            const val = new Date().toISOString();
            await redis.set(key, val);
            const retrieved = await redis.get(key);
            console.log(`[${++count}] Write/Read Success: ${retrieved}`);
        } catch (err) {
            console.error(`[${++count}] Operation Failed:`, err.message);
        }
    }, 1000);

    // Keep the script running
    process.on('SIGINT', () => {
        clearInterval(interval);
        redis.disconnect();
        process.exit();
    });
}

testSentinel();
