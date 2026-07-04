import { Injectable } from '@nestjs/common';

export type DocumentMetadata = Record<string, unknown>;

export interface SharedDocument {
  id: string;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDocumentInput {
  id: string;
  title: string;
  content: string;
  metadata: DocumentMetadata;
}

@Injectable()
export class DocumentStore {
  private readonly documents = new Map<string, SharedDocument>();
  private readonly startedAt = Date.now();
  private sequence = 0;

  upsert(input: UpsertDocumentInput): SharedDocument {
    const previous = this.documents.get(input.id);
    const now = this.nextTimestamp();
    const document: SharedDocument = {
      id: input.id,
      title: input.title,
      content: input.content,
      metadata: input.metadata,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };

    this.documents.set(input.id, document);
    return document;
  }

  findById(id: string): SharedDocument | null {
    return this.documents.get(id) ?? null;
  }

  findAll(): SharedDocument[] {
    return [...this.documents.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  deleteById(id: string): void {
    this.documents.delete(id);
  }

  private nextTimestamp(): string {
    this.sequence += 1;
    return new Date(this.startedAt + this.sequence).toISOString();
  }
}

