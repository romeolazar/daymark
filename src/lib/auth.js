import bcrypt from 'bcryptjs';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_jwt_auth_key';
const secretKey = new TextEncoder().encode(JWT_SECRET);

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
    .sign(secretKey);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey);
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
