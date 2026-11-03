import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';
import { getClientIp, getLoginRetryAfter, recordLoginFailure, clearLoginFailures } from '@/lib/rateLimit';

export async function POST(req) {
  try {
    const clientIp = getClientIp(req);
    const retryAfter = getLoginRetryAfter(clientIp);
    if (retryAfter > 0) {
      const minutes = Math.ceil(retryAfter / 60);
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      recordLoginFailure(clientIp);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      recordLoginFailure(clientIp);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    clearLoginFailures(clientIp);

    const token = await signToken({ id: user.id, email: user.email });

    const response = NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, displayName: user.displayName } 
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    return response;
  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

export async function GET() {
  // Check if any user exists. Used by login page to decide if we show signup or login.
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ registrationOpen: userCount === 0 });
  } catch (error) {
    console.error('Registration check failed:', error);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
}
