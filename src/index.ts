import { Client, GatewayIntentBits, TextChannel, EmbedBuilder } from 'discord.js';
import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import * as dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

// 상수 정의
const MAX_INITIAL_ITEMS = 3; // 초기 실행 시 최대 메시지 개수
const MAX_RUNTIME_ITEMS = 10; // 일반 실행 시 최대 메시지 개수
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5분마다 헬스체크
const NETWORK_TIMEOUT = 15000; // 15초 네트워크 타임아웃
const MAX_RETRIES = 3; // 최대 재시도 횟수

// 향상된 로깅 시스템
class Logger {
    private static logLevel = process.env.LOG_LEVEL || 'info';
    private static logDir = path.join(process.cwd(), 'logs');

    static async init() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('로그 디렉토리 생성 실패:', error);
        }
    }

    private static getTimestamp(): string {
        return new Date().toISOString();
    }

    private static async writeToFile(level: string, message: string, ...args: any[]) {
        const timestamp = this.getTimestamp();
        const logMessage = `${timestamp} [${level.toUpperCase()}] ${message} ${args.length > 0 ? JSON.stringify(args) : ''}\n`;

        try {
            const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
            await fs.appendFile(logFile, logMessage);
        } catch (error) {
            console.error('로그 파일 쓰기 실패:', error);
        }
    }

    static debug(message: string, ...args: any[]) {
        if (this.shouldLog('debug')) {
            console.log(`[${this.getTimestamp()}] 🔍 ${message}`, ...args);
            this.writeToFile('debug', message, ...args);
        }
    }

    static info(message: string, ...args: any[]) {
        if (this.shouldLog('info')) {
            console.log(`[${this.getTimestamp()}] 📝 ${message}`, ...args);
            this.writeToFile('info', message, ...args);
        }
    }

    static success(message: string, ...args: any[]) {
        if (this.shouldLog('info')) {
            console.log(`[${this.getTimestamp()}] ✅ ${message}`, ...args);
            this.writeToFile('success', message, ...args);
        }
    }

    static warning(message: string, ...args: any[]) {
        if (this.shouldLog('warning')) {
            console.warn(`[${this.getTimestamp()}] ⚠️ ${message}`, ...args);
            this.writeToFile('warning', message, ...args);
        }
    }

    static error(message: string, ...args: any[]) {
        if (this.shouldLog('error')) {
            console.error(`[${this.getTimestamp()}] ❌ ${message}`, ...args);
            this.writeToFile('error', message, ...args);
        }
    }

    private static shouldLog(level: string): boolean {
        const levels = ['debug', 'info', 'warning', 'error'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

    // 로그 파일 정리 (7일 이상 된 파일 삭제)
    static async cleanupLogs() {
        try {
            const files = await fs.readdir(this.logDir);
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            for (const file of files) {
                if (file.endsWith('.log')) {
                    const filePath = path.join(this.logDir, file);
                    const stats = await fs.stat(filePath);

                    if (stats.mtime < sevenDaysAgo) {
                        await fs.unlink(filePath);
                        Logger.info(`오래된 로그 파일 삭제: ${file}`);
                    }
                }
            }
        } catch (error) {
            Logger.error('로그 파일 정리 실패:', error);
        }
    }
}

interface FeedConfig {
    url: string;
    channelId: string;
    name: string;
    description?: string;
    color?: string; // 임베드 색상 (hex)
    thumbnail?: string; // 썸네일 URL
}

interface FeedCacheItem {
    link: string;
    sentAt: number; // 전송된 시간 (timestamp)
    title?: string;
}

interface FeedCache {
    [feedUrl: string]: FeedCacheItem[];
}

interface BotStatus {
    startTime: number;
    lastCheck: number;
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    isFirstRun: boolean;
    networkErrors: number;
    lastNetworkError?: number;
}

interface FeedsData {
    feeds: FeedConfig[];
    settings?: {
        checkIntervalMinutes?: number;
        maxDescriptionLength?: number;
        cacheSize?: number;
        useEmbeds?: boolean;
    };
}

interface RSSItem {
    title?: string;
    link?: string;
    content?: string;
    contentSnippet?: string;
    pubDate?: string;
    creator?: string;
    categories?: string[];
}

// 네트워크 및 시스템 안정성 관리
class SystemManager {
    private static networkRetryCount = 0;
    private static lastNetworkCheck = 0;

    static async checkNetworkConnection(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('https://www.google.com/generate_204', {
                signal: controller.signal,
                method: 'HEAD'
            });

            clearTimeout(timeoutId);
            this.networkRetryCount = 0;
            return response.status === 204;
        } catch (error) {
            this.networkRetryCount++;
            Logger.warning(`네트워크 연결 확인 실패 (${this.networkRetryCount}회): ${error}`);
            return false;
        }
    }

    static async waitForNetwork(maxWaitTime = 60000): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            if (await this.checkNetworkConnection()) {
                return true;
            }

            Logger.info('네트워크 연결 대기 중...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        return false;
    }

    static getMemoryUsage() {
        const used = process.memoryUsage();
        return {
            rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
            heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
            heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
            external: Math.round(used.external / 1024 / 1024 * 100) / 100
        };
    }

    static logSystemStatus() {
        const memory = this.getMemoryUsage();
        Logger.info(`시스템 상태 - 메모리: RSS ${memory.rss}MB, Heap ${memory.heapUsed}/${memory.heapTotal}MB`);
    }
}

