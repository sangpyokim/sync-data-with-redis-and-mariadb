# Redis Sentinel + MariaDB 클러스터 구성

## 목표

두 대의 Mac에서 같은 `docker-compose.yml`을 실행하되, 노드별 env 파일로 역할을 나눈다.

- Mac 1: MariaDB, Redis Primary, Redis Sentinel
- Mac 2: MariaDB, Redis Replica, Redis Sentinel
- 선택: 두 Mac 중 한 곳에서 실습용 Witness Sentinel 추가 실행

MariaDB는 아직 복제하지 않는다. 각 노드는 자기 로컬 MariaDB를 가진다. Redis Sentinel은 중앙 명령 로그용 Redis의 primary 장애 전환을 학습하기 위한 구성이다.

## 파일

- `docker-compose.yml`
- `infra/cluster/node-1.env.example`
- `infra/cluster/node-2.env.example`
- `docs/cluster-setup.md`

## 설계 이유

컨테이너 이름이나 Docker 내부 DNS에 의존하면 한 Mac 안에서는 편하지만, 두 물리 장비 간 통신 원리를 놓치기 쉽다. 그래서 `REDIS_PRIMARY_HOST`, `ADVERTISE_IP`, 공개 포트를 env로 명시한다.

Redis Replica와 Sentinel은 Primary를 `REDIS_PRIMARY_HOST:REDIS_PRIMARY_PORT`로 바라본다. 이 값은 Mac 1의 실제 사설 IP여야 한다. Sentinel도 `sentinel announce-ip`를 설정해서 다른 클라이언트가 컨테이너 내부 주소가 아니라 실제 Mac IP로 접근할 수 있게 한다.

두 Mac만으로는 안정적인 quorum HA라고 말할 수 없다. Sentinel은 과반 판단이 필요하므로 3번째 장애 도메인이 있어야 운영적으로 의미가 있다. 여기의 `witness-sentinel`은 실습용이며, 같은 물리 Mac에서 추가로 띄우면 독립 장애 도메인이 아니다.

## 준비

예시 env 파일을 실제 env 파일로 복사한다.

```bash
[Mac 1]
cd /Users/mark/Projects/distributed-sync-lab
cp infra/cluster/node-1.env.example infra/cluster/node-1.env
```

```bash
[Mac 2]
cd /Users/mark/Projects/distributed-sync-lab
cp infra/cluster/node-2.env.example infra/cluster/node-2.env
```

각 파일에서 다음 값을 반드시 바꾼다.

- `<MAC_1_IP>`
- `<MAC_2_IP>`
- `MARIADB_PASSWORD`
- `MARIADB_ROOT_PASSWORD`
- `REDIS_PASSWORD`
- `SENTINEL_PASSWORD`

실제 비밀번호가 들어간 `infra/cluster/*.env` 파일은 커밋하지 않는다.

## 실행

Mac 1에서 Primary 노드를 실행한다.

```bash
[Mac 1]
cd /Users/mark/Projects/distributed-sync-lab
docker compose --env-file infra/cluster/node-1.env up -d mariadb redis redis-sentinel
```

Mac 2에서 Replica 노드를 실행한다.

```bash
[Mac 2]
cd /Users/mark/Projects/distributed-sync-lab
docker compose --env-file infra/cluster/node-2.env up -d mariadb redis redis-sentinel
```

실습용 Witness Sentinel을 Mac 1에서 추가로 띄우려면 다음을 실행한다. 이 구성은 운영용 독립 witness가 아니다.

```bash
[Mac 1]
cd /Users/mark/Projects/distributed-sync-lab
docker compose --env-file infra/cluster/node-1.env --profile witness up -d witness-sentinel
```

## 확인

컨테이너 상태를 확인한다.

```bash
[Mac 1]
docker compose --env-file infra/cluster/node-1.env ps
```

```bash
[Mac 2]
docker compose --env-file infra/cluster/node-2.env ps
```

Redis Primary 상태를 확인한다.

```bash
[Mac 1]
docker compose --env-file infra/cluster/node-1.env exec redis redis-cli -a "$REDIS_PASSWORD" role
```

Redis Replica 상태를 확인한다.

```bash
[Mac 2]
docker compose --env-file infra/cluster/node-2.env exec redis redis-cli -a "$REDIS_PASSWORD" role
```

Sentinel이 알고 있는 Primary를 확인한다.

```bash
[Mac 1]
docker compose --env-file infra/cluster/node-1.env exec redis-sentinel \
  redis-cli -p 26379 -a "$SENTINEL_PASSWORD" sentinel get-master-addr-by-name sync-master
```

```bash
[Mac 2]
docker compose --env-file infra/cluster/node-2.env exec redis-sentinel \
  redis-cli -p 26379 -a "$SENTINEL_PASSWORD" sentinel get-master-addr-by-name sync-master
```

MariaDB 접속을 확인한다.

```bash
[Mac 1]
docker compose --env-file infra/cluster/node-1.env exec mariadb \
  mariadb -usync_app -p"$MARIADB_PASSWORD" sync_lab -e "select 1;"
```

```bash
[Mac 2]
docker compose --env-file infra/cluster/node-2.env exec mariadb \
  mariadb -usync_app -p"$MARIADB_PASSWORD" sync_lab -e "select 1;"
```

## 중지

컨테이너만 중지한다. 데이터 volume은 남긴다.

```bash
[Mac 1]
docker compose --env-file infra/cluster/node-1.env down
```

```bash
[Mac 2]
docker compose --env-file infra/cluster/node-2.env down
```

volume 삭제는 데이터 삭제를 뜻한다. 실습 데이터가 사라지므로 실행 전 반드시 확인한다.

```bash
[Mac 1 또는 Mac 2]
docker compose --env-file infra/cluster/node-1.env down -v
```

## 예상 실패

- `MARIADB_PORT`, `REDIS_PORT`, `SENTINEL_PORT`가 이미 사용 중이면 컨테이너가 뜨지 않는다.
- Mac 간 방화벽이나 네트워크 정책이 막혀 있으면 Redis Replica가 Primary에 붙지 못한다.
- Docker 컨테이너에서 상대 Mac 사설 IP에 접근할 수 없으면 Sentinel과 Replica가 실패한다.
- 두 Mac의 Redis 비밀번호가 다르면 Replica 인증이 실패한다.
- Sentinel 비밀번호가 다르면 클라이언트가 Sentinel 조회에 실패한다.
- Witness를 같은 Mac에서 띄우면 해당 Mac 장애 시 Sentinel 2개가 동시에 사라질 수 있다.

## 다음 단계

현재 Compose는 인프라만 제공한다. NestJS 앱이 Redis Sentinel과 MariaDB를 사용하려면 이후 단계에서 다음을 추가한다.

- TypeORM MariaDB DataSource
- ioredis Sentinel 연결 설정
- Redis Streams command log
- Worker process
- migration
- 장애 테스트 스크립트

