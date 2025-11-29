# Redis 입문 및 기본기 (한국어)

이 문서는 Redis가 무엇인지, 왜 사용하는지, 그리고 로컬에서 Docker로 빠르게 시작하는 방법과 기본 명령어 사용법을 정리한 간단한 안내서입니다.

**목표**
- Redis의 기본 개념 이해
---

## Redis란 무엇인가?

- In-Memory 데이터 저장소: 메모리(RAM)에 데이터 저장. 디스크 기반 DB보다 빠름.
- Key-Value 스토어: 키-값 구조. 문자열, 리스트, 해시, 정렬된 집합, 집합 등 다양한 자료구조 지원.
- RDBMS와의 차이점: JOIN/관계형 스키마 미제공. 대신 속도 우수, 캐싱/세션/랭킹/큐에 적합.

## Redis를 사용하는 이유

- 빠른 속도: 메모리 기반, 디스크 I/O 병목 적음.
- 단일 스레드 아키텍처: 단일 스레드로 동작, 동시성 단순화.
- 다양한 자료구조: 문자열, 리스트, 해시, 정렬된 집합 등 지원.

주요 사용 사례 예시
- 캐싱: DB 결과/계산 결과 임시 저장, 응답 속도 향상.
- 세션 스토어: 사용자 세션 저장/조회.
- 랭킹(실시간 리더보드): Sorted Set으로 점수 정렬.
- 큐/작업 처리: 리스트(LPUSH/BRPOP) 기반 큐.

---

## 설치 및 기본 환경 구성

```bash
docker-compose -f docker/docker-compose.yml up -d
```

### RedisInsight 접속 방법

- 브라우저에서 `http://localhost:5540` 로 접속합니다.
- RedisInsight에서 새 데이터베이스를 추가하려면 `Add Redis Database` 버튼을 클릭합니다.
- 연결 정보 예시:
	- Docker Compose로 실행한 경우(같은 compose 네트워크 사용): Host = `redis`, Port = `6379`
	- 호스트에서 실행 중인 Redis에 접속하려면: Host = `127.0.0.1`, Port = `6379`
	- Password는 설정하지 않았다면 비워둡니다.

참고: RedisInsight가 다른 환경(로컬 설치된 RedisInsight 앱 등)에서 실행된다면 `127.0.0.1:6379`로 연결해도 됩니다. Docker 내부에서 동작 중인 RedisInsight는 같은 compose 네트워크의 서비스 이름(`redis`)로 Redis에 접근할 수 있습니다.

---

## `redis-cli` 접속 및 기본 명령어

로컬에서 Redis가 6379 포트로 실행 중이면 아래처럼 `redis-cli`로 접속할 수 있습니다.

```bash
redis-cli
# 또는 원격/커스텀 포트
redis-cli -h 127.0.0.1 -p 6379
```

기본 명령어 예제:

- SET, GET — Key-Value 저장 및 조회

```text
SET mykey "hello"
GET mykey
# 출력: "hello"
```

- DEL — 키 삭제

```text
DEL mykey
```

- KEYS * — 모든 키 조회 (주의: 운영 환경에서 사용 금지 권장)

```text
KEYS *
# 주의: 대량의 키가 있을 경우 성능에 심각한 영향을 줍니다.
```

- EXPIRE, TTL — 만료 시간 설정 및 확인 (캐싱에서 중요)

```text
SET temp "xyz"
EXPIRE temp 60   # 60초 후 만료
TTL temp         # 남은 TTL(초)을 반환
```

추가 유용한 명령어
- HSET / HGET / HGETALL — 해시 관련 (세션 저장에 유용)
- LPUSH / RPUSH / LPOP / RPOP / BRPOP — 리스트 기반 큐
- ZADD / ZRANGE / ZREVRANGE / ZRANGEBYSCORE — 정렬된 집합(랭킹)

---

## Node.js 예제 실행 (repo의 `basics` 예제)

```bash
node basics/index.js
```

예제가 정상 동작하면 캐시/세션/랭킹/큐 예제가 순서대로 실행되며, 실행이 끝나면 클라이언트가 종료됩니다.

---

## TODO

- 핵심 자료구조
- 데이터 영속성
- 데이터 트랜젝션
- 캐싱 패턴
- HA

---
