import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const daysFromNow = (days: number, endOfDay = false): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
};

async function main(): Promise<void> {
  const phone = '+919876543210';

  const user = await prisma.user.upsert({
    where: { phone },
    update: { name: 'Demo User' },
    create: { phone, name: 'Demo User' },
  });

  const existingLoans = await prisma.loan.count({ where: { userId: user.id } });
  if (existingLoans > 0) {
    console.log(`Seed skipped: ${phone} already has ${existingLoans} loan(s).`);
    return;
  }

  await prisma.loan.createMany({
    data: [
      {
        userId: user.id,
        friendName: 'Rahul Sharma',
        amount: new Prisma.Decimal('2500.00'),
        dueDate: daysFromNow(-5, true),
        receiptImageUrl: null,
      },
      {
        userId: user.id,
        friendName: 'Aisha Khan',
        amount: new Prisma.Decimal('1200.50'),
        dueDate: daysFromNow(10, true),
        receiptImageUrl: null,
      },
      {
        userId: user.id,
        friendName: 'Vikram Patel',
        amount: new Prisma.Decimal('800.00'),
        dueDate: daysFromNow(-20, true),
        isRepaid: true,
        repaidAt: daysFromNow(-2),
      },
      {
        userId: user.id,
        friendName: 'Neha Verma',
        amount: new Prisma.Decimal('1500.00'),
        dueDate: daysFromNow(-12, true),
        receiptImageUrl: null,
      },
      {
        userId: user.id,
        friendName: 'Arjun Mehta',
        amount: new Prisma.Decimal('450.00'),
        dueDate: daysFromNow(3, true),
        isRepaid: false,
      },
    ],
  });

  console.log(`Seeded demo account ${phone} (login with any OTP printed to console).`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
