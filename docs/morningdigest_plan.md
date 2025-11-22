# MorningDigest 서비스 기획서

## 1. 서비스 개요
- **목표**: 사용자가 등록한 키워드를 기반으로, 매일 아침 주요 기사를 요약하여 이메일로 제공하는 개인화 뉴스 다이제스트 서비스 구축.
- **핵심 가치 제안**
  1. 필터링된 정보: 사용자가 원하는 키워드에 맞춘 고품질/요약형 콘텐츠
  2. 빠른 습관화: 지정된 시간에 꾸준히 도착하는 모닝 뉴스
  3. 투명한 아카이브: 웹에서 과거 발송본까지 열람 가능
- **타깃 사용자**: 시사/산업 동향 파악이 중요한 직장인, 투자자, PR 담당자, 인사이트 수집이 필요한 기획자 등

## 2. 사용자 여정 & 플로우 요약
1. **온보딩/로그인**
   - 이메일/소셜 로그인을 통한 계정 생성
   - 기본 프로필(이름, 직무, 산업) 입력 → 추천 키워드 제안 가능
2. **키워드 관리**
   - 다중 키워드 등록/편집/삭제 (최소 1개 이상 필수)
   - 키워드 그룹으로 논리적 묶음 생성 (예: "AI 산업", "소비재")
   - 그룹별 발송 메일 설정(수신 여부, 수신 요일, 요약 길이 등)
3. **콘텐츠 수집·요약**
   - 새벽 크롤러/뉴스 API → ETL → 요약 모델/룰 기반 요약 → 템플릿 렌더링
4. **메일 발송 & 웹 열람**
   - 그룹별 설정대로 오전 지정 시각 발송
   - 발송된 메일의 동일 콘텐츠를 웹 대시보드에서 사용자별/그룹별 히스토리로 조회 가능

## 3. 핵심 기능 명세
| 구분 | 기능 | 세부 설명 |
| --- | --- | --- |
| 인증 | **로그인** | 이메일+비밀번호(OTP) 또는 소셜 로그인. 세션/토큰 기반 인증, MFA 옵션. |
| 키워드 | **키워드 등록/관리** | 복수 키워드 등록, 중복 방지, 연관 추천, 우선순위 설정, 그룹화. |
| 발송 설정 | **키워드 그룹별 발송 메일 설정** | 그룹 단위로 발송 시간, 빈도, 요약 길이, 언어, 메일 템플릿 선택. |
| 아카이브 | **웹 조회(사용자·그룹별)** | 날짜/키워드/그룹 필터, 전체 텍스트/요약/원문 링크 제공, 검색 기능. |
| 관리 | 관리자 대시보드 | 콘텐츠 수집 현황, 발송 성공률, 오류 모니터링. |
| 알림 | 상태 알림 | 크롤링 실패/발송 실패 시 Slack/메일 알림. |

## 4. 서비스 아키텍처 개요 (Vercel + 무료 티어 우선)
1. **Presentation Layer**
   - Next.js(App Router) 기반 Web/Mobile Web → 전부 Vercel에 Serverless/Edge로 배포
   - Admin Portal 역시 동일 리포 내 Protected Route로 운영
2. **Backend/API Layer (Vercel Functions)**
   - Route Handler & Server Actions로 Auth, Keyword, Digest API 구현
   - Edge Functions: 경량 인증/세션 확인
   - Serverless Functions: 키워드 CRUD, 발송 설정 저장, 아카이브 조회
3. **Background Processing**
   - Vercel Cron으로 새벽 수집/요약 트리거 → Serverless Function 실행
   - Vercel Queues + Upstash Q(무료 티어)로 기사 수집 → 요약 → 메일 큐 순차 처리
   - 요약 모델: Hugging Face Inference API 무료 엔드포인트 또는 오픈소스 모델을 Serverless에서 경량 실행
