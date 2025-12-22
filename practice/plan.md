# 📋 Redis Practice Implementation Plan

This plan outlines the step-by-step implementation of the Redis curriculum defined in `practice/overview.md`.
Each level will be implemented using **TDD (Test Driven Development)** for functional correctness and **k6** (tailored for **TypeScript**) for **load testing** to verify performance under concurrency.

---

## 🟢 Level 1: Basics - Caching Strategy
**Goal:** Implement `CacheInterceptor` and eviction policy for high-read scenarios.

### 1. Functional Implementation (TDD)
- **Feature:** Notice Board API (`GET /notices`, `POST /notices`)
- **Tests:**
    - `should return cached data on second request` (Check latency < 10ms)
    - `should invalidate cache after POST /notices`
    - `should expire cache after 5 minutes (mocked time)`

### 2. E2E & Load Testing
- **Scenario:** 10,000 concurrent reads on `/notices`
- **Metric:**
    - Without Cache: DB Load, Response Time > 100ms
    - With Cache: Redis Hits, Response time < 20ms
- **Tools:** `k6` with TypeScript (`k6-typescript-template`).

---

## 🟡 Level 2: Intermediate - State Management
**Goal:** Manage volatile data with strict TTL and list structures.

### 1. Functional Implementation (TDD)
- **Feature:** OTP Verification & User Search History
- **Tests:**
    - `should store OTP with 3min TTL (SETEX)`
    - `should fail verification with wrong OTP and NOT delete key`
    - `should succeed verification and delete key immediately`
    - `should keep only latest 5 search terms (LPUSH + LTRIM)`

### 2. E2E & Load Testing
- **Scenario:** 1,000 users requesting OTPs simultaneously.
- **Verification:** Ensure no data race conditions where deleted keys are accessed.

---

## 🔴 Level 3: Advanced - Concurrency Control
**Goal:** Handle race conditions in critical business logic (Ranking, Coupon).

### 1. Functional Implementation (TDD)
- **Feature:** Real-time Ranking & Coupon Event
- **Tests:**
    - `should update score and retrieving rank correctly`
    - `should issue exactly 100 coupons` (Mock concurrency in unit test using `Promise.all`)
    - `should prevent double claiming by same user`

### 2. E2E & Load Testing (Critical)
- **Scenario:** "The Thundering Herd" - 5,000 users attempting to claim 100 coupons instantly.
- **Strategy:**
    - Compare `SET NX` (Simple Lock) vs `Lua Script` (Atomic).
    - **Expected Result:**
        - Without Lock: > 100 coupons issued (Fail).
        - With Lock/Lua: Exactly 100 issued (Pass).

---

## 🟣 Level 4: Architecture - Reliability (HA)
**Goal:** Ensure service availability during Redis failures.

### 1. Functional Implementation (TDD)
- **Feature:** Pub/Sub notifications & Robust Connection
- **Tests:**
    - `should receive message when event published`
    - `should retry connection on disconnect error`

### 2. E2E & Failover Testing
- **Scenario:** Chaos Engineering
    1. Start a high-volume data ingestion script (e.g., logging usage).
    2. Manually kill the Redis Master node (`docker stop`).
    3. Observe application logs:
        - Connection Refused/Timeout errors.
        - Automatic reconnection to new Master (Replica promoted).
    - **Success Criteria:** Zero or minimal data loss during downtime (< 2 sec).

---

## 🛠 Testing Tools Setup
- **Unit/Testing Framework:** `Vitest` (fast, native ESM support) + `ioredis-mock`.
- **Load Testing:** `k6` using **TypeScript** bundler (e.g., `esbuild` or `webpack` for k6 scripts).
