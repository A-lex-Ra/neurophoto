import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class BillingService {
    constructor(private prisma: PrismaService) { }

    async getBalance(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { credits: true },
        });
        return { credits: user?.credits || 0 };
    }

    async getTransactions(userId: string, limit = 20, offset = 0) {
        return this.prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset),
        });
    }

    async deductCredits(userId: string, amount: number, description: string) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user || user.credits < amount) {
                throw new BadRequestException('Insufficient credits');
            }

            // Deduct credits
            await tx.user.update({
                where: { id: userId },
                data: { credits: { decrement: amount } },
            });

            // Create transaction record
            await tx.transaction.create({
                data: {
                    userId,
                    amount: -amount,
                    type: TransactionType.USAGE,
                    description,
                },
            });

            return true;
        });
    }

    async refundCredits(userId: string, amount: number, description: string) {
        return this.prisma.$transaction(async (tx) => {
            // Add credits
            await tx.user.update({
                where: { id: userId },
                data: { credits: { increment: amount } },
            });

            // Create transaction record
            await tx.transaction.create({
                data: {
                    userId,
                    amount: amount,
                    type: TransactionType.REFUND,
                    description,
                },
            });

            return true;
        });
    }
}
