
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    scenarios: {
        cached: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 20 },
                { duration: '20s', target: 20 },
                { duration: '10s', target: 0 },
            ],
            gracefulStop: '0s',
            exec: 'cachedTest',
        },
        uncached: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 20 },
                { duration: '20s', target: 20 },
                { duration: '10s', target: 0 },
            ],
            gracefulStop: '0s',
            startTime: '45s', // Start after cached scenario finishes
            exec: 'uncachedTest',
        }
    },
    thresholds: {
        'http_req_duration{scenario:cached}': ['p(95)<20'], // Expect fast
        'http_req_duration{scenario:uncached}': ['p(95)>50'], // Expect slow (simulated DB)
    },
};

const BASE_URL = 'http://host.docker.internal:3000';

export function cachedTest() {
    const res = http.get(`${BASE_URL}/notices`);
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
}

export function uncachedTest() {
    const res = http.get(`${BASE_URL}/notices/uncached`);
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
}


