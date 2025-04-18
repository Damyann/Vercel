import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('❌  JWT_SECRET is missing in the environment!');
  process.exit(1);
}


export function signToken(payload) {
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}


export function verifyToken(token) {
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}
