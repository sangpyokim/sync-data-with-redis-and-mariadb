import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { readServerEnv } from './server-env';

async function bootstrap(): Promise<void> {
  const env = readServerEnv(process.env);
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  await app.listen(env.PORT, env.HOST);
}

void bootstrap();

