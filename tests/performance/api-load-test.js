import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTimeTrend = new Trend('response_time');

export const options = {
	scenarios: {
		constant_load: {
			executor: 'constant-vus',
			vus: 50,
			duration: '5m',
		},
		ramping_load: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '2m', target: 100 },
				{ duration: '3m', target: 100 },
				{ duration: '2m', target: 200 },
				{ duration: '3m', target: 200 },
				{ duration: '2m', target: 0 },
			],
			gracefulRampDown: '30s',
		},
	},
	thresholds: {
		http_req_duration: ['p(95)<200', 'p(99)<500'],
		http_req_failed: ['rate<0.01'],
		errors: ['rate<0.1'],
		response_time: ['p(95)<200', 'p(99)<500'],
	},
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
let authToken = null;

export function setup() {
	// Login to get auth token
	const loginRes = http.post(
		`${BASE_URL}/api/auth/login`,
		JSON.stringify({
			email: 'admin@example.com',
			password: 'AdminPass123!',
		}),
		{
			headers: { 'Content-Type': 'application/json' },
		}
	);

	if (loginRes.status === 200) {
		return { token: loginRes.json('access_token') };
	}
	return { token: null };
}

export default function (data) {
	const token = data.token;

	if (!token) {
		console.error('No auth token available');
		return;
	}

	const params = {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	};

	// Test various endpoints
	const endpoints = [
		{ method: 'GET', url: '/api/users', name: 'List Users' },
		{ method: 'GET', url: '/api/policies', name: 'List Policies' },
		{ method: 'GET', url: '/api/audit', name: 'List Audit Logs' },
		{ method: 'GET', url: '/api/costs', name: 'Get Costs' },
		{ method: 'GET', url: '/api/usage', name: 'Get Usage' },
	];

	const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

	const res = http.request(endpoint.method, `${BASE_URL}${endpoint.url}`, null, params);

	responseTimeTrend.add(res.timings.duration);

	const success = check(res, {
		'status is 200': (r) => r.status === 200,
		'response time < 200ms': (r) => r.timings.duration < 200,
		'response has data': (r) => r.body.length > 0,
	});

	errorRate.add(!success);

	sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}
