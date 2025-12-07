/**
 * 4. Pipelining (파이프라이닝) 실습
 * 
 * 주제: RTT 감소를 통한 성능 최적화
 * 실행: node advanced/04-pipelining.js
 */

import { createClient } from 'redis';

const client = await createClient({
    url: 'redis://localhost:6379'
}).connect();

console.log('🚀 Redis Pipelining 실습을 시작합니다!\n');
console.log('='.repeat(60));

// ============================================
// 기본 성능 비교
// ============================================

async function compareBasicPerformance() {
    console.log('\n========== 4-1. 기본 성능 비교 ==========\n');

    // 일반적인 방식 (여러 번의 RTT)
    console.log('⏱️  일반 방식 (3번의 개별 요청):');
    console.time('일반 방식');

    await client.set('counter1', '0');
    await client.set('counter2', '0');
    await client.set('counter3', '0');

    console.timeEnd('일반 방식');

    // 파이프라이닝 방식 (1번의 RTT)
    console.log('\n⚡ 파이프라이닝 방식 (1번의 배치 요청):');
    console.time('파이프라이닝');

    const pipeline = client.multi();
    pipeline.set('counter4', '0');
    pipeline.set('counter5', '0');
    pipeline.set('counter6', '0');
    await pipeline.exec();

    console.timeEnd('파이프라이닝');

    console.log('\n📊 결과 분석:');
    console.log('   - 일반 방식: 클라이언트 ↔ 서버 3번 왕복');
    console.log('   - 파이프라이닝: 클라이언트 ↔ 서버 1번 왕복');
    console.log('   - RTT(Round Trip Time) 2번 절약!\n');
}

// ============================================
// 대량 데이터 처리 비교
// ============================================

async function compareBulkOperations() {
    console.log('\n========== 4-2. 대량 데이터 처리 비교 ==========\n');

    const normalCount = 100;
    const pipelineCount = 1000;

    // 일반 방식 - 100개
    console.log(`⏱️  일반 방식 (${normalCount}개):`)
    console.time(`일반 방식 ${normalCount}개`);

    for (let i = 0; i < normalCount; i++) {
        await client.set(`normal:key:${i}`, i);
    }

    console.timeEnd(`일반 방식 ${normalCount}개`);

    // 파이프라이닝 방식 - 1000개
    console.log(`\n⚡ 파이프라이닝 (${pipelineCount}개):`);
    console.time(`파이프라이닝 ${pipelineCount}개`);

    const bigPipeline = client.multi();
    for (let i = 0; i < pipelineCount; i++) {
        bigPipeline.set(`pipeline:key:${i}`, i.toString());
    }
    await bigPipeline.exec();

    console.timeEnd(`파이프라이닝 ${pipelineCount}개`);

    console.log('\n💡 인사이트:');
    console.log('   - 파이프라이닝은 10배 더 많은 데이터를 처리');
    console.log('   - 하지만 시간은 훨씬 적게 소요');
    console.log('   - 대량 작업에서 극적인 성능 향상!\n');
}

// ============================================
// 읽기/쓰기 혼합 파이프라이닝
// ============================================

async function practiceMixedOperations() {
    console.log('\n========== 4-3. 읽기/쓰기 혼합 파이프라이닝 ==========\n');

    // 초기 데이터 설정
    await client.set('product:1:name', 'Laptop');
    await client.set('product:1:price', '1200');
    await client.set('product:2:name', 'Mouse');
    await client.set('product:2:price', '30');

    console.log('📦 파이프라이닝으로 여러 상품 정보 조회...\n');

    const readPipeline = client.multi();
    readPipeline.get('product:1:name');
    readPipeline.get('product:1:price');
    readPipeline.get('product:2:name');
    readPipeline.get('product:2:price');

    const results = await readPipeline.exec();

    console.log('✅ 조회 결과 (한 번의 왕복으로 모든 데이터 획득):');
    console.log(`   상품1: ${results[0]} - $${results[1]}`);
    console.log(`   상품2: ${results[2]} - $${results[3]}`);

    // 혼합 작업
    console.log('\n🔄 읽기/쓰기 혼합 작업...\n');

    const mixedPipeline = client.multi();
    mixedPipeline.get('product:1:price');           // 읽기
    mixedPipeline.incrBy('product:1:views', 1);     // 쓰기
    mixedPipeline.set('product:1:discount', '10');  // 쓰기
    mixedPipeline.get('product:1:discount');        // 읽기

    const mixedResults = await mixedPipeline.exec();

    console.log('✅ 혼합 작업 결과:');
    console.log(`   가격: $${mixedResults[0]}`);
    console.log(`   조회수 증가: ${mixedResults[1]}`);
    console.log(`   할인율: ${mixedResults[3]}%\n`);
}

