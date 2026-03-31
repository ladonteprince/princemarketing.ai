'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signIn } from '@/lib/auth';

export async function registerAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user with starter plan and default credits
  const user = await prisma.user.create({
    data: {
      email,
      hashedPassword,
      name: name || null,
      plan: 'starter',
      credits: 100,
    },
  });

  // Create default credit balance
  await prisma.creditBalance.create({
    data: {
      userId: user.id,
      imageCredits: 100,
      videoCredits: 10,
      copyCredits: 500,
    },
  });

  // Sign in immediately after registration
  await signIn('credentials', { email, password, redirect: false });
}
