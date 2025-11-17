import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const rateLimitHitRate = new Rate('rate_limit_hits');

export const options = {
	scenarios: {
		rate_limit_test: {
			executor: 'constant-arrival-rate',
			rate: 200, // 200 requests per second
			timeUnit: '1s',
			duration: '1m',
			preAllocatedVUs: 50,
			maxVUs: 100,
		},
	},
	thresholds: {
		rate_limit_hits: ['rate>0.5'], // Expect at least 50% of requests to hit rate limit
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
		},
	};

	const res = http.get(`${BASE_URL}/api/users`, params);

	const rateLimited = check(res, {
		'status is 429 (rate limited)': (r) => r.status === 429,
		'has rate limit headers': (r) =>
			r.headers['X-RateLimit-Limit'] !== undefined &&
			r.headers['X-RateLimit-Remaining'] !== undefined,
	});

	rateLimitHitRate.add(rateLimited);
}
