# Redis HA (High Availability) Test Guide

This document explains how to verify that your Redis Cluster setup correctly handles node failures and failovers.

## Prerequisites

1.  **Docker & Docker Compose** must be installed.
2.  **Node.js** with `npm` installed.

---

## Step 1: Start Redis Cluster

Run the cluster in background mode using the dedicated compose file:

```bash
cd docker
docker-compose -f docker-compose.cluster.yml up -d
```

> [!NOTE]
> Wait about 10-15 seconds for the `redis-cluster-creator` service to finish initializing the cluster.

---

## Step 2: Configure Environment

Ensure your `.env` file in `practice/nestjs` is set to cluster mode:

```env
REDIS_CLUSTER_ENABLED=true
REDIS_CLUSTER_NODES=127.0.0.1:6371,127.0.0.1:6372,127.0.0.1:6373,127.0.0.1:6374,127.0.0.1:6375,127.0.0.1:6376
```

---

## Step 3: Run the HA Test Script

The test script performs continuous read/write operations and logs the status.

```bash
cd practice/nestjs
npm run test:ha
```

You should see logs like:
`[2:40:00 PM] Iteration 1: SUCCESS (Read/Write OK)`

---

## Step 4: Simulate Failover (Manual Testing)

While the test script is running, open a **new terminal** and stop one of the master nodes (e.g., `redis-1`):

```bash
docker stop redis-1
```

### What to expect:
1.  **Detection**: For a few seconds (usually 5-10s), the script might log `FAILED` or `Too many Cluster redirections`.
2.  **Promotion**: During this time, the Redis Cluster is detecting the failure and promoting a replica to be the new master.
3.  **Recovery**: Once the failover is complete, the script will **automatically resume** logging `SUCCESS`.

---

## Step 5: Restore the Node

To bring the node back and see it rejoin as a replica:

```bash
docker start redis-1
```

---

## Troubleshooting

- **Connection Loop**: If you see `Redis Cluster reconnecting...` repeatedly, ensure you are using `127.0.0.1` and not `localhost` in your `.env`.
- **Wrong number of nodes**: If the script logs only 1 or 2 nodes, the cluster initialization might have failed. Run `docker-compose -f docker-compose.cluster.yml down` and try again.
