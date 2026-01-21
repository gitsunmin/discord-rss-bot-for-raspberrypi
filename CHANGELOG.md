# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-01-21

### Added

- **등록 시점 기반 피드 필터링**: 새로운 피드를 추가할 때 등록 시간(`registeredAt`) 이후의 글만 전송되도록 개선
- `FeedConfig` 인터페이스에 `registeredAt` 필드 추가 (ISO 8601 형식)
- `feeds.json`에 피드별 등록 시간 자동 설정 기능
- 피드 등록 날짜 기반 자동 필터링 로직으로 메시지 폭주 완전 방지

### Changed

- 기존 피드에 `registeredAt`이 없을 경우 봇 시작 시점으로 자동 설정
- RSS 피드 확인 로직 개선: `pubDate`와 `registeredAt` 비교를 통한 필터링
- 로그 메시지 개선: 등록 날짜 정보 포함

### Fixed

- 새 피드 추가 시 과거 글이 대량으로 전송되는 문제 해결
- 초기 실행 시에도 등록 시점 기준으로 필터링되도록 개선

### Documentation

- README에 `registeredAt` 필드 사용법 추가
- 등록 시점 기반 전송 기능 설명 추가
- 피드 추가 예시 및 날짜 설정 가이드 추가

## [0.2.0] - Previous Release

### Added

- 라즈베리파이 최적화 기능
- 메모리 효율성 개선
- PM2를 통한 프로세스 관리
- 헬스 체크 시스템
- 자동 재시도 및 에러 처리
- 캐시 기반 중복 방지 시스템
- Rich Embed 지원
- 상세한 로깅 시스템

### Features

- Discord.js v14 지원
- TypeScript 기반 개발
- RSS 피드 다중 모니터링
- 네트워크 오류 자동 복구
- 설정 파일 기반 관리 (feeds.json)
