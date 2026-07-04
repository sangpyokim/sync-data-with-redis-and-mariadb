import { NotFoundException } from '@nestjs/common';

export class DocumentNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: '문서를 찾을 수 없습니다.',
      },
    });
  }
}

