import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET ?? 'test-jwt-secret-key-must-be-32-chars';

/** Bearer header that `requireAuth` accepts in API integration tests. */
export const testAuthHeader = (): { Authorization: string } => {
  const token = jwt.sign({ username: 'admin' }, secret, {
    subject: 'test-user-id',
    expiresIn: '1h',
  });

  return { Authorization: `Bearer ${token}` };
};
