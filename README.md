# sync-data-with-redis-and-mariadb

Redis와 MariaDB를 사용해 분산 데이터 동기화 구조를 단계적으로 학습하는 NestJS 백엔드 실습 저장소입니다.

처음부터 완성형 클러스터를 만드는 대신, 작은 백엔드에서 시작해 MariaDB, Redis Streams, Redis Sentinel, Worker, 장애 복구 시나리오를 하나씩 붙여가며 동작 원리와 설계 이유를 확인하는 것이 목표입니다.

## 학습 목표

이 프로젝트에서 학습하려는 핵심은 다음과 같습니다.

- 두 대의 macOS 장비가 각각 독립 노드로 동작하는 구조
- 각 노드가 자기 로컬 MariaDB를 가지는 구조
- Write API가 로컬 DB를 직접 수정하지 않고 중앙 명령 로그에 명령을 남기는 구조
- Redis Streams를 append-only command log로 사용하는 방식
- Redis Sentinel을 통한 Redis primary 장애 전환
- Worker가 command log를 읽어 각 노드의 MariaDB에 반영하는 방식
- sequence 기반 last-write-wins 충돌 처리
- 재시도와 중복 전달에도 안전한 멱등 처리
- tombstone 기반 삭제 처리
- Redis 방식과 MariaDB Galera 방식의 차이

## 현재 상태

현재 저장소는 가장 가벼운 NestJS 백엔드와 클러스터 인프라 초안을 포함합니다.

- NestJS 기반 문서 API
- in-memory 문서 저장소
- Zod 입력 검증
- Vitest 기반 테스트
- Docker Compose 기반 MariaDB + Redis + Redis Sentinel 구성
- 두 Mac에서 실행할 수 있는 노드별 env 예시
- 클러스터 구성 설명서

아직 TypeORM, Redis Streams command log, Worker, 실제 MariaDB persistence는 붙어 있지 않습니다. 이후 단계에서 TDD로 하나씩 추가합니다.

## 아키텍처 방향

최종적으로는 아래 구조를 목표로 합니다.

```text
Mac 1
├── NestJS Write/Read API
├── Worker
├── Local MariaDB
├── Redis Primary
└── Redis Sentinel

Mac 2
├── NestJS Write/Read API
├── Worker
├── Local MariaDB
├── Redis Replica
└── Redis Sentinel

실습용 Witness
└── Redis Sentinel
```

동기화 흐름은 다음과 같습니다.

```text
Node 1 Write API ─┐
                  ├──▶ Redis Streams command log
Node 2 Write API ─┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
         Node 1 Worker           Node 2 Worker
              │                       │
              ▼                       ▼
         MariaDB 1                MariaDB 2
```

중요한 원칙은 다음과 같습니다.

- Redis 장애 시 Write API는 로컬 MariaDB에 직접 쓰지 않습니다.
- Redis Pub/Sub은 데이터 동기화 용도로 사용하지 않습니다.
- Redis Streams를 중앙 명령 로그로 사용합니다.
- DB 반영은 `appliedSequence` 기준으로 최신 명령만 허용합니다.
- Worker는 DB commit 이후에만 ACK합니다.
- 삭제는 즉시 물리 삭제가 아니라 tombstone으로 처리합니다.
- 두 물리 장비만으로 완전한 quorum HA를 만들 수 있다고 가정하지 않습니다.

## 프로젝트 구조

```text
.
├── docker-compose.yml
├── docs/
│   └── cluster-setup.md
├── infra/
│   └── cluster/
│       ├── node-1.env.example
│       └── node-2.env.example
├── src/
│   ├── app.module.ts
│   ├── health.controller.ts
│   ├── main.ts
│   ├── server-env.ts
│   ├── common/
│   │   └── zod-validation.pipe.ts
│   └── documents/
│       ├── document-not-found.exception.ts
│       ├── document-store.ts
│       ├── documents.controller.ts
│       ├── documents.module.ts
│       ├── documents.schema.ts
│       └── documents.service.ts
└── tests/
    ├── cluster-config.test.ts
    ├── documents.test.ts
    └── readme.test.ts
```

## 로컬 백엔드 실행

의존성을 설치합니다.

```bash
pnpm install
```

개발 서버를 실행합니다.

```bash
pnpm dev
```

기본 서버 주소는 다음과 같습니다.

```text
http://localhost:3000
```

헬스 체크:

```bash
curl http://localhost:3000/health
```

문서 저장:

```bash
curl -X PUT http://localhost:3000/api/v1/documents/example \
  -H 'Content-Type: application/json' \
  -d '{"title":"Example","content":"hello","metadata":{"source":"curl"}}'
```

문서 조회:

```bash
curl http://localhost:3000/api/v1/documents/example
```

## 클러스터 인프라 실행

자세한 절차는 [docs/cluster-setup.md](docs/cluster-setup.md)를 봅니다.

Mac 1에서는 예시 env를 복사한 뒤 실제 IP와 비밀번호를 채웁니다.

```bash
cp infra/cluster/node-1.env.example infra/cluster/node-1.env
docker compose --env-file infra/cluster/node-1.env up -d mariadb redis redis-sentinel
```

Mac 2에서도 예시 env를 복사한 뒤 실제 IP와 비밀번호를 채웁니다.

```bash
cp infra/cluster/node-2.env.example infra/cluster/node-2.env
docker compose --env-file infra/cluster/node-2.env up -d mariadb redis redis-sentinel
```

실제 비밀번호가 들어간 `infra/cluster/*.env` 파일은 커밋하지 않습니다.

## 테스트

이 저장소는 TDD로 개발합니다. 테스트 이름은 한국어로 작성합니다.

```bash
pnpm test
pnpm typecheck
pnpm build
```

Docker Compose 구성 문법은 다음처럼 확인합니다.

```bash
docker compose --env-file infra/cluster/node-1.env.example config
docker compose --env-file infra/cluster/node-2.env.example config
```

## 다음 구현 단계

앞으로의 구현 순서는 다음을 권장합니다.

1. TypeORM과 MariaDB migration 추가
2. 문서 API를 in-memory 저장소에서 MariaDB 저장소로 교체
3. CommandQueue 인터페이스 추가
4. Redis Streams 기반 command log 구현
5. Worker 구현
6. sequence 기반 멱등 반영 로직 구현
7. 삭제 tombstone 구현
8. Redis Sentinel 연결 설정 적용
9. 장애 테스트 자동화
10. Galera Cluster 대안 구성과 비교 문서 작성

## 보안 메모

이 저장소의 env example에는 학습용 placeholder만 둡니다. 실제 비밀번호, 토큰, 접속 정보는 커밋하지 않습니다.

운영 수준으로 확장하려면 최소한 다음이 필요합니다.

- 독립 장애 도메인의 witness
- secret 관리 도구
- TLS
- Redis/MariaDB 계정 권한 최소화
- 백업과 복구 절차
- 모니터링과 알림
- 장애 테스트 후 자동 복구 절차

