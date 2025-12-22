import http from 'k6/http';

export const options = {
  scenarios: {
    ranking: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      exec: 'rankingTest',
    },
    rankingUncached: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      exec: 'rankingUncachedTest',
      startTime: '25s',
    },
  },
  thresholds: {
    'http_req_duration{scenario:ranking}': ['p(95)<10'],
    'http_req_duration{scenario:rankingUncached}': ['p(95)>50'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000';

export function rankingTest() {
  const userId = `user-${Math.floor(Math.random() * 1000)}`;
  const score = Math.floor(Math.random() * 10);

  // 1. Add/Update Score
  http.post(`${BASE_URL}/ranking/score`, JSON.stringify({ userId, score }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // 2. Get Top 10
  http.get(`${BASE_URL}/ranking/top?limit=10`);
}

export function rankingUncachedTest() {
  const userId = `user-uncached-${Math.floor(Math.random() * 1000)}`;
  const score = Math.floor(Math.random() * 10);

  // 1. Add/Update Score
  http.post(
    `${BASE_URL}/ranking/score-uncached`,
    JSON.stringify({ userId, score }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  // 2. Get Top 10
  http.get(`${BASE_URL}/ranking/top-uncached?limit=10`);
}
