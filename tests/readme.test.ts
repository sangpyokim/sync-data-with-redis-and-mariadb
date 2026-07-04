import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

function readReadme(): string {
  return readFileSync(join(process.cwd(), 'README.md'), 'utf8');
}

describe('README 문서', () => {
  test('학습 목표와 아키텍처 방향을 설명한다', () => {
    const readme = readReadme();

    expect(readme).toContain('## 학습 목표');
    expect(readme).toContain('Redis Streams');
    expect(readme).toContain('Redis Sentinel');
    expect(readme).toContain('MariaDB');
    expect(readme).toContain('sequence 기반 last-write-wins');
  });

  test('현재 구성과 실행 방법을 설명한다', () => {
    const readme = readReadme();

    expect(readme).toContain('## 현재 상태');
    expect(readme).toContain('## 프로젝트 구조');
    expect(readme).toContain('pnpm dev');
    expect(readme).toContain('docker compose --env-file');
  });

  test('보안과 다음 구현 단계를 설명한다', () => {
    const readme = readReadme();

    expect(readme).toContain('실제 비밀번호가 들어간');
    expect(readme).toContain('## 다음 구현 단계');
    expect(readme).toContain('TypeORM');
    expect(readme).toContain('Worker');
    expect(readme).toContain('Galera Cluster');
  });
});

