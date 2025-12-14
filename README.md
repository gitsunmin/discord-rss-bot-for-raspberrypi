# Discord RSS Bot For Raspberry Pi

> 🤖 라즈베리파이 최적화된 안정적인 RSS → Discord 자동 전송 봇

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14.x-7289da.svg)](https://discord.js.org/)
[![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-Optimized-red.svg)](https://www.raspberrypi.org/)

## ✨ 주요 특징

### 🎯 **안정성 & 신뢰성**
- 🛡️ **강력한 에러 처리**: 네트워크 오류 시 자동 재시도 (지수 백오프)
- 🔄 **우아한 복구**: 서버 재시작 시 안전한 상태 복원
- 💾 **지속적 캐시**: 타임스탬프 기반 중복 방지 시스템
- 🏥 **헬스체크**: 5분마다 시스템 상태 모니터링

### 🎮 **라즈베리파이 최적화**
- ⚡ **메모리 효율**: 200MB 이하 메모리 사용량 유지
- 🔋 **전력 절약**: CPU 사용량 최소화 설계
- 🌡️ **온도 안정**: 과부하 방지 및 자동 조절
- 📱 **경량화**: 필수 기능만 탑재하여 성능 최적화

### 🎨 **사용자 경험**
- 💌 **초기 실행 보호**: 첫 실행 시 메시지 폭탄 방지 (피드당 3개 제한)
- 🎭 **Rich Embeds**: 아름다운 Discord 임베드 메시지
- 📝 **상세 로깅**: 파일 기반 로그 시스템 (자동 정리)
- ⚙️ **유연한 설정**: JSON 설정으로 코드 수정 없이 관리

## 📋 시스템 요구사항

### 💻 **일반 환경**
- Node.js 18.0 이상
- npm 또는 yarn
- 2GB+ RAM (권장)
- 안정적인 인터넷 연결

### 🥧 **라즈베리파이 환경**
- Raspberry Pi 3B+ 이상 (4B 권장)
- Raspberry Pi OS (64-bit 권장)
- 512MB+ 가용 RAM
- Class 10 이상 microSD 카드 (32GB+)
- 안정적인 전원 공급 (5V 3A 어댑터)

## 🛠️ 설치 및 설정

### 1. Discord 봇 생성

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. **"New Application"** 클릭 후 봇 이름 입력
3. 좌측 메뉴 **"Bot"** → **"Add Bot"** 클릭
4. **"Reset Token"** 클릭하여 토큰 복사 (안전하게 보관!)
5. **Bot Permissions** 설정:
   - ✅ Send Messages
   - ✅ Send Messages in Threads  
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ View Channels
   - ✅ Use Slash Commands

### 2. 봇 서버 초대

1. **OAuth2** → **URL Generator** 이동
2. **SCOPES**: `bot` 선택
3. **PERMISSIONS**: 위에서 언급한 권한들 선택
4. 생성된 URL로 봇을 원하는 서버에 초대

### 3. 채널 ID 가져오기

1. Discord 설정 → **고급** → **"개발자 모드"** 활성화
2. 원하는 채널 우클릭 → **"ID 복사"**

### 4. 프로젝트 설치

#### 🖥️ **일반 환경**
```bash
# 저장소 클론
git clone https://github.com/gitsunmin/discord-rss-bot-for-raspberrypi.git
cd discord-rss-bot-for-raspberrypi

# 의존성 설치
npm install

# TypeScript 빌드
npm run build
```

#### 🥧 **라즈베리파이 설치**
```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 18.x 설치 (라즈베리파이 최적화)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 메모리 스왑 확장 (빌드 시 필요)
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=100/CONF_SWAPSIZE=512/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# 프로젝트 클론 및 설치
git clone https://github.com/gitsunmin/discord-rss-bot-for-raspberrypi.git
cd discord-rss-bot-for-raspberrypi
npm install

# 라즈베리파이 최적화 빌드
npm run build:pi

# PM2 글로벌 설치
sudo npm install -g pm2

# 로그 디렉토리 생성
mkdir -p logs
```



## 5. 환경 설정

### `.env` 파일 생성

```bash
# .env 파일 생성
cp .env.example .env
nano .env
```

`.env` 파일 내용:
```env
# Discord Bot Token (필수)
BOT_TOKEN=your_discord_bot_token_here

# 선택적 환경 변수들
NODE_ENV=production
LOG_LEVEL=info
```

### `tsconfig.json` 설정 (자동 생성됨)

프로젝트에는 라즈베리파이에 최적화된 TypeScript 설정이 포함되어 있습니다:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true,
    "incremental": true
  }
}
```

**주요 최적화 옵션:**
- `incremental: true` - 증분 컴파일로 빌드 속도 향상
- `skipLibCheck: true` - 라이브러리 타입 체크 생략으로 메모리 절약
- `sourceMap: false` - 소스맵 비활성화로 용량 절약

### `feeds.json` 설정

```json
{
  "settings": {
    "checkIntervalMinutes": 60,
    "maxDescriptionLength": 300,
    "cacheSize": 100,
    "useEmbeds": true
  },
  "feeds": [
    {
      "name": "GeekNews",
      "url": "https://feeds.feedburner.com/geeknews-feed",
      "channelId": "1234567890123456789",
      "description": "한국의 IT 뉴스를 제공하는 GeekNews 피드",
      "color": "#00C851",
      "thumbnail": "https://example.com/geek-logo.png"
    },
    {
      "name": "TechCrunch",
      "url": "https://techcrunch.com/feed/",
      "channelId": "1234567890123456789",
      "description": "글로벌 스타트업 및 기술 뉴스",
      "color": "#0AAD00"
    }
  ]
}
```

### 설정 항목 설명

| 항목 | 설명 | 기본값 |
|------|------|--------|
| `checkIntervalMinutes` | RSS 피드 확인 주기 (분) | 60 |
| `maxDescriptionLength` | 최대 설명 글자 수 | 300 |
| `cacheSize` | 피드별 캐시 크기 | 100 |
| `useEmbeds` | 임베드 메시지 사용 여부 | true |
| `color` | 임베드 색상 (hex) | #0099FF |
| `thumbnail` | 피드 썸네일 URL | - |

## 6. 실행 방법

### 🧪 **개발 환경**
```bash
# 안전한 개발 모드 (메시지 제한)
npm run dev:safe

