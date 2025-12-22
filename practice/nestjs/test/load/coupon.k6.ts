import http from 'k6/http';

export const options = {
  scenarios: {
    coupon: {
      executor: 'constant-arrival-rate',
      rate: 500, // Very high load to test race condition
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      exec: 'couponTest',
    },
    couponUncached: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      exec: 'couponUncachedTest',
      startTime: '15s',
    },
  },
  // We don't necessarily set thresholds here because we want to see the COUNT results afterwards
};

const BASE_URL = 'http://host.docker.internal:3000';

export function couponTest() {
  const userId = `user-${Math.floor(Math.random() * 10000)}`;
  http.post(`${BASE_URL}/coupon/claim`, JSON.stringify({ userId }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export function couponUncachedTest() {
  const userId = `user-uncached-${Math.floor(Math.random() * 10000)}`;
  http.post(`${BASE_URL}/coupon/claim-uncached`, JSON.stringify({ userId }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export function teardown() {
  // After test, we should check the stats manually or via a separate script
  // But k6 can print summary
}