4. **Storage & State**
   - Supabase(무료 Postgres + Auth) 또는 Neon 무료 플랜 : 사용자·키워드·발송 로그 영구 저장
   - Vercel KV(Upstash Redis 무료 티어) : 세션 토큰, 최근 요약 캐시
   - Vercel Blob(무료 1GB) 또는 Supabase Storage : 이메일 HTML 스냅샷, 첨부 자산
5. **Email Delivery**
   - Resend 무료 플랜(월 3k 이메일) 또는 Brevo 무료(일 300건)와 연동, Webhook를 Serverless Function으로 수신
6. **Observability**
   - Vercel Monitoring 기본 제공 + 무료 Log Drain(Axiom Free, Better Stack Free) → OpenTelemetry 기반 추적

## 5. 데이터 흐름 & 발송 프로세스 (Vercel + 무료 티어)
1. **콘텐츠 수집**: Vercel Cron → Serverless Function → 무료 뉴스 API/오픈 RSS 수집 → 원문/메타를 Blob+DB에 저장 → 중복/품질 필터링
2. **요약/템플릿 구성**: Queue Worker Function이 오픈소스 요약 모델(Hugging Face free inference)로 요약/키포인트 생성 → 템플릿 파셜을 Blob에 저장
3. **발송 스케줄링**: 사용자 타임존/그룹 설정을 기반으로 Upstash Queue에 작업 push → 지정 시각에 Worker Function 실행
4. **메일 생성 & 전송**: Serverless Function에서 템플릿 렌더링 후 Resend/Brevo 무료 API 호출 → DeliveryLog 테이블에 결과 기록
5. **웹 조회 동기화**: 발송 시점에 DigestIssue/DigestArticle을 Supabase/Neon DB에 확정 저장 → Next.js 서버 컴포넌트가 사용자/그룹/날짜 필터 조회 제공

## 6. 데이터 모델 초안
| 엔터티 | 주요 필드 |
| --- | --- |
| User | id, email, password_hash, name, role, time_zone, last_login |
| Keyword | id, user_id, keyword_text, priority, status |
| KeywordGroup | id, user_id, name, description |
| GroupKeywordMap | group_id, keyword_id |
| DeliverySetting | group_id, send_time, weekdays, language, summary_length, template_id |
| DigestIssue | id, user_id, group_id, send_date, status, email_subject, preview_text |
| DigestArticle | issue_id, headline, summary, source_url, relevance_score |
| DeliveryLog | issue_id, provider_message_id, delivered_at, opened_at, error_reason |

## 7. 비즈니스 규칙 & 정책
1. 최소 1개 키워드 없으면 발송 스케줄 비활성화
2. 그룹당 최대 N개의 키워드(예: 20개)로 제한 → 속도 보장
3. 발송 시간은 사용자 타임존 기준 오전 4~9시 중 선택, 미선택 시 기본 7시
4. 과거 발송본 보존 기간 기본 12개월 (정책에 따라 확장 가능)
5. GDPR/개인정보보호 준수: 탈퇴 시 사용자 데이터 즉시 삭제, 아카이브는 익명화

## 8. 운영/관리 고려사항
- **콘텐츠 품질 관리**: 금칙어 필터, 중복 기사 스코어링, 사용자 피드백 수집
- **모니터링**: 발송 성공률, 오픈율, 클릭률, 에러 알림
- **에러 대응**: 재발송 큐, 부분 실패 시 그룹별 재시도 정책
- **백오피스 기능**: 문의 관리, 강제 키워드 삭제, 수동 발송 트리거

## 9. 로드맵 & 마일스톤
1. **MVP (4주)**
   - 이메일 로그인, 기본 키워드 등록, 고정 템플릿의 일일 뉴스 발송, 아카이브 리스트 뷰
2. **Phase 2 (6주)**
   - 키워드 그룹별 발송 설정, 검색/필터링 가능한 아카이브, 기본 관리자 모듈
3. **Phase 3 (8주)**
   - 사용자 행동 기반 추천 키워드, 개인화 요약 튜닝, 모바일 푸시 연동
4. **Phase 4 (지속)**
   - 협업 기능(공유 그룹), 팀 계정, 광고/제휴 콘텐츠 삽입, BI 대시보드