# 전체 디버그 모드
npm run dev

# 상태 확인
npm run health
```

### 🚀 **프로덕션 환경**

#### 일반 서버
```bash
# 프로젝트 빌드 (메모리 최적화)
npm run build

# 빠른 개발용 빌드
npm run build:fast

# 프로덕션 실행
npm start
```

#### 🥧 라즈베리파이 (권장)
```bash
# 라즈베리파이 최적화 빌드
npm run build:pi

# 라즈베리파이 최적화 실행
npm run start:pi

# PM2로 백그라운드 실행 (안정성 최고)
npm run pm2:start

# 실시간 모니터링
npm run pm2:monit

# 로그 확인 (최근 100줄)
npm run pm2:logs

# 전체 청소 (문제 해결 시)
npm run clean
```

### 🔄 **자동 시작 설정** (라즈베리파이)
```bash
# PM2 부팅 시 자동 시작
pm2 startup
# 출력된 명령어를 복사해서 실행

# 현재 프로세스 저장
pm2 save

# 서비스 상태 확인
sudo systemctl status pm2-pi

# 수동 테스트 (재부팅)
sudo reboot
# 재부팅 후 자동으로 봇이 시작되는지 확인
pm2 list
```

## 7. 모니터링 및 관리

### 로그 확인
```bash
# PM2 로그 실시간 확인
pm2 logs discord-rss-bot-for-raspberrypi

# 로그 파일 직접 확인 (날짜별)
tail -f logs/$(date +%Y-%m-%d).log

# 모든 로그 파일 확인
ls -la logs/
```

### 봇 상태 모니터링
```bash
# PM2 모니터링
pm2 monit

# 프로세스 목록
pm2 list

# 자세한 정보
pm2 show discord-rss-bot-for-raspberrypi
```

### 성능 최적화
- **메모리 제한 설정**: `ecosystem.config.js`에서 `max_memory_restart` 조정
- **CPU 사용률 제한**: `instances` 값을 CPU 코어 수에 맞게 조정
- **로그 로테이션**: PM2 로그 로테이션 모듈 사용

## 8. 문제 해결

### 🚨 **일반적인 문제들**

#### 🔴 봇이 시작되지 않음
```bash
# 토큰 확인
echo $BOT_TOKEN