// 설정 파일 로딩 및 검증
class ConfigManager {
    private static readonly CONFIG_FILE = 'feeds.json';

    static async loadConfig(): Promise<FeedsData> {
        try {
            const configPath = path.resolve(this.CONFIG_FILE);
            const data = await fs.readFile(configPath, 'utf-8');
            const config: FeedsData = JSON.parse(data);

            this.validateConfig(config);
            Logger.success(`설정 파일 로드 완료: ${config.feeds.length}개 피드`);

            return config;
        } catch (error) {
            if (error instanceof SyntaxError) {
                Logger.error('feeds.json 파일 형식이 올바르지 않습니다.');
            } else {
                Logger.error('설정 파일을 읽을 수 없습니다:', error);
            }
            throw error;
        }
    }

    private static validateConfig(config: FeedsData): void {
        if (!config.feeds || !Array.isArray(config.feeds)) {
            throw new Error('feeds 배열이 정의되지 않았습니다.');
        }

        for (const [index, feed] of config.feeds.entries()) {
            if (!feed.url || !feed.channelId || !feed.name) {
                throw new Error(`피드 ${index + 1}: url, channelId, name은 필수입니다.`);
            }

            try {
                new URL(feed.url);
            } catch {
                throw new Error(`피드 ${index + 1}: 올바르지 않은 URL 형식입니다.`);
            }

            if (!/^\d{17,19}$/.test(feed.channelId)) {
                Logger.warning(`피드 ${index + 1}: 채널 ID 형식이 의심스럽습니다.`);
            }
        }
    }
}

class RSSBot {
    private client: Client;
    private parser: Parser;
    private config: FeedsData;
    private cache: FeedCache = {};
    private status: BotStatus;
    private readonly cacheFile = 'feed_cache.json';
    private readonly statusFile = 'bot_status.json';
    private checkInterval: number;
    private intervalId: NodeJS.Timeout | null = null;
    private healthCheckId: NodeJS.Timeout | null = null;
    private isRunning = false;
    private retryAttempts: Map<string, number> = new Map();

    // 기본 설정값
    private readonly defaultSettings = {
        checkIntervalMinutes: 60,
        maxDescriptionLength: 300,
        cacheSize: 50, // 라즈베리파이를 위해 축소
        useEmbeds: true
    };

