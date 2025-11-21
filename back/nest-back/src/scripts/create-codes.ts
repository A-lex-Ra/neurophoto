// scripts/create-codes.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createCodes(count: number) {
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await prisma.accessCode.create({
      data: { code, usesLeft: 50 }
    });
    console.log(`Created: ${code}`);
  }
}

createCodes(10);