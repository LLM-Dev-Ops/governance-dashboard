import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
	stages: [
		{ duration: '30s', target: 10 },  // Ramp up to 10 users
		{ duration: '1m', target: 50 },   // Ramp up to 50 users
		{ duration: '2m', target: 100 },  // Ramp up to 100 users
		{ duration: '1m', target: 50 },   // Ramp down to 50 users
		{ duration: '30s', target: 0 },   // Ramp down to 0 users
	],
	thresholds: {
		http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% of requests < 200ms, 99% < 500ms
		http_req_failed: ['rate<0.01'],                // Error rate < 1%
		errors: ['rate<0.1'],                          // Custom error rate < 10%
	},
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
	// Test login endpoint
	const loginPayload = JSON.stringify({
		email: `user${Math.floor(Math.random() * 1000)}@example.com`,
		password: 'TestPassword123!',
	});

	const loginParams = {
		headers: {
			'Content-Type': 'application/json',
		},
	};

	const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, loginParams);

	const loginSuccess = check(loginRes, {
		'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
		'login response time < 200ms': (r) => r.timings.duration < 200,
	});

	errorRate.add(!loginSuccess);

	sleep(1);

	// Test token refresh endpoint
	if (loginRes.status === 200) {
		const token = loginRes.json('access_token');

		const refreshRes = http.post(
			`${BASE_URL}/api/auth/refresh`,
			null,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		const refreshSuccess = check(refreshRes, {
			'refresh status is 200': (r) => r.status === 200,
			'refresh response time < 100ms': (r) => r.timings.duration < 100,
		});

		errorRate.add(!refreshSuccess);
	}

	sleep(1);
}
