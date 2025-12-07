# Redis 중급 기능 실습 코드

각 주제별로 독립적인 실습 파일이 준비되어 있습니다.

## 📁 실습 파일 목록

### 1️⃣ 데이터 영속성 (Persistence)
**파일**: `01-persistence.js`  
**실행**: `node advanced/01-persistence.js`

**내용**:
- RDB (Snapshotting) 스냅샷 생성
- AOF (Append Only File) 로그 기록
- RDB vs AOF 비교표
- 영속성 전략 선택 가이드

---

### 2️⃣ Pub/Sub (발행/구독)
**파일**: `02-pubsub.js`  
**실행**: `node advanced/02-pubsub.js`

**내용**:
- 기본 채널 구독 및 메시지 발행
- 패턴 매칭 구독 (`PSUBSCRIBE`)
- 실시간 알림 시스템 예제

---

### 3️⃣ Transactions (트랜잭션)
**파일**: `03-transactions.js`  
**실행**: `node advanced/03-transactions.js`

**내용**:
- MULTI/EXEC 기본 트랜잭션
- WATCH를 사용한 낙관적 잠금
- 복잡한 비즈니스 로직 예제

---

### 4️⃣ Pipelining (파이프라이닝)
**파일**: `04-pipelining.js`  
**실행**: `node advanced/04-pipelining.js`

**내용**:
- 일반 방식 vs 파이프라이닝 성능 비교
- 대량 데이터 처리 (1000개)
- 읽기/쓰기 혼합 작업
- 실전: 사용자 데이터 일괄 로딩

---

### 5️⃣ Atomic 연산
**파일**: `05-atomic.js`  
**실행**: `node advanced/05-atomic.js`

**내용**:
- 잘못된 방법(GET+SET) vs 올바른 방법(INCR)
- 다양한 Atomic 명령어 (INCRBY, DECRBY, SETNX)
- Lua Script를 사용한 복잡한 원자적 연산

---

## 🚀 실행 방법

### 전제 조건
```bash
# Redis 서버 실행
docker-compose -f docker/docker-compose.yml up -d redis

# 패키지 설치 (최초 1회)
npm install
```

### 개별 실습 실행
```bash
# 1. 데이터 영속성
node advanced/01-persistence.js

# 2. Pub/Sub
node advanced/02-pubsub.js

# 3. Transactions
node advanced/03-transactions.js

# 4. Pipelining
node advanced/04-pipelining.js

# 5. Atomic 연산
node advanced/05-atomic.js
```

### 전체 실습 (원본)
모든 실습을 한 번에 실행하려면:
```bash
node advanced/practice.js
```

---

## 📊 각 파일의 특징

| 파일 | 주제 | 실행 시간 | 학습 포인트 |
|------|------|-----------|-------------|
| 01-persistence.js | 영속성 | ~3초 | RDB/AOF 차이점 |
| 02-pubsub.js | Pub/Sub | ~5초 | 실시간 메시징 |
| 03-transactions.js | 트랜잭션 | ~2초 | 원자적 실행, WATCH |
| 04-pipelining.js | 파이프라이닝 | ~3초 | 성능 최적화 |
| 05-atomic.js | Atomic | ~2초 | 동시성 제어 |

---

## 💡 학습 팁

1. **순서대로 학습**: 1번부터 5번까지 순서대로 실행하며 학습하세요
2. **코드 수정**: 각 파일의 값을 바꿔보며 동작을 이해하세요
3. **README 참고**: 이론은 `README.md`를 참고하세요
4. **독립 실행**: 각 파일은 독립적으로 실행 가능합니다

---

## 🎯 학습 체크리스트

- [ ] RDB와 AOF의 차이점 이해
- [ ] Pub/Sub으로 실시간 메시징 구현
- [ ] MULTI/EXEC 트랜잭션 작성
- [ ] WATCH를 이용한 낙관적 잠금 구현
- [ ] Pipelining으로 성능 향상 확인
- [ ] Atomic 연산의 중요성 이해
- [ ] Lua Script 작성 및 실행

---

## 📚 추가 자료

- [README.md](./README.md) - 상세한 이론 및 설명
- [practice.js](./practice.js) - 전체 통합 실습 코드
