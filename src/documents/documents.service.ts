import { Inject, Injectable } from '@nestjs/common';
import { DocumentNotFoundException } from './document-not-found.exception';
import { DocumentStore, type SharedDocument, type UpsertDocumentInput } from './document-store';

@Injectable()
export class DocumentsService {
  constructor(@Inject(DocumentStore) private readonly documentStore: DocumentStore) {}

  upsert(input: UpsertDocumentInput): SharedDocument {
    return this.documentStore.upsert(input);
  }

  findById(id: string): SharedDocument {
    const document = this.documentStore.findById(id);

    if (document === null) {
      throw new DocumentNotFoundException();
    }

    return document;
  }

  findAll(): SharedDocument[] {
    return this.documentStore.findAll();
  }

  deleteById(id: string): void {
    this.documentStore.deleteById(id);
  }
}
