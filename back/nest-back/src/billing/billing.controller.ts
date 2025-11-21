import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    @Get('balance')
    async getBalance(@CurrentUser() user) {
        return this.billingService.getBalance(user.id);
    }

    @Get('transactions')
    async getTransactions(
        @CurrentUser() user,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.billingService.getTransactions(user.id, Number(limit) || 20, Number(offset) || 0);
    }
}
