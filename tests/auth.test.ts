import request from 'supertest';
import app from '../artifacts/api-server/src/app';

describe('Auth Endpoints', () => {
  it('should prevent registration without email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test User',
      password: 'password123'
    });
    expect(res.status).toBe(400);
  });
});
