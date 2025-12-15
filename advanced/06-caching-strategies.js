/**
 * 6. 대규모 트래픽을 위한 캐싱 전략 실습
 *
 * 주제: Cache-Aside, Write-Back, 캐시 문제 해결(Stampede, Penetration, Avalanche)
 * 실행: node advanced/06-caching-strategies.js
 */

import { createClient } from 'redis';

const client = await createClient({
    url: 'redis://localhost:6379'
}).connect();

console.log('🚀 Redis 대규모 트래픽 캐싱 전략 실습을 시작합니다!\n');
console.log('='.repeat(60));

// ============================================
// 0. Mock DB 설정 (DB 지연 시뮬레이션)
// ============================================

const mockDB = {
    users: {
        '1001': { id: 1001, name: 'Alice', email: 'alice@example.com' },
        '1002': { id: 1002, name: 'Bob', email: 'bob@example.com' }
    },
    async read(id) {
        // DB 조회 지연 (100ms)
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log(`[DB] 조회: user:${id}`);
        return this.users[id] || null;
    },
    async write(id, data) {
        // DB 쓰기 지연 (100ms)
        await new Promise(resolve => setTimeout(resolve, 100));
        this.users[id] = { id, ...data };
        console.log(`[DB] 저장: user:${id}`, data);
    }
};

// ============================================
// 1. Cache-Aside (Lazy Loading) 패턴
// ============================================
/**
 * Cache-Aside 패턴
 * 
 * 가장 널리 사용되는 캐싱 패턴입니다.
 * 애플리케이션이 주도적으로 캐시를 조회하고, 없을 경우 DB에서 데이터를 가져와 캐시에 적재합니다.
 * 
 * [장점]
 * 1. 실제 요청된 데이터만 캐시에 저장되므로 메모리 효율적입니다.
 * 2. Redis가 다운되더라도 DB에서 직접 조회하여 서비스 지속이 가능합니다.
 * 
 * [단점]
 * 1. Cache Miss 발생 시 3번의 스텝(Cache조회 -> DB조회 -> Cache적재)을 거치므로 지연이 발생합니다.
 * 2. 캐시와 DB 데이터 간 불일치(Inconsistent)가 발생할 수 있습니다. (DB 업데이트 시 별도 캐시 갱신 필요)
 */
async function getCacheAside(id) {
    const key = `user:${id}`;

    // 1. 캐시 조회 (Fast Path)
    const cachedData = await client.get(key);
    if (cachedData) {
        console.log(`[Cache Hit] Redis에서 반환: ${key}`);
        return JSON.parse(cachedData);
    }

    // 2. Cache Miss -> DB 조회 (Slow Path)
    console.log(`[Cache Miss] DB 조회 필요 (DB 부하 발생): ${key}`);
    const data = await mockDB.read(id);

    // 3. DB 데이터를 캐시에 저장 (Cache Warming)
    // TTL(Time To Live)을 설정하여 오래된 데이터가 영원히 남는 것을 방지
    if (data) {
        await client.setEx(key, 60, JSON.stringify(data)); // 60초 만료
        console.log(`[Cache Write] Redis에 저장 완료: ${key}`);
    }

    return data;
}

// ============================================
// 2-1. Write-Through 패턴
// ============================================
/**
 * Write-Through 패턴
 * 
 * 데이터를 쓸 때, DB와 캐시에 '동시'에 쓰는 방식입니다.
 * 1. DB에 먼저 저장하여 데이터 영속성을 보장합니다.
 * 2. 성공 시 캐시에도 즉시 반영하여 항상 최신 데이터를 유지합니다.
 * 
 * [장점]
 * - 캐시와 DB의 데이터 일관성(Consistency)이 매우 높습니다.
 * - 데이터 유실 위험이 없습니다.
 * 
 * [단점]
 * - 매 쓰기마다 두 저장소를 거쳐야 하므로 쓰기 지연(Latency)이 발생합니다.
 * - 한 번도 읽히지 않을 데이터도 캐시에 저장되는 리소스 낭비가 생길 수 있습니다.
 */
async function setWriteThrough(id, data) {
    const key = `user:${id}`;

    console.log(`[Write-Through] 쓰기 요청: ${key}`);

    // 1. DB에 저장 (Source of Truth)
    await mockDB.write(id, data);

    // 2. 캐시에도 동기적으로 저장 (항상 최신 상태)
    await client.setEx(key, 60, JSON.stringify(data));

    console.log(`[Write-Through] DB 및 Redis 저장 완료 (일관성 보장): ${key}`);
}

// ============================================
// 2-2. Write-Back (Write-Behind) 패턴
// ============================================
/**
 * Write-Back 패턴
 * 
 * 캐시에만 먼저 쓰고, 완료 신호를 보낸 뒤 백그라운드에서 DB에 비동기로 반영합니다.
 * 
 * [장점]
 * - 쓰기 성능이 매우 빠릅니다. (Disk I/O 대기 없음)
 * - DB에 가해지는 쓰기 부하를 대폭 줄일 수 있습니다. (여러 변경사항을 모아서 배치 처리 가능)
 * 
 * [단점]
 * - 캐시 서버 장애 시 DB에 반영되지 않은 데이터가 '영구 소실'될 위험이 있습니다.
 * - 구현 복잡도가 높습니다. (비동기 처리, 재시도 로직 등)
 */
