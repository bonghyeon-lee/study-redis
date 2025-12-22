import http from 'k6/http';
import { check } from 'k6';

export const options = {
    scenarios: {
        otp: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 50,
            stages: [
                { duration: '10s', target: 50 },
                { duration: '5s', target: 0 },
            ],
            exec: 'otpTest',
        },
        otpUncached: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1s',
            preAllocatedVUs: 10,
            maxVUs: 50,
            stages: [
                { duration: '10s', target: 50 },
                { duration: '5s', target: 0 },
            ],
            exec: 'otpUncachedTest',
        },
    },
    thresholds: {
        'http_req_duration{scenario:otp}': ['p(95)<10'],
        'http_req_duration{scenario:otpUncached}': ['p(95)>50'],
    },
};

const BASE_URL = 'http://host.docker.internal:3000';

export function otpTest() {
    const email = `test-${Math.floor(Math.random() * 10000)}@example.com`;

    // 1. Send OTP
    const resSend = http.post(
        `${BASE_URL}/auth/otp/send`,
        JSON.stringify({ email }),
        {
            headers: { 'Content-Type': 'application/json' },
        },
    );
    check(resSend, { 'send status 201': (r) => r.status === 201 });

    const otp = resSend.json('otp');

    // 2. Verify OTP
    const resVerify = http.post(
        `${BASE_URL}/auth/otp/verify`,
        JSON.stringify({ email, code: otp }),
        {
            headers: { 'Content-Type': 'application/json' },
        },
    );
    check(resVerify, { 'verify success': (r) => r.json('success') === true });
}

export function otpUncachedTest() {
    const email = `test-uncached-${Math.floor(Math.random() * 10000)}@example.com`;

    // 1. Send OTP
    const resSend = http.post(
        `${BASE_URL}/auth/otp/send-uncached`,
        JSON.stringify({ email }),
        {
            headers: { 'Content-Type': 'application/json' },
        },
    );
    check(resSend, { 'send status 201': (r) => r.status === 201 });

    const otp = resSend.json('otp');

    // 2. Verify OTP
    const resVerify = http.post(
        `${BASE_URL}/auth/otp/verify-uncached`,
        JSON.stringify({ email, code: otp }),
        {
            headers: { 'Content-Type': 'application/json' },
        },
    );
    check(resVerify, { 'verify success': (r) => r.json('success') === true });
}