    constructor(config: FeedsData) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages
            ],
            // 라즈베리파이를 위한 최적화
            rest: {
                timeout: NETWORK_TIMEOUT,
                retries: 3
            }
        });

        this.parser = new Parser({
            timeout: NETWORK_TIMEOUT,
            headers: {
                'User-Agent': 'Discord RSS Bot/2.0 (Raspberry Pi)',
                'Accept': 'application/rss+xml, application/xml, text/xml'
            },
            maxRedirects: 5,
            requestOptions: {
                rejectUnauthorized: false // 일부 RSS 피드의 SSL 문제 해결
            }
        });

        this.config = config;
        const settings = { ...this.defaultSettings, ...config.settings };
        this.checkInterval = settings.checkIntervalMinutes * 60 * 1000;

        // 상태 초기화
        this.status = {
            startTime: Date.now(),
            lastCheck: 0,
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            isFirstRun: true,
            networkErrors: 0
        };

        this.setupErrorHandlers();
    }

    private setupErrorHandlers(): void {
        this.client.on('error', (error) => {
            Logger.error('Discord 클라이언트 오류:', error);
        });

        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('SIGTERM', () => this.gracefulShutdown());
    }

    private async gracefulShutdown(): Promise<void> {
        Logger.info('봇 종료 중...');
        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        if (this.healthCheckId) {
            clearInterval(this.healthCheckId);
            this.healthCheckId = null;
        }

        await this.saveCache();
        await this.saveStatus();

        this.client.destroy();
        Logger.success('봇이 안전하게 종료되었습니다.');
        process.exit(0);
    }

    async start(token: string): Promise<void> {
        if (this.isRunning) {
            Logger.warning('봇이 이미 실행 중입니다.');
            return;
        }

        try {
            // 네트워크 연결 확인
            Logger.info('네트워크 연결 확인 중...');
            if (!(await SystemManager.waitForNetwork())) {
                throw new Error('네트워크 연결을 할 수 없습니다.');
            }

            // 캐시 및 상태 로드
            await this.loadCache();

            // Discord 봇 로그인
            this.client.once('ready', async () => {
                Logger.success(`봇이 ${this.client.user?.tag}으로 로그인했습니다!`);
                Logger.info(`📡 ${this.config.feeds.length}개의 RSS 피드를 모니터링합니다.`);
                Logger.info(`⏰ 확인 주기: ${this.checkInterval / 60000}분`);

                if (this.status.isFirstRun) {
                    Logger.info(`🚀 첫 실행: 초기 메시지는 피드당 최대 ${MAX_INITIAL_ITEMS}개로 제한됩니다.`);
                }

                // 채널 접근 권한 검증
                await this.validateChannels();

                this.isRunning = true;

                // 헬스체크 시작
                await this.startHealthCheck();

                // 시작 시 첫 확인 (네트워크 안정화 대기)
                setTimeout(async () => {
                    try {
                        await this.checkAllFeeds();
                        this.status.isFirstRun = false;
                        await this.saveStatus();
                    } catch (error) {
                        Logger.error('첫 피드 확인 실패:', error);
                    }
                }, 10000); // 10초 대기

                // 주기적으로 확인
                this.intervalId = setInterval(() => {
                    this.checkAllFeeds().catch(error => {
                        Logger.error('피드 확인 중 오류:', error);
                        this.status.failedChecks++;
                    });
                }, this.checkInterval);
            });

            await this.client.login(token);
        } catch (error) {
            Logger.error('봇 시작 실패:', error);
            this.status.failedChecks++;
            throw error;
        }
    }

    private async validateChannels(): Promise<void> {
        Logger.info('채널 접근 권한 확인 중...');

        for (const feed of this.config.feeds) {
            try {
                const channel = await this.client.channels.fetch(feed.channelId);
                if (!channel || !channel.isTextBased()) {
                    Logger.warning(`${feed.name}: 채널을 찾을 수 없거나 텍스트 채널이 아닙니다.`);
                }
            } catch (error) {
                Logger.error(`${feed.name}: 채널 접근 실패 (${feed.channelId})`);
            }
        }
    }

    private async loadCache(): Promise<void> {
        try {
            const cachePath = path.resolve(this.cacheFile);
            const data = await fs.readFile(cachePath, 'utf-8');
            const loadedCache = JSON.parse(data);

            // 기존 캐시 형식 호환성 처리
            this.cache = {};
            for (const [feedUrl, items] of Object.entries(loadedCache)) {
                if (Array.isArray(items)) {
                    if (items.length > 0 && typeof items[0] === 'string') {
                        // 기존 형식 (string[])
                        this.cache[feedUrl] = (items as string[]).map(link => ({
                            link,
                            sentAt: Date.now() - 24 * 60 * 60 * 1000 // 24시간 전으로 가정
                        }));
                    } else {
                        // 새 형식 (FeedCacheItem[])
                        this.cache[feedUrl] = items as FeedCacheItem[];
                    }
                }
            }

            // 오래된 캐시 항목 정리 (7일 이상)
            await this.cleanupOldCache();

            const totalCached = Object.values(this.cache).reduce((sum, items) => sum + items.length, 0);
            Logger.success(`캐시 로드 완료 (${totalCached}개 아이템)`);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                Logger.info('새로운 캐시 파일을 생성합니다.');
            } else {
                Logger.warning('캐시 로드 실패, 새로 시작합니다:', error);
            }
            this.cache = {};
        }

        // 상태 파일 로드
        await this.loadStatus();
    }

    private async loadStatus(): Promise<void> {
        try {
            const statusPath = path.resolve(this.statusFile);
            const data = await fs.readFile(statusPath, 'utf-8');
            const savedStatus = JSON.parse(data);

            // 기존 상태가 24시간 이내인 경우만 복원
            if (Date.now() - savedStatus.lastCheck < 24 * 60 * 60 * 1000) {
                this.status = { ...this.status, ...savedStatus };
                Logger.info('이전 봇 상태를 복원했습니다.');
            } else {
                Logger.info('오래된 상태 파일, 새로 시작합니다.');
                this.status.isFirstRun = true;
            }
        } catch (error) {
            Logger.debug('상태 파일 로드 실패 (첫 실행일 가능성):', error);
        }
    }

    private async cleanupOldCache(): Promise<void> {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        let cleanedCount = 0;

        for (const [feedUrl, items] of Object.entries(this.cache)) {
            const originalLength = items.length;
            this.cache[feedUrl] = items.filter(item => item.sentAt > sevenDaysAgo);
            cleanedCount += originalLength - this.cache[feedUrl].length;
        }

        if (cleanedCount > 0) {
            Logger.info(`오래된 캐시 항목 ${cleanedCount}개 정리 완료`);
            await this.saveCache();
        }
    }

    private async saveCache(): Promise<void> {
        try {
            const cachePath = path.resolve(this.cacheFile);
            await fs.writeFile(cachePath, JSON.stringify(this.cache, null, 2));
        } catch (error) {
            Logger.error('캐시 저장 실패:', error);
        }
    }

    private async checkAllFeeds(): Promise<void> {
        if (!this.isRunning) {
            Logger.warning('봇이 실행 중이 아닙니다.');
            return;
        }

        Logger.info(`RSS 피드 확인 시작 (${this.status.totalChecks + 1}번째)`);
        const startTime = Date.now();
        let successCount = 0;
        let errorCount = 0;

        this.status.totalChecks++;
        this.status.lastCheck = startTime;

        const promises = this.config.feeds.map(async (feed) => {
            try {
                await this.checkFeed(feed);
                successCount++;
            } catch (error) {
                errorCount++;
                Logger.error(`${feed.name} 확인 실패:`, error);
                await this.handleFeedError(feed, error);
            }
        });

        await Promise.allSettled(promises);

        // 상태 업데이트
        if (errorCount === 0) {
            this.status.successfulChecks++;
        } else {
            this.status.failedChecks++;
        }

        const duration = Date.now() - startTime;
        Logger.info(`피드 확인 완료: 성공 ${successCount}개, 실패 ${errorCount}개 (${duration}ms)`);

        // 캐시 저장
        await this.saveCache();
        await this.saveStatus();
    }

    private async handleFeedError(feed: FeedConfig, error: any): Promise<void> {
        // 에러 카운터 관리 (간단한 메모리 기반)
        const errorKey = `error_${feed.url}`;
        const errorCount = (this.cache[errorKey]?.length || 0) + 1;

        if (errorCount >= 5) {
            Logger.warning(`${feed.name}: 5회 연속 실패, URL 확인 필요`);
        }
    }

    private async checkFeed(feedConfig: FeedConfig): Promise<void> {
        const retryKey = feedConfig.url;
        const currentRetries = this.retryAttempts.get(retryKey) || 0;

        try {
            // 네트워크 연결 확인
            if (!(await SystemManager.checkNetworkConnection())) {
                throw new Error('네트워크 연결 없음');
            }

            const feed = await this.parser.parseURL(feedConfig.url);

            // 캐시 초기화
            if (!this.cache[feedConfig.url]) {
                this.cache[feedConfig.url] = [];
            }

            const cachedLinks = this.cache[feedConfig.url].map(item => item.link);
            const newItems = feed.items
                .filter((item): item is RSSItem & { link: string } =>
                    Boolean(item.link && !cachedLinks.includes(item.link))
                )
                .sort((a, b) => {
                    // 시간순 정렬 (오래된 것부터)
                    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
                    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
                    return dateA - dateB;
                });

            if (newItems.length > 0) {
                // 초기 실행 시 메시지 개수 제한
                const maxItems = this.status.isFirstRun ? MAX_INITIAL_ITEMS : MAX_RUNTIME_ITEMS;
                const itemsToSend = newItems.slice(0, maxItems);

                if (this.status.isFirstRun && newItems.length > MAX_INITIAL_ITEMS) {
                    Logger.warning(`${feedConfig.name}: 초기 실행으로 ${newItems.length}개 중 ${MAX_INITIAL_ITEMS}개만 전송`);
                } else {
                    Logger.info(`📰 ${feedConfig.name}: ${itemsToSend.length}개의 새 글 발견`);
                }

                const channel = await this.client.channels.fetch(feedConfig.channelId) as TextChannel;
                if (!channel || !channel.isTextBased()) {
                    throw new Error('텍스트 채널을 찾을 수 없습니다.');
                }

                for (const item of itemsToSend) {
                    try {
                        await this.sendFeedItem(channel, feedConfig, item);

                        // 캐시에 추가
                        this.cache[feedConfig.url].push({
                            link: item.link,
                            sentAt: Date.now(),
                            title: item.title
                        });

                        // 전송 간격 (라즈베리파이 안정성을 위해 증가)
                        await this.sleep(2000);
                    } catch (sendError) {
                        Logger.error(`메시지 전송 실패 (${feedConfig.name}):`, sendError);
                    }
                }

                // 전송하지 않은 나머지 아이템도 캐시에 추가 (중복 방지)
                for (const item of newItems.slice(itemsToSend.length)) {
                    this.cache[feedConfig.url].push({
                        link: item.link,
                        sentAt: Date.now(),
                        title: item.title
                    });
                }

                // 캐시 크기 제한
                const settings = { ...this.defaultSettings, ...this.config.settings };
                if (this.cache[feedConfig.url].length > settings.cacheSize) {
                    this.cache[feedConfig.url] = this.cache[feedConfig.url]
                        .slice(-settings.cacheSize);
                }

                await this.saveCache();
            }

            // 성공 시 재시도 카운터 리셋
            this.retryAttempts.delete(retryKey);

        } catch (error) {
            this.status.networkErrors++;
            this.status.lastNetworkError = Date.now();

            if (currentRetries < MAX_RETRIES) {
                this.retryAttempts.set(retryKey, currentRetries + 1);
                Logger.warning(`${feedConfig.name} 재시도 ${currentRetries + 1}/${MAX_RETRIES}: ${error}`);

                // 지수 백오프로 재시도
                await this.sleep(Math.pow(2, currentRetries) * 1000);
                return this.checkFeed(feedConfig);
            } else {
                this.retryAttempts.delete(retryKey);
                throw new Error(`${feedConfig.name} 피드 확인 실패 (${MAX_RETRIES}회 재시도 후): ${error}`);
            }
        }
    }

    private async sendFeedItem(channel: TextChannel, feedConfig: FeedConfig, item: RSSItem): Promise<void> {
        const settings = { ...this.defaultSettings, ...this.config.settings };

        if (settings.useEmbeds) {
            await this.sendEmbedMessage(channel, feedConfig, item);
        } else {
            await this.sendPlainMessage(channel, feedConfig, item);
        }
    }

    private async sendEmbedMessage(channel: TextChannel, feedConfig: FeedConfig, item: RSSItem): Promise<void> {
        const settings = { ...this.defaultSettings, ...this.config.settings };
        const title = item.title || '제목 없음';
        const description = item.contentSnippet || item.content || '';
        const shortDesc = description.length > settings.maxDescriptionLength
            ? description.substring(0, settings.maxDescriptionLength) + '...'
            : description;

        const embed = new EmbedBuilder()
            .setTitle(title.length > 256 ? title.substring(0, 253) + '...' : title)
            .setColor(feedConfig.color ? parseInt(feedConfig.color.replace('#', ''), 16) : 0x0099FF)
            .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date())
            .setFooter({ text: feedConfig.name });

        if (item.link) {
            embed.setURL(item.link);
        }

        if (shortDesc) {
            embed.setDescription(shortDesc);
        }

        if (item.creator) {
            embed.setAuthor({ name: item.creator });
        }

        if (feedConfig.thumbnail) {
            embed.setThumbnail(feedConfig.thumbnail);
        }

        await channel.send({ embeds: [embed] });
    }

    private async sendPlainMessage(channel: TextChannel, feedConfig: FeedConfig, item: RSSItem): Promise<void> {
        const settings = { ...this.defaultSettings, ...this.config.settings };
        const title = item.title || '제목 없음';
        const description = item.contentSnippet || item.content || '';
        const pubDate = item.pubDate ? new Date(item.pubDate).toLocaleString('ko-KR') : '';

        const shortDesc = description.length > settings.maxDescriptionLength
            ? description.substring(0, settings.maxDescriptionLength) + '...'
            : description;

        const message = [
            `**📰 ${feedConfig.name}**`,
            `**${title}**`,
            item.link || '',
            shortDesc ? `\n${shortDesc}` : '',
            pubDate ? `\n🕐 ${pubDate}` : ''
        ].filter(Boolean).join('\n');

        await channel.send(message);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async saveStatus(): Promise<void> {
        try {
            const statusPath = path.resolve(this.statusFile);
            await fs.writeFile(statusPath, JSON.stringify(this.status, null, 2));
        } catch (error) {
            Logger.error('상태 저장 실패:', error);
        }
    }

    private async startHealthCheck(): Promise<void> {
        this.healthCheckId = setInterval(async () => {
            try {
                SystemManager.logSystemStatus();

                // 메모리 사용량 체크
                const memory = SystemManager.getMemoryUsage();
                if (memory.heapUsed > 200) { // 200MB 초과 시 경고
                    Logger.warning(`높은 메모리 사용량: ${memory.heapUsed}MB`);

                    // 가비지 컬렉션 강제 실행 (가능한 경우)
                    if (global.gc) {
                        global.gc();
                        Logger.info('가비지 컬렉션 실행됨');
                    }
                }

                // 네트워크 상태 체크
                const networkOk = await SystemManager.checkNetworkConnection();
                if (!networkOk) {
                    Logger.warning('네트워크 연결 문제 감지');
                    this.status.networkErrors++;
                }

                // 상태 저장
                await this.saveStatus();

                // 로그 정리
                await Logger.cleanupLogs();

            } catch (error) {
                Logger.error('헬스체크 실행 중 오류:', error);
            }
        }, HEALTH_CHECK_INTERVAL);
    }

    // 봇 상태 조회 메서드 (확장됨)
    public getStatus() {
        const memory = SystemManager.getMemoryUsage();
        return {
            isRunning: this.isRunning,
            feedCount: this.config.feeds.length,
            cacheSize: Object.values(this.cache).reduce((sum, items) => sum + items.length, 0),
            checkInterval: this.checkInterval / 60000,
            uptime: this.client.uptime,
            totalChecks: this.status.totalChecks,
            successfulChecks: this.status.successfulChecks,
            failedChecks: this.status.failedChecks,
            networkErrors: this.status.networkErrors,
            memoryUsage: memory,
            isFirstRun: this.status.isFirstRun,
            lastCheck: this.status.lastCheck,
            startTime: this.status.startTime
        };
    }
}

