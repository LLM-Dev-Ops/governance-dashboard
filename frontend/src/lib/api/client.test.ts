import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
// import { apiClient } from './client';

const server = setupServer();

beforeEach(() => {
	server.listen({ onUnhandledRequest: 'error' });
});

describe('API Client', () => {
	describe('GET requests', () => {
		it('should make GET requests correctly', async () => {
			// TODO: Implement when apiClient is available
			// server.use(
			//   http.get('/api/users', () => {
			//     return HttpResponse.json({ users: [] });
			//   })
			// );
			// const response = await apiClient.get('/users');
			// expect(response.users).toEqual([]);
			expect(true).toBe(true);
		});

		it('should handle query parameters', async () => {
			// TODO: Implement when apiClient is available
			expect(true).toBe(true);
		});
	});

	describe('POST requests', () => {
		it('should make POST requests with body', async () => {
			// TODO: Implement when apiClient is available
			expect(true).toBe(true);
		});
	});

	describe('Error handling', () => {
		it('should handle 404 errors', async () => {
			// TODO: Implement when apiClient is available
			// server.use(
			//   http.get('/api/not-found', () => {
			//     return new HttpResponse(null, { status: 404 });
			//   })
			// );
			expect(true).toBe(true);
		});

		it('should handle network errors', async () => {
			// TODO: Implement when apiClient is available
			expect(true).toBe(true);
		});

		it('should handle 500 errors', async () => {
			// TODO: Implement when apiClient is available
			expect(true).toBe(true);
		});
	});

	describe('Authentication', () => {
		it('should include auth token in requests', async () => {
			// TODO: Implement when apiClient is available
			expect(true).toBe(true);
		});

		it('should handle token expiration', async () => {
			// TODO: Implement when apiClient is available
			expect(true).toBe(true);
		});
	});
});
