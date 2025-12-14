module.exports = {
  apps: [{
    name: 'discord-rss-bot-for-raspberrypi',
    script: './dist/index.js',
    
    // 라즈베리파이 최적화 설정
    instances: 1, // 단일 인스턴스 (메모리 절약)
    exec_mode: 'fork', // 클러스터 모드 비활성화
    
    // 메모리 관리
    max_memory_restart: '200M', // 200MB 초과 시 재시작
    node_args: '--max-old-space-size=256', // V8 힙 메모리 제한
    
    // 재시작 설정
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // 환경변수
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    env_development: {
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug'
    },
    
    // 로그 관리
    log_file: './logs/pm2-combined.log',
    out_file: './logs/pm2-out.log',
    error_file: './logs/pm2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // 크론잡 (야간 자동 재시작 - 선택사항)
    cron_restart: '0 3 * * *', // 매일 오전 3시 재시작
    
    // 종료 시그널 처리
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // 모니터링
    pmx: true,
    monitoring: false, // PM2 Plus 비활성화 (메모리 절약)
    
    // 추가 옵션
    ignore_watch: ['node_modules', 'logs', '*.log', 'feed_cache.json', 'bot_status.json'],
    
    // 시스템 리소스 제한 (Linux 전용)
    // max_old_space_size가 적용되지 않을 경우 사용
    ...(process.platform === 'linux' && {
      vizion: false, // Git 모니터링 비활성화
      automation: false
    })
  }]
};