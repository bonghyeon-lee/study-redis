# 📊 Redis Practice Implementation Summary

## 🟢 Level 1: 응답 속도 최적화 (Basics)
**목표:** 읽기 빈도가 높은 API에 Redis 캐싱을 적용하여 응답 속도를 개선하고 DB 부하를 줄임.

### 1. 구현 내용 (Implementation)
- **Framework**: NestJS + `cache-manager` + `redis-store`
- **Global Cache**: `AppModule`에서 전역 `CacheModule` 등록 (TTL: 5분).
- **Controller**: `NoticesController`의 `findAll` 메서드에 `CacheInterceptor` 적용.
    - `GET /notices`: 최초 요청 시 DB(Mock) 조회 후 캐싱, 이후 캐시 반환.
- **Service**: `NoticesService`에 캐시 무효화 로직 구현.
    - `POST /notices`: 공지사항 생성 시 `cacheManager.del('/notices')` 실행하여 정합성 보장.

### 2. 테스트 결과 (Verification)

#### 🧪 Unit Test (Vitest)
- **결과:** Pass
- **검증 항목:**
    - `create` 메서드 호출 시 데이터 저장 및 캐시 키 삭제(`del`) 호출 여부 검증.

#### 🚀 Load Test (k6)
- **설정:**
    - Concurrent Users (VUs): 20
    - Duration: 40s per scenario
    - Scenarios:
        1. `cached`: `GET /notices` (Cache 적용)
        2. `uncached`: `GET /notices/uncached` (Cache 미적용, DB Latency 50ms 시뮬레이션)
- **비교 결과 (Performance Comparison):**
    | Metric | Cached Endpoint | Uncached Endpoint | Speedup |
    |--------|----------------|-------------------|---------|
    | Avg Latency | **~1.5ms** | **52.3ms** | **~35x** |
    | P95 Latency | **~2.6ms** | **53.2ms** | **~20x** |
    | Throughput (RPS) | Limited by `sleep(1)` | Limited by `sleep(1)` | - |
- **결론:** 캐싱 적용 시, DB Latency(50ms)를 완전히 제거하여 네트워크 지연시간(1~2ms) 수준으로 응답 속도를 획기적으로 단축함.

### 3. 주요 이슈 및 해결
- **Docker Connectivity**: k6 k6 컨테이너에서 로컬 호스트 접근 문제 발생 → `host.docker.internal` 설정으로 해결.
- **Cache Configuration**: `CacheInterceptor`가 Class 레벨에 적용되어 Uncached 엔드포인트도 캐싱되는 문제 → Method 레벨(`findAll`)로 이동하여 해결.

#### 🧩 Integration Test (E2E)
- **File**: `test/notices.e2e-spec.ts`
- **검증 항목**:
    1.  **Cache Hit (Latency)**: 2번째 요청 시 Latency 급감 확인 (59ms → 2ms).
    2.  **Invalidation**: `POST` 요청 후 `GET` 요청 시 DB 조회(Service 호출) 발생 확인.
    3.  **TTL (Time-To-Live)**: Redis 키 조회(`ttl`)를 통해 5분(300s) 설정 확인.
- **Dependency Issue**: `cache-manager` v6+와 `ioredis` 연동 문제 발생 → Stable Version(`@nestjs/cache-manager@2` + `cache-manager@5`)으로 다운그레이드하여 해결.

---

## 🟡 Level 2: 상태 및 세션 관리 (Intermediate)
**"유효 시간이 있는 휘발성 데이터를 안전하고 빠르게 관리한다."**

### 1. 구현 내용
- **`AuthModule` (OTP)**: 이메일 인증 절차 구현.
    - `SETEX`를 사용하여 3분(180초) TTL 설정.
    - 검증 성공 시 `DEL` 명령어로 즉시 데이터 폐기.
- **`SearchModule` (History)**: 유저별 최근 검색어 5개 유지.
    - `List` 자료구조 활용 (`LPUSH` + `LTRIM`).
    - `Pipeline`을 적용하여 네트워크 RTT 최적화 (배치 작업).
- **`RedisModule`**: `ioredis` 클라이언트를 전역적으로 주입받아 사용할 수 있도록 공통 모듈화.

### 2. 검증 결과
#### 🧪 Unit Test
- **Tools**: `Vitest`, `ioredis-mock`
- **결과**: `AuthService` 및 `SearchService` 로직 검증 완료 (5 tests passed).

#### ⚡ Load Test (k6)
- **OTP Scenario (`test:load:otp`)**:
    - **Redis**: p(95) **2.0ms**
    - **Uncached (Simulated DB)**: p(95) **52.42ms**
- **Search Scenario (`test:load:search`)**:
    - **Redis (Pipelined)**: p(95) **1.83ms**
    - **Uncached**: p(95) **51.75ms**
- **결과 요약**: 
    - Redis 사용 시 DB RTT(네트워크 응답 시간)를 획기적으로 줄여, 유저 상태 관리 및 로그성 데이터 저장에서 **약 30배 이상의 성능 향상** 효과를 확인.
    - 특히 Search 기능의 경우 `LPUSH` + `LTRIM` 두 가지 연산을 `Pipeline`으로 묶어 단 한 번의 통신으로 처리함으로써 처리량(Throughput) 최적화를 입증.

