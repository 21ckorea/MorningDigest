# 이메일 발송 설정 가이드

### 1. 환경 변수
- `RESEND_API_KEY`: 단일 키 사용 시.
- `RESEND_API_KEYS`: 여러 키를 사용할 때 쉼표로 구분해 입력.
- `RESEND_FROM`: 발송자 주소(`"MorningDigest <digest@example.com>"` 기본값).

```
RESEND_API_KEYS=key1,key2,key3
RESEND_FROM="MorningDigest <no-reply@yourdomain.com>"
```

### 2. 키 로테이션
- 여러 키가 세팅되면 round-robin 방식으로 순차 발송.
- 실패 시 다음 키로 자동 전환, 전부 실패하면 콘솔 오류.
- 키가 없으면 콘솔 로그 모드로 전환되어 개발 중에도 확인 가능.

### 3. 모니터링
- 발송 결과는 추후 `delivery_logs` 테이블에 기록 예정이며, Resend 대시보드에서도 상태를 확인할 수 있습니다.