async function setWriteBack(id, data) {
    const key = `user:${id}`;

    // 1. 캐시에 먼저 저장 (Fast Path)
    // 빠른 응답을 위해 캐시에만 기록하고 클라이언트에게 성공 응답을 보낼 수 있습니다.
    await client.setEx(key, 600, JSON.stringify(data));
    console.log(`[Write-Back] Redis 저장 완료 (즉시 응답): ${key}`);

    // 2. 비동기로 DB 저장 (Write-Behind)
    // 실제 운영에서는 Kafka나 RabbitMQ 같은 메시지 큐를 사용하여 안정성을 높입니다.
    setTimeout(async () => {
        try {
            await mockDB.write(id, data);
            console.log(`[Write-Back] 비동기 DB 반영 완료: ${key}`);
        } catch (e) {
            console.error(`[Error] DB 반영 실패 (데이터 유실 위험): ${key}`);
            // 실패 시 별도 로그 기록 또는 재시도 큐에 삽입해야 함
        }
    }, 2000); // 2초 뒤 DB 반영
}

// ============================================
// 3. 캐시 문제 해결 전략
// ============================================

// 3-1. Cache Penetration 해결 (Null Object Caching)
/**
 * Cache Penetration (캐시 관통)
 * 
 * DB에도 없는 데이터에 대한 요청이 지속적으로 들어와 캐시를 뚫고 DB(Disk)를 타격하는 현상입니다.
 * 
 * [해결책: Null Object Caching]
 * - DB에 데이터가 없다는 사실(=null) 자체를 캐싱합니다.
 * - 다음에 같은 요청이 오면 Redis가 '없음'을 즉시 반환하여 DB를 보호합니다.
 * - 단, 나중에 데이터가 생길 수 있으므로 TTL을 짧게(예: 30초) 설정하는 것이 좋습니다.
 */
async function getWithNullCaching(id) {
    const key = `user:${id}`;

    const cachedVal = await client.get(key);

    // Null Object 체크: Redis에 'null' 문자열이 저장되어 있다면,
    // "이전에 DB 조회해보니 없더라"는 의미이므로 즉시 null 반환
    if (cachedVal === 'null') {
        console.log(`[Cache Penetration 방어] DB에 없는 데이터임이 캐싱되어 있음: ${key}`);
        return null;
    }

    if (cachedVal) {
        return JSON.parse(cachedVal);
    }

    const data = await mockDB.read(id);

    if (!data) {
        // [핵심] DB에도 없으면 'null' 문자열을 짧은 TTL로 저장 (Cache Penetration 방지)
        await client.setEx(key, 30, 'null'); // 30초 동안 '없음' 상태 기억
        console.log(`[Null Caching] 존재하지 않는 데이터 캐싱: ${key}`);
        return null;
    }

    await client.setEx(key, 60, JSON.stringify(data));
    return data;
}

// 3-2. Cache Avalanche 해결 (Jitter 적용)
/**
 * Cache Avalanche (캐시 눈사태/애벌랜치)
 * 
 * 수많은 캐시 키가 동시에 만료(Expire)되면서, 모든 요청이 DB로 쇄도하여 시스템 장애를 일으키는 현상입니다.
 * 
 * [해결책: Jitter(지터) 적용]
 * - 모든 키의 만료 시간을 동일하게 설정하지 않고, 약간의 무작위 값(Jitter)을 더합니다.
 * - 예: 기본 1시간 + 0~10분 무작위 추가
 * - 이를 통해 만료 시점을 분산시켜 DB 부하를 평탄화합니다.
 */
async function setWithJitter(key, value, baseTTL) {
    // Jitter: 0 ~ 300초 사이의 무작위 값 추가
    const jitter = Math.floor(Math.random() * 300);
    const finalTTL = baseTTL + jitter;

    await client.setEx(key, finalTTL, value);
    console.log(`[Jitter] ${key} 데이터 저장 (TTL: ${baseTTL} + ${jitter} = ${finalTTL}초) - 만료 시간 분산됨`);
}

// ============================================
// 메인 실행 테스트
// ============================================

async function runTest() {
    console.log('\n========== 1. Cache-Aside 테스트 ==========\n');
    await getCacheAside('1001'); // Miss -> DB -> Cache
    await getCacheAside('1001'); // Hit

    console.log('\n========== 2-1. Write-Through 테스트 ==========\n');
    await setWriteThrough('1001', { name: 'Alice Updated', email: 'alice_new@example.com' });

    console.log('\n========== 2-2. Write-Back 테스트 ==========\n');
    await setWriteBack('1002', { name: 'Bob Updated', email: 'bob_new@example.com' });
    // 비동기 로그가 뒤늦게 찍히는 것을 확인하기 위해 대기
    await new Promise(r => setTimeout(r, 2500));

    console.log('\n========== 3. Cache Penetration 방어 테스트 ==========\n');
    await getWithNullCaching('9999'); // 없는 ID -> Null Caching
    await getWithNullCaching('9999'); // Hit (Null Object)

    console.log('\n========== 4. Cache Avalanche 방어 (Jitter) 테스트 ==========\n');
    await setWithJitter('config:main', 'value1', 3600);
    await setWithJitter('config:sub', 'value2', 3600);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 모든 실습이 완료되었습니다!');
}

try {
    await runTest();
} catch (error) {
    console.error('❌ 오류 발생:', error);
} finally {
    await client.quit();
}
