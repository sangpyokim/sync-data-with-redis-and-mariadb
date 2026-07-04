import { Module } from '@nestjs/common';
import { DocumentStore } from './document-store';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentStore, DocumentsService],
})
export class DocumentsModule {}

