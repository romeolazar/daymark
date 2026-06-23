import bcrypt from 'bcryptjs';
import * as jose from 'jose';

function getSecretKey() {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  return new TextEncoder().encode(JWT_SECRET);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export async function signToken(payload) {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecretKey());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey());
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getUserFromRequest(req) {
  // Can accept NextRequest
  const cookieHeader = req.headers.get('cookie') || '';
  const token = req.cookies?.get('token')?.value || 
                cookieHeader.split(';')
                  .find(c => c.trim().startsWith('token='))
                  ?.split('=')[1];

  if (!token) return null;
  
  const payload = await verifyToken(token);
  return payload; // Returns { id, email } or null
}
