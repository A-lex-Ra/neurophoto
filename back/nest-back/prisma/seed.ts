import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@neurophoto.com' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'demo@neurophoto.com',
      name: 'Demo User',
      password: await bcrypt.hash('demo123', 10),
      credits: 100,
      role: 'USER',
    },
  });

  console.log('✅ Demo user created:', demoUser.email);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@neurophoto.com' },
    update: {},
    create: {
      email: 'admin@neurophoto.com',
      name: 'Admin User',
      password: await bcrypt.hash('admin123', 10),
      credits: 1000,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created:', adminUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
