/**
 * 5. Atomic 연산 실습
 * 
 * 주제: 동시성 제어와 원자적 연산
 * 실행: node advanced/05-atomic.js
 */

import { createClient } from 'redis';

const client = await createClient({
    url: 'redis://localhost:6379'
}).connect();

console.log('🚀 Redis Atomic 연산 실습을 시작합니다!\n');
console.log('='.repeat(60));

// ============================================
// 잘못된 방법 vs 올바른 방법
// ============================================

async function compareWrongVsRight() {
    console.log('\n========== 5-1. 잘못된 방법 vs 올바른 방법 ==========\n');

    // 잘못된 방법
    console.log('❌ 잘못된 방법 (GET + SET):');
    await client.set('wrong_counter', '0');
    const value1 = parseInt(await client.get('wrong_counter'));
    await client.set('wrong_counter', value1 + 1);
    console.log(`   결과: ${await client.get('wrong_counter')}`);
    console.log('   ⚠️  동시성 문제 발생 가능!\n');

    // 올바른 방법
    console.log('✅ 올바른 방법 (INCR):');
    await client.set('right_counter', '0');
    await client.incr('right_counter');
    await client.incr('right_counter');
    console.log(`   결과: ${await client.get('right_counter')}`);
    console.log('   ✅ 원자성 보장!\n');
}

// ============================================
// 다양한 Atomic 명령어
// ============================================

async function practiceAtomicCommands() {
    console.log('\n========== 5-2. 다양한 Atomic 명령어 ==========\n');

    await client.set('score', '0');
    await client.incrBy('score', 10);
    console.log(`✓ INCRBY score 10: ${await client.get('score')}`);

    await client.decrBy('score', 3);
    console.log(`✓ DECRBY score 3: ${await client.get('score')}`);

    const result1 = await client.setNX('lock:resource', 'locked');
    console.log(`\n✓ SETNX (첫 시도): ${result1 ? '✅ 성공' : '❌ 실패'}`);

    const result2 = await client.setNX('lock:resource', 'locked');
    console.log(`✓ SETNX (재시도): ${result2 ? '✅ 성공' : '❌ 실패'}\n`);
}

// ============================================
// Lua Script 실습
// ============================================

async function practiceLuaScript() {
    console.log('\n========== 5-3. Lua Script 실습 ==========\n');

    await client.set('user:1001:points', '1000');
    await client.del('user:1001:items');

    const luaScript = `
        local points = redis.call('GET', KEYS[1])
        local required = tonumber(ARGV[1])
        if tonumber(points) >= required then
            redis.call('DECRBY', KEYS[1], required)
            redis.call('SADD', KEYS[2], ARGV[2])
            return 1
        else
            return 0
        end
    `;

    console.log('💰 초기 포인트: 1000p\n');

    const result1 = await client.eval(luaScript, {
        keys: ['user:1001:points', 'user:1001:items'],
        arguments: ['300', 'sword']
    });
    console.log(`🛒 구매 (300p): ${result1 === 1 ? '✅ 성공' : '❌ 실패'}`);
    console.log(`   포인트: ${await client.get('user:1001:points')}p`);

    const items = await client.sMembers('user:1001:items');
    console.log(`   아이템: ${Array.isArray(items) ? items.join(', ') : items}\n`);
}

// ============================================
// 메인 실행
// ============================================

try {
    await compareWrongVsRight();
    await practiceAtomicCommands();
    await practiceLuaScript();

    console.log('='.repeat(60));
    console.log('\n✅ Atomic 연산 실습 완료!');
    console.log('\n📚 학습 정리:');
    console.log('   ✓ Atomic 연산의 중요성');
    console.log('   ✓ INCR, INCRBY, SETNX 활용');
    console.log('   ✓ Lua Script로 복잡한 로직 구현\n');

} catch (error) {
    console.error('❌ 오류:', error);
} finally {
    await client.quit();
}
