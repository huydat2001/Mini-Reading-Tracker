import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        error = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string) || exception.message;
        error = (b.error as string) || exception.message;
        if (Array.isArray(b.message)) {
          message = (b.message as string[]).join('; ');
          error = message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.message;
    }

    response.status(status).json({
      success: false,
      data: null,
      error,
      message,
    });
  }
}
