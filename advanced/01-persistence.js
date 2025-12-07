/**
 * 1. 데이터 영속성 (Persistence) 실습
 * 
 * 주제: RDB (Snapshotting)와 AOF (Append Only File)
 * 실행: node advanced/01-persistence.js
 */

import { createClient } from 'redis';

const client = await createClient({
    url: 'redis://localhost:6379'
}).connect();

console.log('🚀 Redis 데이터 영속성 실습을 시작합니다!\n');
console.log('='.repeat(60));

// ============================================
// RDB (Snapshotting) 실습
// ============================================

async function practiceRDB() {
    console.log('\n========== 1-1. RDB (Snapshotting) 실습 ==========\n');

    // 테스트 데이터 추가
    await client.set('user:1001:name', 'Alice');
    await client.set('user:1001:age', '25');
    await client.set('user:1002:name', 'Bob');
    await client.set('user:1002:age', '30');

    console.log('✅ 테스트 데이터 저장 완료');

    // RDB 스냅샷 생성 (백그라운드)
    console.log('📸 BGSAVE 명령 실행 (백그라운드 스냅샷 생성)...');
    await client.bgSave();

    console.log('💾 dump.rdb 파일이 생성되었습니다.');
    console.log('📝 Redis를 재시작해도 데이터가 보존됩니다.\n');

    // RDB 설정 정보 확인
    const rdbConfig = await client.configGet('save');
    console.log('⚙️  현재 RDB 설정:', rdbConfig);
    console.log('\n📌 RDB 특징:');
    console.log('   - 특정 시점의 스냅샷 저장');
    console.log('   - 파일 크기가 작고 로딩 속도 빠름');
    console.log('   - 스냅샷 시점 사이의 데이터 손실 가능\n');
}

// ============================================
// AOF (Append Only File) 실습
// ============================================

async function practiceAOF() {
    console.log('\n========== 1-2. AOF (Append Only File) 실습 ==========\n');

    // AOF 설정 확인
    const aofEnabled = await client.configGet('appendonly');
    console.log('⚙️  AOF 활성화 상태:', aofEnabled);

    const appendfsync = await client.configGet('appendfsync');
    console.log('⚙️  Fsync 정책:', appendfsync);

    // 쓰기 연산 수행 (AOF에 기록됨)
    await client.set('order:1001', JSON.stringify({
        id: 1001,
        user: 'Alice',
        product: 'Laptop',
        price: 1200
    }));

    await client.incr('order:counter');
    await client.incr('order:counter');

    console.log('\n✅ 쓰기 연산 수행 완료 (AOF에 기록됨)');
    console.log('📝 appendonly.aof 파일에 모든 명령이 기록됩니다.');

    // AOF Rewrite 실행
    console.log('\n🔄 BGREWRITEAOF 명령 실행 (AOF 파일 최적화)...');
    await client.bgRewriteAof();
    console.log('✅ AOF 파일이 최적화되었습니다.');

    console.log('\n📌 AOF 특징:');
    console.log('   - 모든 쓰기 명령을 로그로 기록');
    console.log('   - 데이터 손실 최소화 (거의 실시간)');
    console.log('   - 파일 크기가 크고 복구 속도 느림\n');
}

// ============================================
// 영속성 전략 비교
// ============================================

async function compareStrategies() {
    console.log('\n========== RDB vs AOF 비교 ==========\n');

    console.log('┌─────────────────┬──────────────┬──────────────┐');
    console.log('│     항목        │     RDB      │     AOF      │');
    console.log('├─────────────────┼──────────────┼──────────────┤');
    console.log('│ 데이터 손실     │   가능       │   최소       │');
    console.log('│ 복구 속도       │   빠름       │   느림       │');
    console.log('│ 파일 크기       │   작음       │   큼         │');
    console.log('│ 서버 부하       │   중간       │   높음       │');
    console.log('└─────────────────┴──────────────┴──────────────┘');

    console.log('\n💡 권장 전략:');
    console.log('   - 캐시 전용: 백업 불필요');
    console.log('   - 일부 손실 허용: RDB 단독');
    console.log('   - 손실 불허: RDB + AOF 혼용 (권장)');
}

// ============================================
// 메인 실행
// ============================================

try {
    await practiceRDB();
    await practiceAOF();
    await compareStrategies();

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ 데이터 영속성 실습이 완료되었습니다!');
    console.log('\n📚 학습 정리:');
    console.log('   ✓ RDB 스냅샷 생성 및 설정 확인');
    console.log('   ✓ AOF 로그 기록 및 Rewrite');
    console.log('   ✓ RDB와 AOF의 장단점 비교');
    console.log('   ✓ 상황별 최적 전략 이해\n');

} catch (error) {
    console.error('❌ 오류 발생:', error);
} finally {
    await client.quit();
}
