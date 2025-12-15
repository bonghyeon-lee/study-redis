# Redis 중급 기능 및 영속성

Redis를 운영 환경에서 안전하게 사용하기 위한 필수 개념들을 정리한 문서입니다.

## 📌 목차

1. [데이터 영속성 (Persistence)](#1-데이터-영속성-persistence)
2. [Pub/Sub (발행/구독)](#2-pubsub-발행구독)
3. [Transactions (트랜잭션)](#3-transactions-트랜잭션)
4. [Pipelining (파이프라이닝)](#4-pipelining-파이프라이닝)
5. [Atomic 연산](#5-atomic-연산)
6. [대규모 트래픽을 위한 캐싱 전략](#6-대규모-트래픽을-위한-캐싱-전략)
7. [메모리 관리 및 축출 정책](#7-메모리-관리-및-축출-정책-eviction-policies)
8. [성능 킬러: Big Key & Hot Key](#8-성능-킬러-big-key--hot-key)
9. [클라이언트 사이드 캐싱](#9-클라이언트-사이드-캐싱-client-side-caching)

---

## 1. 데이터 영속성 (Persistence)

Redis는 In-memory DB이지만, 메모리 데이터를 디스크에 저장할 수 있는 영속성 기능을 제공합니다. 서버가 재시작되더라도 디스크에 저장된 데이터를 읽어 복구할 수 있습니다.

### 🔸 RDB (Snapshotting) 방식

특정 시점의 메모리 데이터 전체를 스냅샷으로 저장하는 방식입니다.

#### 특징
- **스냅샷 방식**: 특정 시점의 메모리 데이터를 바이너리 파일(`dump.rdb`)로 저장
- **버전 관리 가능**: 특정 시점의 데이터로 복구 가능
- **파일 크기**: AOF보다 작아서 로딩 속도가 빠름
- **기본 설정**: Redis는 기본적으로 RDB 방식이 활성화되어 있음

#### 장점
- ✅ 빠른 복구 속도 (스냅샷을 그대로 읽기만 하면 됨)
- ✅ 파일 크기가 작음
- ✅ 백업 및 재해 복구에 유리

#### 단점
- ❌ 스냅샷 생성에 시간이 오래 걸림 (50GB 기준 약 7~8분)
- ❌ 스냅샷 시점 사이의 데이터 손실 가능
- ❌ `fork()` 시 Copy-on-Write로 인한 메모리 부족 위험

#### 설정 방법

```conf
# redis.conf
save 900 1      # 900초(15분) 동안 1개 이상의 키가 변경되면 저장
save 300 10     # 300초(5분) 동안 10개 이상의 키가 변경되면 저장
save 60 10000   # 60초(1분) 동안 10000개 이상의 키가 변경되면 저장
```

#### 명령어
- `SAVE`: 동기 방식으로 스냅샷 생성 (모든 요청 대기, 권장 안 함)
- `BGSAVE`: 백그라운드에서 자식 프로세스를 통해 스냅샷 생성 (권장)

#### 주의사항

> ⚠️ **메모리 사용률 주의**  
> `BGSAVE` 실행 시 Copy-on-Write(COW)로 인해 최대 2배의 메모리가 필요할 수 있습니다.  
> 예: Redis가 6GB를 사용하고 서버 메모리가 10GB인 경우, COW로 12GB가 필요하면 swap이 발생하여 성능 저하가 발생할 수 있습니다.

---

### 🔸 AOF (Append Only File) 방식

모든 쓰기/업데이트 연산을 로그 파일에 기록하는 방식입니다.

#### 특징
- **로그 방식**: 모든 write/update 명령을 `appendonly.aof` 파일에 기록
- **복구 방식**: 서버 재시작 시 로그에 기록된 명령을 순차적으로 재실행
- **실시간 저장**: 명령 실행 시마다 기록되므로 데이터 손실 최소화
- **텍스트 파일**: 편집 가능 (RDB는 바이너리 파일)

#### 동작 순서
1. 클라이언트가 업데이트 명령 요청
2. Redis가 명령을 AOF 파일에 저장
3. 파일 쓰기 완료 후 실제 메모리에 반영

#### 장점
- ✅ 데이터 손실 최소화 (거의 실시간 저장)
- ✅ Non-blocking 방식으로 동작
- ✅ 텍스트 파일이라 편집 가능

#### 단점
- ❌ 파일 크기가 큼 (모든 연산 기록)
- ❌ 복구 속도가 느림 (모든 명령을 재실행)
- ❌ 중복 명령으로 인한 비효율 (예: 같은 키에 여러 번 SET)

#### 설정 방법

```conf
# redis.conf
appendonly yes                    # AOF 활성화
appendfilename "appendonly.aof"   # AOF 파일명

# fsync 정책
appendfsync always   # 매 명령마다 fsync (가장 안전, 느림)
appendfsync everysec # 1초마다 fsync (권장)
appendfsync no       # OS에 위임 (빠름, 데이터 손실 위험)
```

#### AOF Rewrite
AOF 파일이 계속 커지는 것을 방지하기 위해 **Rewrite** 기능을 제공합니다.

```bash
# 수동 실행
> BGREWRITEAOF
```

**Rewrite 효과**: 중복된 명령을 제거하고 최종 상태만 기록하여 파일 크기 감소

예시:
```bash
# 원본 AOF (100개의 INCR 명령)
INCR counter
INCR counter
...
INCR counter

# Rewrite 후
SET counter 100
```

---

### 🔸 RDB vs AOF 선택 기준

| 기준 | RDB | AOF | RDB + AOF 혼용 |
|------|-----|-----|----------------|
| **데이터 손실 허용** | ⭕ 일부 허용 가능 | ❌ 거의 허용 안 됨 | ⭕ 최소화 |
| **복구 속도** | ⚡ 빠름 | 🐢 느림 | ⚡ 빠름 |
| **파일 크기** | 📦 작음 | 📦 큼 | 📦 중간 |
| **사용 사례** | 캐시, 통계 데이터 | 금융, 주문 데이터 | 일반적인 운영 환경 |

#### 권장 전략

**1. 캐시 전용**
```conf
# 백업 불필요
save ""
appendonly no
```

**2. 일부 데이터 손실 허용**
```conf
save 900 1
appendonly no
```

**3. 데이터 손실 거의 불허 (권장)**
```conf
# RDB + AOF 혼용
save 900 1
appendonly yes
appendfsync everysec
```

> 💡 **Best Practice**  
> 주기적으로 RDB로 스냅샷을 백업하고, 다음 스냅샷까지의 변경사항은 AOF로 저장하는 **RDB + AOF 혼용** 방식을 권장합니다.  
> 이렇게 하면 빠른 복구 속도와 최소한의 데이터 손실을 동시에 달성할 수 있습니다.

---

## 2. Pub/Sub (발행/구독)

Redis의 메시징 패턴으로, 발행자(Publisher)와 구독자(Subscriber) 간 실시간 메시지 전달을 지원합니다.

### 특징
- **채널 기반**: 특정 채널에 메시지를 발행하고 구독
- **1:N 통신**: 하나의 메시지가 여러 구독자에게 전달
- **실시간**: 메시지가 즉시 전달됨
- **휘발성**: 메시지가 저장되지 않음 (연결된 구독자에게만 전달)

### 주요 명령어

```bash
# 채널 구독
SUBSCRIBE channel1 channel2 ...

# 패턴 기반 구독 (와일드카드)
PSUBSCRIBE news.* sport.*

# 메시지 발행
PUBLISH channel "message"

# 구독 해제
UNSUBSCRIBE channel1
PUNSUBSCRIBE pattern1
```

### 사용 사례
- 📢 실시간 채팅 애플리케이션
- 🔔 푸시 알림 시스템
- 📊 실시간 데이터 스트리밍
- 🎯 이벤트 브로드캐스팅

### 주의사항

> ⚠️ **메시지 손실 가능**  
> - Pub/Sub은 메시지를 저장하지 않습니다
> - 구독자가 연결되어 있지 않으면 메시지를 받을 수 없습니다
> - 신뢰성 있는 메시징이 필요하면 Redis Streams 사용을 고려하세요

---

## 3. Transactions (트랜잭션)

여러 명령어를 원자적(Atomic)으로 실행할 수 있는 기능입니다.

### 기본 개념

Redis 트랜잭션은 **MULTI**로 시작하고 **EXEC**로 실행됩니다.

```bash
> MULTI
OK
> INCR counter
QUEUED
> INCR counter
QUEUED
> EXEC
1) (integer) 1
2) (integer) 2
```

### 주요 명령어

- `MULTI`: 트랜잭션 시작
- `EXEC`: 큐에 쌓인 명령어들을 순차적으로 실행
- `DISCARD`: 트랜잭션 취소 (큐 비우기)
- `WATCH`: 낙관적 잠금 (Optimistic Locking)

### 특징

#### ✅ 보장되는 것
1. **원자성**: 모든 명령이 순차적으로 실행됨
2. **격리성**: 트랜잭션 실행 중 다른 클라이언트의 명령이 끼어들지 않음
3. **명령 큐잉**: EXEC 호출 전까지 모든 명령이 큐에 저장됨

#### ❌ RDBMS 트랜잭션과의 차이점

> **롤백(Rollback) 미지원**  
> Redis는 트랜잭션 실행 중 오류가 발생해도 이전 상태로 되돌리지 않습니다.  
> 
> **이유**:
> - Redis 명령은 구문 오류가 없으면 실패하지 않음
> - 단순하고 빠른 구조를 유지하기 위함
> - 오류는 대부분 프로그래밍 실수로 개발 단계에서 발견됨

### WATCH를 이용한 낙관적 잠금

**WATCH**는 CAS(Check-And-Set) 동작을 제공합니다.

```bash
# mykey를 감시
WATCH mykey

# 값 읽기
val = GET mykey
val = val + 1

# 트랜잭션 시작
MULTI
SET mykey $val
EXEC
```

**동작 방식**:
- WATCH한 키가 EXEC 전에 다른 클라이언트에 의해 변경되면
- EXEC는 `nil`을 반환하고 트랜잭션이 실패함
- 재시도 로직 구현 필요

### 사용 예시: 재고 관리

```bash
# 재고 차감 (낙관적 잠금 사용)
WATCH product:123:stock
stock = GET product:123:stock

if stock > 0:
    MULTI
    DECR product:123:stock
    # 주문 정보 저장
    SADD user:orders order_id
    EXEC
else:
    UNWATCH
    # 재고 부족
```

---

## 4. Pipelining (파이프라이닝)

여러 명령을 한 번의 네트워크 왕복(RTT)으로 처리하여 성능을 향상시키는 기법입니다.

### 문제 상황

일반적인 요청-응답 모델:

```
Client: INCR X
Server: 1
[RTT 1]

Client: INCR X
Server: 2
[RTT 2]

Client: INCR X
Server: 3
[RTT 3]

총 시간: 3 RTT
```

### Pipelining 동작

```
Client: INCR X
Client: INCR X
Client: INCR X

Server: 1
Server: 2
Server: 3

총 시간: 1 RTT
```

### 특징

- **성능 향상**: RTT를 줄여 대량 작업 시 극적인 성능 향상
- **네트워크 효율**: 네트워크 대역폭 최대 활용
- **메모리 버퍼링**: 클라이언트와 서버 모두 버퍼에 데이터 쌓음

### Pipelining vs Transaction

| 특성 | Pipelining | Transaction |
|------|------------|-------------|
| **목적** | 성능 향상 (RTT 감소) | 원자성 보장 |
| **원자성** | ❌ 보장 안 됨 | ✅ 보장됨 |
| **명령 순서** | ✅ 보장됨 | ✅ 보장됨 |
| **중간 끼어들기** | ⚠️ 가능 | ❌ 불가능 |
| **롤백** | ❌ 미지원 | ❌ 미지원 |

### 사용 시 주의사항

1. **메모리 사용**: 너무 많은 명령을 한 번에 보내면 메모리 부족 발생 가능
2. **적절한 배치 크기**: 보통 1000~10000개 단위로 나눠서 처리
3. **원자성 필요 시**: Transaction 사용

---

## 5. Atomic 연산

### Atomic이란?

**더 이상 쪼개질 수 없는 연산**을 의미합니다.

#### 일반적인 `i++` 연산

```javascript
i++

// 실제로는 3단계로 분리됨
1. 메모리에서 i 값 읽기
2. 읽은 값에 1 더하기
3. 결과를 i에 저장
```

#### 멀티스레드 환경에서의 문제

```
스레드 A: i 값 읽기 (0)
스레드 B: i 값 읽기 (0)
스레드 A: 0 + 1 = 1
스레드 B: 0 + 1 = 1
스레드 A: i에 1 저장
스레드 B: i에 1 저장

결과: 2가 되어야 하지만 1이 됨 ❌
```

### Redis에서의 Atomic 연산

Redis는 **싱글 스레드**로 동작하므로 모든 명령어는 기본적으로 Atomic합니다.

#### 올바른 방법

```bash
# ❌ 잘못된 방법 (원자성 깨짐)
GET counter
# 애플리케이션에서 +1
SET counter 2

# ✅ 올바른 방법 (원자성 보장)
INCR counter
```

### Atomic 깨지는 경우

**여러 명령어를 조합**할 때 원자성이 깨집니다.

```bash
# 예: 포인트 차감 후 상품 지급
GET user:points     # 1000 포인트
# 다른 클라이언트가 포인트 사용 ⚠️
DECRBY user:points 100
SADD user:items item_id
```

### Atomic 보장 방법

#### 1️⃣ Lua Script 사용

```lua
-- Lua 스크립트는 원자적으로 실행됨
EVAL "
    local points = redis.call('GET', KEYS[1])
    if tonumber(points) >= tonumber(ARGV[1]) then
        redis.call('DECRBY', KEYS[1], ARGV[1])
        redis.call('SADD', KEYS[2], ARGV[2])
        return 1
    else
        return 0
    end
" 2 user:points user:items 100 item_id
```

#### 2️⃣ Transaction + WATCH 사용

```bash
WATCH user:points
points = GET user:points

if points >= 100:
    MULTI
    DECRBY user:points 100
    SADD user:items item_id
    EXEC
else:
    UNWATCH
```

### Redis가 제공하는 Atomic 명령어

| 작업 | Atomic 명령어 |
|------|---------------|
| 증가/감소 | `INCR`, `DECR`, `INCRBY`, `DECRBY` |
| 리스트 | `LPUSH`, `RPUSH`, `LPOP`, `RPOP`, `BRPOPLPUSH` |
| 집합 | `SADD`, `SREM`, `SPOP` |
| 해시 | `HINCRBY`, `HSETNX` |
| 조건부 설정 | `SETNX`, `SET ... NX/XX` |
| 비트 연산 | `SETBIT`, `GETBIT`, `BITCOUNT` |

---

## 6. 대규모 트래픽을 위한 캐싱 전략

대규모 트래픽 환경에서 Redis를 효과적으로 사용하기 위한 패턴과 문제 해결 전략입니다.

### 🔸 기본 캐싱 패턴

#### Cache-Aside (Lazy Loading)
가장 일반적으로 사용되는 패턴입니다.

1. App이 Cache(Redis) 조회
2. **Cache Miss**: DB 조회
3. DB에서 읽은 데이터를 Cache에 저장
4. **Cache Hit**: Cache 데이터 반환

**특징**:
- 필요한 데이터만 캐시에 적재됨 (메모리 효율적)
- 캐시 장애 시에도 DB를 통해 서비스 지속 가능 (DB 부하 급증 주의)
- 데이터 정합성 문제 발생 가능 (DB 업데이트 시 캐시 갱신 필요)

### 🔸 쓰기 전략 (Write Strategies)

#### Write-Through
데이터를 쓸 때 Cache와 DB에 **동시에** 씁니다.

- **장점**: 캐시와 DB의 **일관성(Consistency)**이 높음
- **단점**: 쓰기 속도가 느림 (두 곳에 써야 함), 자주 조회되지 않는 데이터도 캐시에 저장될 수 있음

#### Write-Back (Write-Behind)
Cache에만 먼저 쓰고, 나중에 **비동기**로 DB에 씁니다.

- **장점**: 쓰기 속도가 매우 빠름 (Disk I/O 불필요)
- **단점**: 캐시 장애 시 **데이터 손실** 위험이 큼 (DB 반영 전 유실)
- **용도**: 로그 수집, 조회수 카운트 등

### 🔸 대규모 트래픽 문제 및 해결책

#### 1. 캐시 스탬피드 (Cache Stampede / Thundering Herd)
특정 인기 키(Hot Key)가 만료되는 순간, 수많은 동시 요청이 DB로 몰려 병목을 유발하는 현상입니다.

**해결책**:
- **Probabilistic Early Expiration**: 만료 시간(TTL) 전에 확률적으로 일찍 갱신 (PER 알고리즘)
- **Mutex Lock**: 락을 획득한 하나의 프로세스만 DB를 조회하고 나머지는 대기

#### 2. 캐시 관통 (Cache Penetration)
DB에도 **없는 키**에 대한 악의적이거나 잦은 요청이 계속 들어와, 캐시를 뚫고 DB를 공격하는 현상입니다.

**해결책**:
- **Bloom Filter**: 해당 키가 존재하는지 확률적으로 빠르게 판단하여 불필요한 DB 조회 차단
- **Null Object Caching**: DB에 값이 없다는 사실(`null` 등) 자체를 캐싱 (TTL을 짧게 설정)

#### 3. 캐시 애벌랜치 (Cache Avalanche)
비슷한 시점에 **대량의 키가 한꺼번에 만료**되어 DB 부하가 폭증하는 현상입니다.

**해결책**:
- **Jitter (지터)**: 캐시 만료 시간(TTL)에 무작위 값을 더해 만료 시점을 분산시킴
  - 예: `TTL = 3600s + random(0~600s)`

---

## 7. 메모리 관리 및 축출 정책 (Eviction Policies)

Redis는 메모리가 가득 찼을 때(`maxmemory` 도달), 데이터 저장을 계속하기 위해 기존 데이터를 삭제(Eviction)하는 정책을 설정할 수 있습니다.

### 주요 정책(`maxmemory-policy`)

1. **noeviction (기본값)**: 데이터를 삭제하지 않음. 쓰기 요청 시 에러(`OOM command not allowed`) 반환. (가장 안전하지만 서비스 중단 위험)
2. **allkeys-lru**: **모든 키** 중에서 가장 오랫동안 사용되지 않은(LRU) 키를 삭제. (캐시 용도로 가장 권장)
3. **volatile-lru**: **EXPRIE(만료 시간)가 설정된 키** 중에서 LRU 키를 삭제. (영구 보존 데이터가 있는 경우 유용)
4. **allkeys-lfu**: 사용 빈도가 가장 적은(LFU) 키를 삭제. (자주 조회되는 데이터 보존에 유리)
5. **volatile-ttl**: 만료 시간(TTL)이 가장 짧게 남은 키부터 삭제.

> 💡 **운영 Tip**: 캐시로만 사용한다면 `allkeys-lru`가 일반적이지만, 접근 패턴에 따라 `allkeys-lfu`가 더 효율적일 수 있습니다.

---

## 8. 성능 킬러: Big Key & Hot Key

Redis는 **Single Thread**이므로 하나의 무거운 명령이 전체 시스템을 멈추게 할 수 있습니다.

### 🚫 Big Key 문제
값이 매우 큰 키(예: 멤버가 100만 명인 Set, 50MB String)를 다룰 때 발생합니다.

- **위험**:
  - `DEL`: 메모리 해제 시 메인 스레드가 차단됨.
  - `HGETALL`, `SMEMBERS`: 데이터를 전송하는 데 시간이 오래 걸려 다른 요청들이 타임아웃 발생.
- **해결책**:
  - **쪼개기**: 하나의 큰 키 대신 여러 개의 작은 키로 분할 저장.
  - **UNLINK 사용**: `DEL` 대신 `UNLINK`를 사용하면 백그라운드에서 비동기로 메모리를 해제함.
  - **SCAN 사용**: `KEYS *` 대신 `SCAN`, `HSCAN`, `SSCAN`으로 반복해서 조금씩 조회.

### 🔥 Hot Key 문제
특정 키 하나에 트래픽이 집중되어 네트워크 대역폭이나 CPU가 병목이 되는 현상입니다.

- **해결책**:
  - **Local Caching**: 애플리케이션 메모리(전역 변수 등)에 해당 키를 짧게 캐싱하여 Redis 요청을 줄임.
  - **Clustering & Replication**: 읽기 분산을 위해 Replica를 활용 (단, 키 자체가 하나라 샤딩 효과는 없음).

---

## 9. 클라이언트 사이드 캐싱 (Client-Side Caching)

Redis 6.0부터 도입된 기능으로, 자주 조회되는 데이터를 애플리케이션 메모리(로컬 캐시)에 저장하고, 데이터 변경 시 Redis거 알림(Invalidation Message)을 보내는 방식입니다.

- **장점**: Network RTT(왕복 시간)가 0에 수렴. Redis 부하 획기적 감소.
- **동작**:
  1. 클라이언트가 키를 조회하고 로컬에 저장.
  2. Redis는 해당 키를 "추적(Tracking)" 목록에 등록.
  3. 다른 클라이언트가 해당 키를 변경하면, Redis가 추적 중인 클라이언트에게 "무효화(Invalidate)" 메시지 전송.
  4. 클라이언트는 로컬 캐시에서 해당 키를 삭제.

---


## 📚 참고 자료

- [Redis Persistence 공식 문서](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Redis Transactions 공식 문서](https://redis.io/docs/latest/develop/using-commands/transactions/)
- [Redis Pipelining 공식 문서](https://redis.io/docs/latest/develop/use/pipelining/)
- [Redis Pub/Sub 공식 문서](https://redis.io/docs/latest/develop/interact/pubsub/)
- [데이터 영구 저장하는 방법](https://inpa.tistory.com/entry/REDIS-%F0%9F%93%9A-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%98%81%EA%B5%AC-%EC%A0%80%EC%9E%A5%ED%95%98%EB%8A%94-%EB%B0%A9%EB%B2%95-%EB%8D%B0%EC%9D%B4%ED%84%B0%EC%9D%98-%EC%98%81%EC%86%8D%EC%84%B1)
- [Atomic 연산 보장하기](https://f-lab.kr/blog/redis-command-for-atomic-operation)
- [Redis Commands 레퍼런스](https://redis.io/commands/)

---

## 🎯 학습 체크리스트

- [ ] RDB와 AOF의 차이점을 이해하고 설명할 수 있다
- [ ] 두 방식의 장단점을 비교할 수 있다
- [ ] 상황에 맞는 영속성 전략을 선택할 수 있다
- [ ] BGSAVE의 COW 문제를 이해한다
- [ ] Pub/Sub의 동작 방식과 한계를 안다
- [ ] MULTI/EXEC를 사용한 트랜잭션 구현이 가능하다
- [ ] WATCH를 이용한 낙관적 잠금을 구현할 수 있다
- [ ] Pipelining과 Transaction의 차이를 설명할 수 있다
- [ ] Atomic 연산의 중요성을 이해한다
- [ ] Lua Script로 복잡한 원자적 연산을 구현할 수 있다
- [ ] Cache-Aside 패턴을 이해하고 구현할 수 있다
- [ ] Write-Through와 Write-Back의 차이를 설명할 수 있다
- [ ] 캐시 스탬피드, 관통, 애벌랜치 현상과 해결책을 안다
- [ ] Bloom Filter와 Null Object Caching의 용도를 이해한다
- [ ] Eviction Policy(allkeys-lru 등)를 설명할 수 있다
- [ ] Big Key 삭제 시 DEL 대신 UNLINK를 사용해야 하는 이유를 안다
- [ ] SCAN 명령어를 사용하여 대량 데이터를 안전하게 조회할 수 있다