// 메인 실행 함수
async function main(): Promise<void> {
    try {
        // 로거 초기화
        await Logger.init();

        Logger.info('Discord RSS Bot v2.0 시작 (라즈베리파이 최적화)');
        SystemManager.logSystemStatus();

        // 환경변수 검증
        const BOT_TOKEN = process.env.BOT_TOKEN;
        if (!BOT_TOKEN) {
            Logger.error('BOT_TOKEN 환경변수가 설정되지 않았습니다.');
            Logger.info('💡 .env 파일에 BOT_TOKEN=your_discord_bot_token 을 추가하세요.');
            process.exit(1);
        }

        // 설정 로드
        const config = await ConfigManager.loadConfig();

        if (config.feeds.length === 0) {
            Logger.error('유효한 피드가 없습니다. feeds.json 파일을 확인하세요.');
            process.exit(1);
        }

        // 피드 목록 출력
        Logger.info(`설정된 RSS 피드:`);
        config.feeds.forEach((feed, index) => {
            Logger.info(`  ${index + 1}. ${feed.name} - ${feed.url}`);
        });

        // 봇 시작
        const bot = new RSSBot(config);
        await bot.start(BOT_TOKEN);

        Logger.success('봇이 성공적으로 시작되었습니다!');

    } catch (error) {
        Logger.error('봇 시작 실패:', error);
        process.exit(1);
    }
}

// 예외 처리
process.on('unhandledRejection', (reason, promise) => {
    Logger.error('처리되지 않은 Promise 거부:', reason);
});

process.on('uncaughtException', (error) => {
    Logger.error('처리되지 않은 예외:', error);
    process.exit(1);
});

// 애플리케이션 시작
main().catch((error) => {
    Logger.error('애플리케이션 시작 실패:', error);
    process.exit(1);
});