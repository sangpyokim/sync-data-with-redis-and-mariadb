import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('클러스터 구성', () => {
  test('Docker Compose에 MariaDB와 Redis Sentinel 서비스가 포함되어 있다', () => {
    const compose = readProjectFile('docker-compose.yml');

    expect(compose).toContain('mariadb:');
    expect(compose).toContain('redis:');
    expect(compose).toContain('redis-sentinel:');
    expect(compose).toContain('witness-sentinel:');
    expect(compose).toContain('MARIADB_ROOT_PASSWORD');
    expect(compose).toContain('sentinel monitor');
    expect(compose).toContain('sentinel announce-ip');
    expect(compose).toContain('healthcheck:');
  });

  test('노드별 환경 예시 파일은 서로 다른 Redis 역할을 정의한다', () => {
    const node1 = readProjectFile('infra/cluster/node-1.env.example');
    const node2 = readProjectFile('infra/cluster/node-2.env.example');

    expect(node1).toContain('NODE_ID=sync-node-1');
    expect(node1).toContain('REDIS_ROLE=primary');
    expect(node1).toContain('REDIS_PRIMARY_HOST=<MAC_1_IP>');

    expect(node2).toContain('NODE_ID=sync-node-2');
    expect(node2).toContain('REDIS_ROLE=replica');
    expect(node2).toContain('REDIS_PRIMARY_HOST=<MAC_1_IP>');
  });

  test('클러스터 설명서는 Mac 1과 Mac 2 실행 절차를 구분한다', () => {
    const docs = readProjectFile('docs/cluster-setup.md');

    expect(docs).toContain('[Mac 1]');
    expect(docs).toContain('[Mac 2]');
    expect(docs).toContain('docker compose --env-file infra/cluster/node-1.env up -d');
    expect(docs).toContain('docker compose --env-file infra/cluster/node-2.env up -d');
    expect(docs).toContain('두 Mac만으로는 안정적인 quorum HA라고 말할 수 없다');
  });
});
