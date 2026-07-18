import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

type ErrorBody = {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
};

/**
 * Traduce errores de Prisma a respuestas HTTP estables (sin stack ni SQL).
 *
 * @remarks P2021 (tabla inexistente) suele indicar migraciones pendientes → 503.
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientRustPanicError,
    host: ArgumentsHost,
  ): void {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);

    this.logger.error(
      `${body.error} (${body.code ?? 'n/a'}): ${exception.message}`,
    );

    res.status(body.statusCode).json(body);
  }

  private toBody(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientRustPanicError,
  ): ErrorBody {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2021':
          return {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            error: 'Service Unavailable',
            message:
              'Database schema is not ready. Run migrations (prisma migrate deploy).',
            code: exception.code,
          };
        case 'P2002':
          return {
            statusCode: HttpStatus.CONFLICT,
            error: 'Conflict',
            message: 'A record with this unique value already exists.',
            code: exception.code,
          };
        case 'P2025':
          return {
            statusCode: HttpStatus.NOT_FOUND,
            error: 'Not Found',
            message: 'Record not found.',
            code: exception.code,
          };
        default:
          return {
            statusCode: HttpStatus.BAD_GATEWAY,
            error: 'Bad Gateway',
            message: 'Database request failed.',
            code: exception.code,
          };
      }
    }

    return {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      error: 'Service Unavailable',
      message: 'Database is unavailable.',
    };
  }
}
