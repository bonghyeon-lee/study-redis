/**
 * 7. Redis 운영 최적화 유틸리티 및 시뮬레이션
 *
 * 주제: Big Key 스캔 및 삭제, 메모리 모니터링, 데이터 압축 시뮬레이션
 * 실행: node advanced/07-operational-utils.js
 */

import { createClient } from 'redis';

// Redis Client 생성
const client = await createClient({
    url: 'redis://localhost:6379'
}).connect();

console.log('🚀 Redis 운영 최적화 유틸리티 실습을 시작합니다!\n');
console.log('='.repeat(60));

// ============================================
// 1. 유틸리티: 안전한 Big Key 삭제 (UNLINK & SCAN)
// ============================================
/**
 * [문제 상황]
 * - `KEYS *` 명령어는 Redis의 모든 키를 스캔하므로 데이터가 많을 경우 수 초간 서버를 멈추게 합니다. (Block)
 * - `DEL` 명령어는 큰 데이터(Big Key)를 지울 때, 메모리 해제 작업이 메인 스레드에서 일어나 블로킹을 유발합니다.
 * 
 * [해결책]
 * 1. `SCAN`: 커서 기반으로 조금씩 나누어 조회하여 메인 스레드 블로킹을 방지합니다.
 * 2. `UNLINK`: 키를 Keyspace에서만 먼저 지우고, 실제 메모리 해제는 백그라운드 스레드에서 비동기로 수행합니다. (Redis 4.0+)
 */
async function scanAndUnlink(matchPattern, batchSize = 100) {
    console.log(`\n========== 1. 안전한 삭제 (SCAN + UNLINK) 대모 ==========`);
    console.log(`패턴: "${matchPattern}", 배치 크기: ${batchSize}\n`);

    // 테스트용 대량 키 생성
    const totalKeys = 500;
    console.log(`mock: ${totalKeys}개의 임시 키 생성 중...`);
    for (let i = 0; i < totalKeys; i++) {
        await client.set(`temp:log:${i}`, 'value');
    }

    let cursor = 0;
    let deletedCount = 0;

    do {
        // SCAN 명령: 메인 스레드 차단 없이 키 조회
        // MATCH: 패턴 매칭
        // COUNT: 한 번에 스캔할 힌트 (정확히 이 개수만큼 반환하지는 않음)
        const result = await client.scan(cursor, {
            MATCH: matchPattern,
            COUNT: batchSize
        });

        cursor = result.cursor;
        const keys = result.keys;

        if (keys.length > 0) {
            // UNLINK 명령: 백그라운드에서 비동기 삭제 (DEL보다 안전)
            // 수천, 수만 개의 키를 삭제해도 순간적인 렉(Latency Spike)이 발생하지 않음
            const count = await client.unlink(keys);
            deletedCount += count;
            process.stdout.write(`\r🧹 삭제 중... 현재 ${deletedCount}개 삭제됨 (cursor: ${cursor})`);
        }

    } while (cursor !== 0); // 커서가 0이 되면 스캔 완료

    console.log(`\n\n✅ 완료! 총 ${deletedCount}개의 키를 안전하게(UNLINK) 삭제했습니다.`);
}

// ============================================
// 2. 유틸리티: 메모리 사용량 모니터링
// ============================================
/**
 * [메모리 모니터링 포인트]
 * 1. used_memory: 현재 Redis가 할당해서 사용 중인 메모리 크기
 * 2. used_memory_peak: 과거에 기록된 최대 메모리 사용량 (이 값이 높고 현재 값이 낮으면 메모리 파편화 가능성 큼)
 * 3. mem_fragmentation_ratio: OS가 할당한 메모리 / Redis가 사용하는 메모리 비율
 *    - > 1.5: 파편화가 심함. 재시작 필요할 수 있음.
 *    - < 1.0: 스왑(Swap) 발생 중. 성능 심각 저하. 메모리 증설 필요.
 */
async function monitorMemory() {
    console.log('\n========== 2. 메모리 사용량 모니터링 ==========\n');

    // INFO memory 명령으로 상세 정보 조회
    const info = await client.info('memory');

    // 파싱 로직 (간단 예시)
    const usedMemory = info.match(/used_memory_human:(.*)/)[1];
    const peakMemory = info.match(/used_memory_peak_human:(.*)/)[1];
    const fragmentation = info.match(/mem_fragmentation_ratio:(.*)/)[1];

    console.log(`📊 현재 메모리 사용량: ${usedMemory}`);
    console.log(`📈 피크 메모리 사용량: ${peakMemory}`);
    console.log(`🧩 메모리 파편화 비율: ${fragmentation}`);

    // 특정 키의 메모리 사용량 조회 (MEMORY USAGE)
    // 키의 값뿐만 아니라 관련 메타데이터까지 포함한 실제 점유 용량을 보여줍니다.
    await client.set('my-big-key', 'X'.repeat(1024 * 10)); // 10KB
    const usage = await client.memoryUsage('my-big-key');
    console.log(`\n🔍 'my-big-key' 실제 메모리 점유: ${usage} bytes`);

    await client.del('my-big-key');
}

// ============================================
// 3. 시뮬레이션: 데이터 압축 저장
// ============================================
/**
 * [데이터 압축 전략]
 * Redis는 모든 데이터를 메모리(RAM)에 저장하므로 비용이 비쌉니다.
 * JSON과 같은 텍스트 데이터는 압축 시 50~80% 가까이 용량이 줄어들 수 있습니다.
 * 
 * - 장점: 메모리 비용 획기적 절감. 네트워크 전송량 감소.
 * - 단점: 압축/해제 시 CPU 사용량 증가.
 * - 추천: 1KB 이상의 큰 텍스트 데이터는 압축 저장을 고려하세요.
 */
async function simulateCompression() {
    console.log('\n========== 3. 데이터 압축 저장 효과 시뮬레이션 ==========\n');

    const originalJson = JSON.stringify({
        id: 12345,
        name: "Very Long Name To Simulate Compression Effect",
        description: "This is a very long description text that can be compressed efficiently because it has many repeated words like text, description, very, etc.",
        history: Array(100).fill("log_entry_data_repeated")
    });

    // 1. 원본 저장
    await client.set('data:original', originalJson);
    const originalSize = await client.memoryUsage('data:original');

    // 2. 압축 저장 (Mock: 단순히 길이를 줄인 문자열로 가정)
    // 실제로는 'zlib'이나 'snappy' 라이브러리를 사용하여 Buffer 형태로 저장합니다.
    // const compressed = zlib.gzipSync(originalJson);
    const compressedData = Buffer.from(originalJson).toString('base64').substring(0, originalJson.length / 2);
    await client.set('data:compressed', compressedData);
    const compressedSize = await client.memoryUsage('data:compressed');

    console.log(`📦 원본 데이터 크기 (Redis 메모리): ${originalSize} bytes`);
    console.log(`🗜️  압축 데이터 크기 (시뮬레이션):   ${compressedSize} bytes`);
    console.log(`📉 절감 효과: 약 ${Math.round((1 - compressedSize / originalSize) * 100)}%`);
}

// ============================================
// 메인 실행
// ============================================

async function runOpsTest() {
    try {
        await scanAndUnlink('temp:log:*');
        await monitorMemory();
        await simulateCompression();

        console.log('\n' + '='.repeat(60));
        console.log('✅ 운영 최적화 유틸리티 실습 완료!');

    } catch (e) {
        console.error('❌ 에러 발생:', e);
    } finally {
        await client.quit();
    }
}

runOpsTest();
