/**
 * 2. Pub/Sub (발행/구독) 실습
 * 
 * 주제: 실시간 메시징 패턴
 * 실행: node advanced/02-pubsub.js
 */

import { createClient } from 'redis';

const subscriber1 = await createClient({ url: 'redis://localhost:6379' }).connect();
const subscriber2 = await createClient({ url: 'redis://localhost:6379' }).connect();
const publisher = await createClient({ url: 'redis://localhost:6379' }).connect();

console.log('🚀 Redis Pub/Sub 실습을 시작합니다!\n');
console.log('='.repeat(60));

// ============================================
// 기본 Pub/Sub 실습
// ============================================

async function practiceBasicPubSub() {
    console.log('\n========== 2-1. 기본 Pub/Sub 실습 ==========\n');

    return new Promise(async (resolve) => {
        let messageCount = 0;

        // 채널 구독
        await subscriber1.subscribe('news', (message, channel) => {
            console.log(`📨 [구독자1] ${channel} 채널에서 메시지 수신: ${message}`);
            messageCount++;
            if (messageCount >= 3) {
                setTimeout(() => resolve(), 1000);
            }
        });

        await subscriber2.subscribe('news', (message, channel) => {
            console.log(`📨 [구독자2] ${channel} 채널에서 메시지 수신: ${message}`);
        });

        console.log('✅ 2명의 구독자가 "news" 채널을 구독 중...\n');

        // 메시지 발행
        setTimeout(() => {
            publisher.publish('news', '속보: Redis Pub/Sub 실습 진행 중!');
        }, 500);

        setTimeout(() => {
            publisher.publish('news', '기술: Redis 7.0 출시');
        }, 1000);

        setTimeout(() => {
            publisher.publish('news', '튜토리얼: Redis 고급 기능 학습');
        }, 1500);
    });
}

// ============================================
// 패턴 매칭 Pub/Sub 실습
// ============================================

async function practicePatternPubSub() {
    console.log('\n========== 2-2. 패턴 매칭 Pub/Sub 실습 ==========\n');

    return new Promise(async (resolve) => {
        const patternSubscriber = await createClient({ url: 'redis://localhost:6379' }).connect();

        // 패턴 기반 구독 (news.* 패턴)
        await patternSubscriber.pSubscribe('news.*', (message, channel) => {
            console.log(`🎯 [패턴 구독] news.* 패턴 매칭: ${channel} -> ${message}`);
        });

        console.log('✅ "news.*" 패턴으로 구독 시작\n');

        // 다양한 채널에 메시지 발행
        setTimeout(() => {
            publisher.publish('news.sports', '⚽ 손흥민 해트트릭!');
            publisher.publish('news.tech', '💻 AI 기술 발전');
            publisher.publish('weather', '☀️ 맑은 날씨'); // 매칭 안 됨
            console.log('📤 3개의 메시지 발행 (weather는 패턴 불일치)\n');
        }, 500);

        setTimeout(async () => {
            await patternSubscriber.pUnsubscribe();
            await patternSubscriber.quit();
            resolve();
        }, 1500);
    });
}

// ============================================
// 간단한 알림 시스템 예제
// ============================================

async function practiceNotificationSystem() {
    console.log('\n========== 2-3. 알림 시스템 예제 ==========\n');

    return new Promise(async (resolve) => {
        const notificationSubscriber = await createClient({ url: 'redis://localhost:6379' }).connect();
        const notificationPublisher = await createClient({ url: 'redis://localhost:6379' }).connect();

        let notifCount = 0;

        // 사용자별 알림 채널 구독
        await notificationSubscriber.subscribe('user:1001:notifications', (message, channel) => {
            const notif = JSON.parse(message);
            console.log(`🔔 [사용자 1001] ${notif.type}: ${notif.message}`);
            notifCount++;
            if (notifCount >= 3) {
                setTimeout(async () => {
                    await notificationSubscriber.quit();
                    await notificationPublisher.quit();
                    resolve();
                }, 500);
            }
        });

        console.log('✅ 사용자 알림 채널 구독 중...\n');

        // 알림 발송
        setTimeout(() => {
            const notification1 = JSON.stringify({
                type: '주문',
                message: '주문이 접수되었습니다',
                timestamp: new Date().toISOString()
            });
            notificationPublisher.publish('user:1001:notifications', notification1);
        }, 500);

        setTimeout(() => {
            const notification2 = JSON.stringify({
                type: '결제',
                message: '결제가 완료되었습니다',
                timestamp: new Date().toISOString()
            });
            notificationPublisher.publish('user:1001:notifications', notification2);
        }, 1000);

        setTimeout(() => {
            const notification3 = JSON.stringify({
                type: '배송',
                message: '상품이 발송되었습니다',
                timestamp: new Date().toISOString()
            });
            notificationPublisher.publish('user:1001:notifications', notification3);
        }, 1500);
    });
}

// ============================================
// 메인 실행
// ============================================

try {
    await practiceBasicPubSub();
    await practicePatternPubSub();
    await practiceNotificationSystem();

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Pub/Sub 실습이 완료되었습니다!');
    console.log('\n📚 학습 정리:');
    console.log('   ✓ 기본 채널 구독 및 발행');
    console.log('   ✓ 패턴 매칭을 통한 구독');
    console.log('   ✓ 실시간 알림 시스템 구현');
    console.log('\n⚠️  주의사항:');
    console.log('   - Pub/Sub은 메시지를 저장하지 않음');
    console.log('   - 구독자가 없으면 메시지 소실');
    console.log('   - 신뢰성 있는 메시징은 Redis Streams 고려\n');

} catch (error) {
    console.error('❌ 오류 발생:', error);
} finally {
    await subscriber1.quit();
    await subscriber2.quit();
    await publisher.quit();
}
