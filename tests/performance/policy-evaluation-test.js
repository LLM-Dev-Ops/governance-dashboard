import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const evaluationTime = new Trend('policy_evaluation_time');

export const options = {
	stages: [
		{ duration: '1m', target: 50 },
		{ duration: '3m', target: 100 },
		{ duration: '1m', target: 0 },
	],
	thresholds: {
		policy_evaluation_time: ['p(95)<50', 'p(99)<100'], // Policy evaluation should be fast
		http_req_duration: ['p(95)<200', 'p(99)<500'],
		errors: ['rate<0.05'],
	},
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export function setup() {
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
		return;
	}

	const params = {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	};

	// Test policy evaluation endpoint
	const evaluationPayload = JSON.stringify({
		user_id: `user_${Math.floor(Math.random() * 100)}`,
		action: 'llm.request',
		resource: {
			model: 'gpt-4',
			tokens: Math.floor(Math.random() * 1000),
		},
	});

	const startTime = new Date().getTime();

	const res = http.post(
		`${BASE_URL}/api/policies/evaluate`,
		evaluationPayload,
		params
	);

	const endTime = new Date().getTime();
	evaluationTime.add(endTime - startTime);

	const success = check(res, {
		'status is 200': (r) => r.status === 200,
		'evaluation completed': (r) => r.json('allowed') !== undefined,
		'evaluation time < 50ms': (r) => (endTime - startTime) < 50,
	});

	errorRate.add(!success);

	sleep(0.5);
}