# 권한 및 파일 확인
ls -la .env feeds.json

# 상세 로그 확인
npm run pm2:logs
tail -f logs/*.log
```

#### 🟡 개발서버에서 메시지 폭탄
- ✅ **해결됨**: 초기 실행 시 피드당 최대 3개 메시지로 제한
- 🔧 **추가 제어**: `feeds.json`에서 `cacheSize` 조정
- 📝 **로그 확인**: "초기 실행" 메시지로 상태 파악

#### 🟡 네트워크 연결 불안정
```bash
# 네트워크 상태 테스트
ping -c 4 google.com

# DNS 설정 확인
cat /etc/resolv.conf

# 라즈베리파이 WiFi 안정성 개선
sudo nano /etc/dhcpcd.conf
# 다음 줄 추가:
# interface wlan0
# static ip_address=192.168.1.100/24
# static routers=192.168.1.1
# static domain_name_servers=8.8.8.8 8.8.4.4
```

### 🥧 **라즈베리파이 특화 문제**

#### 🔥 과열 및 성능 저하
```bash
# CPU 온도 확인
vcgencmd measure_temp

# 현재 클럭 속도 확인
vcgencmd measure_clock arm

# 쓰로틀링 상태 확인
vcgencmd get_throttled

# 쿨링 개선 방법:
# 1. 방열판 설치
# 2. 팬 추가
# 3. 케이스 통풍 개선
```

#### 💾 메모리 부족 문제
```bash
# 메모리 사용량 실시간 모니터링
free -h
htop

# 스왑 파일 크기 확인
sudo swapon -s

# 메모리 정리 스크립트 생성
echo '#!/bin/bash
sync
echo 1 > /proc/sys/vm/drop_caches
echo 2 > /proc/sys/vm/drop_caches
echo 3 > /proc/sys/vm/drop_caches' | sudo tee /usr/local/bin/clear-cache
sudo chmod +x /usr/local/bin/clear-cache

# 크론잡으로 자동 정리 (매일 새벽 2시)
echo "0 2 * * * /usr/local/bin/clear-cache" | crontab -
```

#### ⚡ 전원 공급 불안정
```bash
# 전압 모니터링
vcgencmd measure_volts

# 전원 관련 경고 확인
dmesg | grep -i voltage

# 안정적인 전원 공급을 위한 권장사항:
# 1. 5V 3A 공식 어댑터 사용
# 2. 양질의 USB-C 케이블 사용
# 3. 전력 소비가 큰 USB 기기 제거
```

#### 🗂️ SD 카드 수명 관리
```bash
# 로그를 RAM 디스크로 이동 (선택사항)
sudo nano /etc/fstab
# 다음 줄 추가:
# tmpfs /var/log tmpfs defaults,noatime,nosuid,mode=0755,size=100m 0 0

# 로그 로테이션 설정
sudo nano /etc/logrotate.d/discord-bot
# 내용:
# /home/pi/discord-rss-bot-for-raspberrypi/logs/*.log {
#     daily
#     missingok
#     rotate 7
#     compress
#     notifempty
#     create 0644 pi pi
# }
```

### 디버깅 모드
```bash
# 자세한 로그 출력
DEBUG=* npm run dev

# 특정 모듈만 디버깅
DEBUG=rss-parser npm run dev
```

## 9. 고급 기능

### 사용자 정의 필터
특정 키워드가 포함된 글만 전송하려면:

```typescript
// feeds.json에 필터 추가
{
  "name": "Tech News",
  "url": "https://example.com/feed",
  "channelId": "123456789",
  "keywords": ["AI", "머신러닝", "블록체인"],
  "excludeKeywords": ["광고", "스팸"]
}
```

### 다중 채널 지원
하나의 피드를 여러 채널에 전송:

```json
{
  "name": "중요 뉴스",
  "url": "https://example.com/feed",
  "channels": [
    {
      "channelId": "123456789",
      "keywords": ["긴급", "속보"]
    },
    {
      "channelId": "987654321", 
      "keywords": ["정치", "경제"]
    }
  ]
}
```

### 웹훅 통합
Discord Webhook 사용 시 더 풍부한 포맷팅 가능:

```typescript
// Webhook URL을 feeds.json에 추가
{
  "name": "Premium Feed",
  "url": "https://example.com/feed",
  "webhook": "https://discord.com/api/webhooks/...",
  "avatar": "https://example.com/bot-avatar.png"
}
```

## 10. API 및 확장성

### REST API (선택사항)
봇 상태를 웹에서 모니터링하려면:

```bash
# Express 서버 추가 설치
npm install express cors helmet

# API 서버 실행
npm run api:start
```

### 플러그인 시스템
사용자 정의 플러그인 개발 가이드:

```typescript
// plugins/custom-filter.ts
export interface FeedPlugin {
  name: string;
  process(item: RSSItem, config: FeedConfig): Promise<RSSItem | null>;
}
```

## 11. 보안 및 모범 사례

### 🔒 보안 체크리스트
- [ ] `.env` 파일을 `.gitignore`에 추가
- [ ] 봇 토큰을 절대 공개 저장소에 커밋하지 않음  
- [ ] 최소 권한 원칙 적용 (필요한 권한만 부여)
- [ ] 정기적인 의존성 업데이트
- [ ] 로그에서 민감한 정보 제거

### 🚀 **성능 최적화**

#### 🎯 **일반 최적화**
- RSS 피드 확인 주기 적절히 조정 (60분 권장)
- 대용량 피드의 경우 `maxDescriptionLength` 축소
- 불필요한 로그 레벨 비활성화 (`LOG_LEVEL=warning`)
- 캐시 크기 조정 (`cacheSize`: 50개 이하 권장)

#### 🥧 **라즈베리파이 전용 최적화**
```bash
# 1. GPU 메모리 분할 최적화 (헤드리스 환경)
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# 2. CPU 거버너 성능 모드 설정
echo 'performance' | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# 3. 네트워크 버퍼 최적화
echo 'net.core.rmem_max = 16777216' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' | sudo tee -a /etc/sysctl.conf

# 4. 파일 디스크립터 한계 증가
echo 'pi hard nofile 65536' | sudo tee -a /etc/security/limits.conf
echo 'pi soft nofile 65536' | sudo tee -a /etc/security/limits.conf

# 5. 시스템 설정 적용
sudo sysctl -p
```

#### 📊 **성능 모니터링 스크립트**
```bash
# 성능 모니터링 스크립트 생성
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "=== Discord RSS Bot 시스템 상태 ==="
echo "시간: $(date)"
echo "CPU 온도: $(vcgencmd measure_temp)"
echo "메모리 사용량: $(free -h | grep Mem)"
echo "디스크 사용량: $(df -h / | tail -1)"
echo "봇 프로세스:"
pm2 list | grep discord-rss-bot-for-raspberrypi
echo "최근 로그:"
tail -5 logs/$(date +%Y-%m-%d).log
echo "================================"
EOF

chmod +x monitor.sh

# 크론잡으로 1시간마다 모니터링
echo "0 * * * * /home/pi/discord-rss-bot-for-raspberrypi/monitor.sh >> /home/pi/bot-monitor.log" | crontab -
```

### 🔄 백업 및 복구
```bash
# 설정 백업
cp feeds.json feeds.json.backup
cp .env .env.backup

# 캐시 백업 (선택사항)
cp feed_cache.json feed_cache.json.backup
```

## 12. 라이선스 및 기여

### 📄 라이선스
이 프로젝트는 MIT 라이선스 하에 배포됩니다.

### 🤝 기여 가이드라인
1. Fork 저장소
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)  
5. Pull Request 생성

### 📞 지원 및 문의
- GitHub Issues: 버그 리포트 및 기능 요청
- Discussions: 일반적인 질문 및 토론
- Wiki: 상세 문서 및 튜토리얼

---

<div align="center">

**⭐ 이 프로젝트가 도움이 되었다면 스타를 눌러주세요! ⭐**

Made with ❤️ by [gitsunmin](https://github.com/gitsunmin)

</div>

