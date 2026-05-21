import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { userId: payload.id },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Fetch Categories Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, color, icon } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await prisma.category.findFirst({
      where: {
        userId: payload.id,
        name: { equals: name.trim(), mode: 'insensitive' }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        userId: payload.id,
        name: name.trim(),
        color: color || '#6b7280',
        icon: icon || '🏷️'
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Create Category Error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
