import Redis from 'ioredis';

const nodes = [
    { host: '127.0.0.1', port: 6371 },
];

const cluster = new Redis.Cluster(nodes, {
    redisOptions: {
        showFriendlyErrorStack: true,
        connectTimeout: 5000,
    },
    clusterRetryStrategy: (times) => Math.min(times * 100, 2000),
    natMap: {
        '172.20.0.11:6379': { host: '127.0.0.1', port: 6371 },
        '172.20.0.12:6379': { host: '127.0.0.1', port: 6372 },
        '172.20.0.13:6379': { host: '127.0.0.1', port: 6373 },
        '172.20.0.14:6379': { host: '127.0.0.1', port: 6374 },
        '172.20.0.15:6379': { host: '127.0.0.1', port: 6375 },
        '172.20.0.16:6379': { host: '127.0.0.1', port: 6376 },
    },
});

let count = 0;
const TEST_KEY = 'ha-test-key';

async function runTest() {
    console.log('--- Starting HA Availability Test ---');
    console.log('Connect to cluster nodes:', nodes.map(n => `${n.host}:${n.port}`).join(', '));

    const interval = setInterval(async () => {
        count++;
        const value = `value-${count}-${Date.now()}`;

        try {
            await cluster.set(TEST_KEY, value);
            const result = await cluster.get(TEST_KEY);

            if (result === value) {
                console.log(`[${new Date().toLocaleTimeString()}] Iteration ${count}: SUCCESS (Read/Write OK)`);
            } else {
                console.warn(`[${new Date().toLocaleTimeString()}] Iteration ${count}: MISMATCH! Sent: ${value}, Received: ${result}`);
            }
        } catch (error) {
            console.error(`[${new Date().toLocaleTimeString()}] Iteration ${count}: FAILED - ${error.message}`);
        }

        if (count >= 100) {
            console.log('Test completed 100 iterations.');
            clearInterval(interval);
            cluster.disconnect();
            process.exit(0);
        }
    }, 1000);
}

cluster.on('connect', () => console.log('Redis Cluster: Main connection established.'));
cluster.on('reconnecting', (params) => console.log(`Redis Cluster: Reconnecting... (Attempt: ${params.attempt}, Delay: ${params.delay})`));
cluster.on('error', (err) => console.error('Redis Cluster: General Error -', err.message));
cluster.on('node error', (err, address) => {
    const addr = typeof address === 'string' ? address : JSON.stringify(address);
    console.error(`Redis Cluster: Node Error [${addr}] -`, err.message);
});
cluster.on('+node', (node) => console.log('Redis Cluster: Node Joined'));
cluster.on('-node', (node) => console.log('Redis Cluster: Node Left'));

runTest().catch((err) => console.error('Test Startup Error:', err));

// Handle process termination
process.on('SIGINT', () => {
    console.log('Stopping test...');
    cluster.disconnect();
    process.exit(0);
});
