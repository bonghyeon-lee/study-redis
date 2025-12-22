# 🚀 NestJS x Redis 실전 구현 로드맵

이 문서는 NestJS 백엔드 환경에서 Redis를 도입할 때, 구현 난이도별 요구사항과 아키텍처 설계를 가이드하기 위해 작성되었습니다.

---

## 📅 프로젝트 개요
- **목적:** Redis의 다양한 자료구조를 활용한 백엔드 성능 최적화 및 기능 구현
- **환경:** NestJS, TypeScript, Docker (Redis), `ioredis` 또는 `cache-manager`

---

## 🟢 Level 1: 응답 속도 최적화 (Basics)
**"자주 변하지 않는 데이터는 메모리에 넣어서 빠르게 응답한다."**

### 1. 주요 요구사항
- **공지사항 캐싱:** DB에서 조회한 공지사항 목록을 Redis에 저장하고, 5분간 캐시에서 반환합니다.
- **캐시 무효화 (Eviction):** 새로운 공지사항이 등록되면 기존 캐시를 즉시 삭제하여 데이터 정합성을 유지합니다.

### 2. 기술 스택 및 키워드
- `CacheModule` (NestJS 기본 제공)
- `CacheInterceptor`, `CacheTTL`
- **심화:** Sliding TTL (조회 시 만료 연장), JSON Serialization 이슈 handling
- **자료구조:** `String`

---

## 🟡 Level 2: 상태 및 세션 관리 (Intermediate)
**"유효 시간이 있는 휘발성 데이터를 안전하고 빠르게 관리한다."**

### 1. 주요 요구사항
- **이메일 인증 번호(OTP) 프로세스:**
    - 인증번호 생성 시 3분간 유효한 데이터를 Redis에 저장.
    - 유저가 입력한 번호와 Redis 값을 비교 후, 성공 시 즉시 삭제.
- **유저별 최근 검색어 기능:**
    - 각 유저별로 최대 5개의 최근 검색어만 유지.
    - 6번째 검색어가 들어오면 가장 오래된 데이터를 밀어냄.

### 2. 기술 스택 및 키워드
- `ioredis` 라이브러리 직접 제어
- `SETEX` (TTL 설정), `LPUSH` & `LTRIM` (리스트 크기 제한)
- **최적화:** `Pipeline`을 활용한 배치 처리 (RTT 감소)
- **자료구조:** `String`, `List`

---

## 🔴 Level 3: 실시간성 및 동시성 제어 (Advanced)
**"정확한 순위 산정과 동시 접속 상황에서의 데이터 보호를 수행한다."**

### 1. 주요 요구사항
- **실시간 게임 랭킹 시스템:**
    - 수천 명의 유저 점수를 실시간으로 업데이트.
    - 자신의 현재 등수와 상위 10명을 0.1초 내로 조회.
- **선착순 쿠폰 발급 시스템 (Atomic Operation):**
    - 100장의 한정판 쿠폰을 수만 명이 동시에 요청할 때 정확히 100명만 발급.
    - Redis의 **분산 락(Distributed Lock)**을 활용하여 중복 발급 방지.

### 2. 기술 스택 및 키워드
- `Sorted Set (ZSET)`: 실시간 정렬
- `SET NX` (Simple Lock) 또는 `Redlock` (Distributed Lock 알고리즘 이해)
- `Lua Script`: 복합 연산(재고 확인 + 차감)의 원자성 보장
- **자료구조:** `Sorted Set`, `Hash`

---

## 🟣 Level 4: 확장성 및 안정성 (Architecture)
**"실시간 이벤트 시스템과 고가용성 환경을 구축한다."**

### 1. 주요 요구사항
- **실시간 알림 시스템 (Pub/Sub):**
    - 특정 이벤트 발생 시 구독 중인 클라이언트에게 메시지 전송.
    - *Note: Redis Pub/Sub은 메시지 지속성이 없음을 인지.*
- **고가용성 (High Availability) 대응:**
    - Sentinel 또는 Cluster 환경에서의 연결 설정.
    - Redis 장애(Failover) 발생 시 애플리케이션의 재연결 및 예외 처리 전략.

### 2. 기술 스택 및 키워드
- `Pub/Sub`: `SUBSCRIBE`, `PUBLISH`
- `Redis Sentinel`, `Redis Cluster`
- `ioredis`의 Sentinel/Cluster 연결 옵션

---

## 🛠 환경 구축 가이드

### 1. Docker를 이용한 Redis 실행
```bash
docker run -d --name redis-server -p 6379:6379 redis:alpine
```