/**
 * 3. Transactions (트랜잭션) 실습
 * 
 * 주제: MULTI/EXEC, WATCH를 사용한 원자적 연산
 * 실행: node advanced/03-transactions.js
 */

import { createClient } from 'redis';

const client = await createClient({
    url: 'redis://localhost:6379'
}).connect();

console.log('🚀 Redis Transactions 실습을 시작합니다!\n');
console.log('='.repeat(60));

// ============================================
// MULTI/EXEC 기본 실습
// ============================================

async function practiceBasicTransaction() {
    console.log('\n========== 3-1. MULTI/EXEC 기본 실습 ==========\n');

    // 초기 잔액 설정
    await client.set('user:alice:balance', '1000');
    await client.set('user:bob:balance', '1000');

    console.log('💰 초기 잔액:');
    console.log(`   Alice: ${await client.get('user:alice:balance')}원`);
    console.log(`   Bob: ${await client.get('user:bob:balance')}원\n`);

    // 트랜잭션: Alice -> Bob 500원 송금
    console.log('💸 Alice가 Bob에게 500원 송금 (트랜잭션 사용)\n');

    const multi = client.multi();
    multi.decrBy('user:alice:balance', 500);  // Alice 잔액 차감
    multi.incrBy('user:bob:balance', 500);    // Bob 잔액 증가
    multi.lPush('transfer:history', JSON.stringify({
        from: 'Alice',
        to: 'Bob',
        amount: 500,
        timestamp: new Date().toISOString()
    }));

    const results = await multi.exec();
    console.log('✅ 트랜잭션 실행 결과:', results);

    console.log('\n💰 트랜잭션 후 잔액:');
    console.log(`   Alice: ${await client.get('user:alice:balance')}원`);
    console.log(`   Bob: ${await client.get('user:bob:balance')}원`);

    console.log('\n📌 트랜잭션 특징:');
    console.log('   - 모든 명령이 원자적으로 실행됨');
    console.log('   - 실행 중 다른 클라이언트 명령 차단');
    console.log('   - 롤백은 미지원 (RDBMS와 차이점)\n');
}

// ============================================
// WATCH를 사용한 낙관적 잠금
// ============================================

async function practiceOptimisticLocking() {
    console.log('\n========== 3-2. WATCH (낙관적 잠금) 실습 ==========\n');

    // 재고 설정
    await client.set('product:laptop:stock', '5');
    console.log('📦 초기 재고: 5개\n');

    // 낙관적 잠금을 사용한 재고 차감
    async function decreaseStock(userId) {
        let success = false;
        let attempts = 0;

        while (!success && attempts < 3) {
            attempts++;

            // 재고 감시 시작
            await client.watch('product:laptop:stock');

            const stock = parseInt(await client.get('product:laptop:stock'));

            if (stock > 0) {
                console.log(`👤 [${userId}] 재고 확인: ${stock}개 남음 (시도 ${attempts})`);

                // 약간의 지연 (동시성 시뮬레이션)
                await new Promise(resolve => setTimeout(resolve, 100));

                // 트랜잭션 시작
                const multi = client.multi();
                multi.decr('product:laptop:stock');
                multi.sAdd(`user:${userId}:orders`, 'laptop');

                const result = await multi.exec();

                if (result === null) {
                    // WATCH한 키가 변경됨 -> 트랜잭션 실패
                    console.log(`❌ [${userId}] 트랜잭션 실패 (다른 사용자가 먼저 구매함)`);
                } else {
                    console.log(`✅ [${userId}] 구매 성공!`);
                    success = true;
                }
            } else {
                await client.unwatch();
                console.log(`❌ [${userId}] 재고 부족`);
                break;
            }
        }

        if (!success && attempts >= 3) {
            console.log(`❌ [${userId}] 최대 재시도 횟수 초과`);
        }
    }

    // 3명의 사용자가 동시에 구매 시도
    await Promise.all([
        decreaseStock('user1'),
        decreaseStock('user2'),
        decreaseStock('user3')
    ]);

    const finalStock = await client.get('product:laptop:stock');
    console.log(`\n📦 최종 재고: ${finalStock}개`);

    console.log('\n📌 WATCH의 동작:');
    console.log('   - 키를 감시하여 변경 감지');
    console.log('   - 변경 시 트랜잭션 실패 (nil 반환)');
    console.log('   - 재시도 로직을 직접 구현해야 함\n');
}

// ============================================
// 복잡한 비즈니스 로직 예제
// ============================================

async function practiceComplexTransaction() {
    console.log('\n========== 3-3. 복잡한 비즈니스 로직 예제 ==========\n');

    // 초기 데이터 설정
    await client.set('user:carol:points', '1000');
    await client.set('user:carol:level', '5');
    await client.del('user:carol:badges');

    console.log('👤 초기 상태:');
    console.log(`   포인트: ${await client.get('user:carol:points')}p`);
    console.log(`   레벨: ${await client.get('user:carol:level')}\n`);

    // 포인트 사용 + 레벨업 + 뱃지 획득 (원자적 실행)
    console.log('🎮 게임 액션 실행 (포인트 사용 + 레벨업 + 뱃지)...\n');

    const multi = client.multi();
    multi.decrBy('user:carol:points', 500);        // 포인트 차감
    multi.incrBy('user:carol:level', 1);           // 레벨 증가
    multi.sAdd('user:carol:badges', 'achiever');   // 뱃지 추가
    multi.sAdd('user:carol:badges', 'explorer');
    multi.set('user:carol:last_action', new Date().toISOString());

    const results = await multi.exec();
    console.log('✅ 트랜잭션 실행 완료');

    console.log('\n👤 변경 후 상태:');
    console.log(`   포인트: ${await client.get('user:carol:points')}p`);
    console.log(`   레벨: ${await client.get('user:carol:level')}`);
    const badges = await client.sMembers('user:carol:badges');
    console.log(`   뱃지: ${badges.join(', ')}`);

    console.log('\n💡 활용 사례:');
    console.log('   - 게임 내 동시 여러 상태 변경');
    console.log('   - 주문 + 재고 + 포인트 동시 처리');
    console.log('   - 복잡한 비즈니스 규칙 원자적 실행\n');
}

// ============================================
// 메인 실행
// ============================================

try {
    await practiceBasicTransaction();
    await practiceOptimisticLocking();
    await practiceComplexTransaction();

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Transactions 실습이 완료되었습니다!');
    console.log('\n📚 학습 정리:');
    console.log('   ✓ MULTI/EXEC로 원자적 실행');
    console.log('   ✓ WATCH로 낙관적 잠금 구현');
    console.log('   ✓ 복잡한 비즈니스 로직 처리');
    console.log('\n⚠️  RDBMS와의 차이점:');
    console.log('   - 롤백(Rollback) 미지원');
    console.log('   - 각 명령은 독립적으로 실행');
    console.log('   - 에러 발생 시에도 계속 진행\n');

} catch (error) {
    console.error('❌ 오류 발생:', error);
} finally {
    await client.quit();
}
