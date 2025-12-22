import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    search: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '15s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      exec: 'searchTest',
    },
    searchUncached: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '15s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      exec: 'searchUncachedTest',
    },
  },
  thresholds: {
    'http_req_duration{scenario:search}': ['p(95)<10'],
    'http_req_duration{scenario:searchUncached}': ['p(95)>50'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000';

export function searchTest() {
  const userId = `user-${Math.floor(Math.random() * 100)}`;
  const keyword = `keyword-${Math.floor(Math.random() * 1000)}`;

  // 1. Add Keyword (Pipeline used in service)
  const resAdd = http.post(
    `${BASE_URL}/search`,
    JSON.stringify({ userId, keyword }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  check(resAdd, { 'search logged': (r) => r.status === 201 });

  // 2. Get History
  const resGet = http.get(`${BASE_URL}/search/history?userId=${userId}`);
  check(resGet, { 'history fetched': (r) => r.status === 200 });
}

export function searchUncachedTest() {
  const userId = `user-uncached-${Math.floor(Math.random() * 100)}`;
  const keyword = `keyword-${Math.floor(Math.random() * 1000)}`;

  // 1. Add Keyword
  const resAdd = http.post(
    `${BASE_URL}/search/uncached`,
    JSON.stringify({ userId, keyword }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  check(resAdd, { 'search logged': (r) => r.status === 201 });

  // 2. Get History
  const resGet = http.get(
    `${BASE_URL}/search/history-uncached?userId=${userId}`,
  );
  check(resGet, { 'history fetched': (r) => r.status === 200 });
}
