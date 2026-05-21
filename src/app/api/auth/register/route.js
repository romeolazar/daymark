import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(req) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Check if registration is allowed (only if no users exist)
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json({ error: 'Registration is disabled. Only one account can be registered.' }, { status: 403 });
    }

    const hashedPassword = await hashPassword(password);

    // Create user with default settings and default categories
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        displayName: displayName || email.split('@')[0],
        settings: {
          create: {
            telegramEnabled: false,
            defaultReminderTime: '09:00',
            defaultViewFormat: 'DAYS'
          }
        },
        categories: {
          createMany: {
            data: [
              { name: 'Personal', color: '#a855f7', icon: '👤' },
              { name: 'Work', color: '#06b6d4', icon: '💼' },
              { name: 'Birthday', color: '#f59e0b', icon: '🎂' },
              { name: 'Anniversary', color: '#ec4899', icon: '❤️' },
              { name: 'Warranty', color: '#3b82f6', icon: '🛡️' },
              { name: 'Travel', color: '#10b981', icon: '✈️' },
              { name: 'Shipment', color: '#ec4899', icon: '📦' },
              { name: 'Project', color: '#8b5cf6', icon: '🚀' },
              { name: 'Other', color: '#6b7280', icon: '🏷️' }
            ]
          }
        }
      }
    });

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
    console.error('Registration API Error:', error);
    return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
  }
}
