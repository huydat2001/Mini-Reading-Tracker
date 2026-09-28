import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Mini Reading Tracker API')
    .setDescription(
      'Proxy Open Library (search, chi tiết tác phẩm, ảnh bìa) và quản lý tủ sách: thêm, cập nhật tiến độ, đánh giá, thống kê. Cache Redis cho search/detail/stats.',
    )
    .setVersion('1.0')
    .addTag('books', 'Tìm kiếm & chi tiết sách (proxy Open Library)')
    .addTag('library', 'Tủ sách cá nhân')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger: ${await app.getUrl()}/api/docs`);
}
bootstrap();