// ============================================
// 실전 활용: 사용자 데이터 일괄 로딩
// ============================================

async function practiceBulkUserLoad() {
    console.log('\n========== 4-4. 실전: 사용자 데이터 일괄 로딩 ==========\n');

    // 사용자 데이터 생성
    const users = [
        { id: 1001, name: 'Alice', email: 'alice@example.com', points: 1000 },
        { id: 1002, name: 'Bob', email: 'bob@example.com', points: 1500 },
        { id: 1003, name: 'Carol', email: 'carol@example.com', points: 2000 }
    ];

    console.log('💾 사용자 데이터 저장 중...');
    console.time('사용자 데이터 저장');

    const savePipeline = client.multi();
    for (const user of users) {
        savePipeline.hSet(`user:${user.id}`, {
            name: user.name,
            email: user.email,
            points: user.points.toString()
        });
    }
    await savePipeline.exec();

    console.timeEnd('사용자 데이터 저장');

    console.log('\n📖 사용자 데이터 로딩 중...');
    console.time('사용자 데이터 로딩');

    const loadPipeline = client.multi();
    for (const user of users) {
        loadPipeline.hGetAll(`user:${user.id}`);
    }
    const loadResults = await loadPipeline.exec();

    console.timeEnd('사용자 데이터 로딩');

    console.log('\n✅ 로딩된 사용자 데이터:');
    loadResults.forEach((userData, index) => {
        console.log(`   ${users[index].id}: ${userData.name} (${userData.points}p)`);
    });

    console.log('\n💡 실전 활용 사례:');
    console.log('   - 대시보드 초기 데이터 로딩');
    console.log('   - 배치 작업 (일괄 업데이트)');
    console.log('   - 다수의 캐시 키 조회/갱신\n');
}

// ============================================
// Pipelining vs Transaction 비교
// ============================================

async function comparePipelineVsTransaction() {
    console.log('\n========== 4-5. Pipelining vs Transaction ==========\n');

    console.log('┌─────────────────────┬──────────────┬──────────────┐');
    console.log('│       특성          │  Pipelining  │  Transaction │');
    console.log('├─────────────────────┼──────────────┼──────────────┤');
    console.log('│ 목적                │   성능 향상  │  원자성 보장 │');
    console.log('│ 원자성              │   ❌ 없음   │   ✅ 보장   │');
    console.log('│ 명령 순서           │   ✅ 보장   │   ✅ 보장   │');
    console.log('│ 중간 끼어들기       │   ⚠️ 가능   │   ❌ 불가   │');
    console.log('│ RTT                 │   1번        │   1번        │');
    console.log('└─────────────────────┴──────────────┴──────────────┘');

    console.log('\n💡 선택 기준:');
    console.log('   - 원자성 필요: Transaction (MULTI/EXEC)');
    console.log('   - 단순 성능 향상: Pipelining (또는 MULTI/EXEC)');
    console.log('   - Redis v4에서는 multi()가 두 가지 모두 지원\n');
}

// ============================================
// 메인 실행
// ============================================

try {
    await compareBasicPerformance();
    await compareBulkOperations();
    await practiceMixedOperations();
    await practiceBulkUserLoad();
    await comparePipelineVsTransaction();

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Pipelining 실습이 완료되었습니다!');
    console.log('\n📚 학습 정리:');
    console.log('   ✓ RTT 감소로 성능 향상 (2~3배)');
    console.log('   ✓ 대량 데이터 처리 최적화');
    console.log('   ✓ 읽기/쓰기 혼합 작업');
    console.log('   ✓ 실전 활용 사례 이해');
    console.log('\n⚠️  주의사항:');
    console.log('   - 너무 많은 명령은 메모리 부족 유발');
    console.log('   - 적절한 배치 크기: 1000~10000개');
    console.log('   - 원자성 필요 시 Transaction 사용\n');

} catch (error) {
    console.error('❌ 오류 발생:', error);
} finally {
    await client.quit();
}
