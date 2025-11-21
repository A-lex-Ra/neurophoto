// access-code.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AccessCodeGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const code = request.query.code || request.headers['x-access-code'];

    if (!code) {
      throw new UnauthorizedException('Access code required');
    }

    const accessCode = await this.prisma.accessCode.findUnique({
      where: { code }
    });

    if (!accessCode || !accessCode.isActive || accessCode.usesLeft <= 0) {
      throw new UnauthorizedException('Invalid or expired access code');
    }

    // Сохрани код в request для использования в контроллере
    request.accessCode = accessCode;
    return true;
  }
}