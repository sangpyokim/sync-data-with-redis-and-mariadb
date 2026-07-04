import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Put } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { type SharedDocument } from './document-store';
import { DocumentsService } from './documents.service';
import {
  documentIdSchema,
  type UpsertDocumentBody,
  upsertDocumentBodySchema,
} from './documents.schema';

@Controller('api/v1/documents')
export class DocumentsController {
  constructor(@Inject(DocumentsService) private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(): { items: SharedDocument[] } {
    return {
      items: this.documentsService.findAll(),
    };
  }

  @Get(':id')
  findById(
    @Param('id', new ZodValidationPipe(documentIdSchema)) id: string,
  ): SharedDocument {
    return this.documentsService.findById(id);
  }

  @Put(':id')
  upsert(
    @Param('id', new ZodValidationPipe(documentIdSchema)) id: string,
    @Body(new ZodValidationPipe(upsertDocumentBodySchema)) body: UpsertDocumentBody,
  ): SharedDocument {
    return this.documentsService.upsert({
      id,
      title: body.title,
      content: body.content,
      metadata: body.metadata,
    });
  }

  @Delete(':id')
  @HttpCode(204)
  deleteById(@Param('id', new ZodValidationPipe(documentIdSchema)) id: string): void {
    this.documentsService.deleteById(id);
  }
}
