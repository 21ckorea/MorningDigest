# GCP VM + crontab 으로 MorningDigest 크론 실행하기

이 문서는 GitHub Actions 대신 **GCP Compute Engine VM + crontab** 을 사용해서
`/api/cron/trigger` 엔드포인트를 주기적으로 호출하는 방법을 정리한 가이드입니다.

## 1. 전체 구조

- **MorningDigest 웹앱 (Vercel 등)**
  - `/api/cron/trigger` 엔드포인트를 가지고 있고,
  - `CRON_SECRET` 환경 변수를 이용해서 요청을 인증함
- **GCP Compute Engine VM**
  - Linux (예: Ubuntu 22.04) 인스턴스 하나를 띄움
  - 이 VM 에서 `crontab` 을 이용해 5분마다 `curl` 로 `/api/cron/trigger` 를 호출함
- **보안**
  - `CRON_SECRET` 은 VM 내부의 별도 파일(`/root/.cron-env`)에 저장하고,
  - 호출 시 `x-cron-secret` 헤더로 전송

> 웹앱의 인증 로직은 이미 `CRON_SECRET` + `x-cron-secret` 를 사용하는 구조로 구현되어 있으므로,
> GitHub Actions 에서 사용하던 값과 동일한 시크릿을 GCP VM 에 그대로 사용하면 된다.

---

## 2. GCP VM 인스턴스 생성

1. GCP 콘솔 → **Compute Engine → VM instances → Create instance**
2. 주요 설정 예시
   - Machine type: `e2-micro` 또는 `e2-small` (테스트/소규모용)
   - OS: `Ubuntu 22.04 LTS` (또는 Debian 계열)
   - Region/Zone: 서울 리전 `asia-northeast3` 권장 (레이턴시 감소)
3. 방화벽 설정
   - 이 VM 은 **외부로 HTTP 요청만 보내면 되므로**, 기본 SSH 외에 별도 인바운드 포트는 열 필요 없음.

인스턴스 생성 후 SSH 접속:

```bash
# gcloud CLI 사용 시
gcloud compute ssh <INSTANCE_NAME> --zone=<ZONE>

# 또는 GCP 콘솔의 "SSH" 버튼 클릭
```

---

## 3. 기본 도구 확인 (curl)

대부분의 Ubuntu / Debian 이미지에는 `curl` 이 기본 설치되어 있다.

```bash
curl --version
```

없다면 설치:

```bash
sudo apt update
sudo apt install -y curl
```

---

## 4. 타임존 설정 (선택: 한국 시간 기준)

cron 의 시간대를 한국 기준으로 맞추고 싶다면:

```bash
sudo timedatectl set-timezone Asia/Seoul

# 확인
timedatectl
```

이렇게 설정하면 **crontab 에서 설정하는 시각은 모두 KST(Asia/Seoul) 기준**이 된다.

---

## 5. 환경 변수 파일(`/root/.cron-env`) 만들기

웹앱 배포 환경(Vercel 등)에 설정되어 있는 `CRON_SECRET` 과 동일한 값을 사용해야 한다.

1. root 전용 환경 파일 생성/편집

```bash
sudo nano /root/.cron-env
```

2. 다음과 같이 입력 (실제 값으로 치환):

```bash
export CRON_ENDPOINT="https://YOUR_DOMAIN/api/cron/trigger"
export CRON_SECRET="여기에_웹앱과_동일한_CRON_SECRET_값"
```

- `CRON_ENDPOINT` 는 **프로덕션 도메인**의 `/api/cron/trigger` 를 가리켜야 함.
  - 예: `https://morningdigest.example.com/api/cron/trigger`
- `CRON_SECRET` 는 Vercel/환경 설정/`.env` 에서 사용하는 값과 동일해야 함.

3. 저장 방법 (nano 기준)

- `Ctrl + O` → 파일 이름 `/root/.cron-env` 확인 후 `Enter`
- `Ctrl + X` 로 에디터 종료

4. 권한 설정

```bash
sudo chmod 600 /root/.cron-env
```

5. (선택) 현재 세션에서 값 확인

```bash
# root 쉘로 진입
sudo -i

# 환경 변수 로드
source /root/.cron-env

echo "$CRON_ENDPOINT"
echo "$CRON_SECRET"   # 값이 잘 보이는지 확인
```

> 주의: 일반 사용자 쉘에서는 `/root/.cron-env` 를 자동으로 읽지 않기 때문에
> `echo $CRON_SECRET` 가 비어 보일 수 있다. root 로 진입 후 `source /root/.cron-env` 를 해야 보인다.

---

## 6. cron 실행 스크립트 작성 (`/opt/morningdigest/run-cron.sh`)

cron 에서 직접 긴 `curl` 명령을 쓰기보다는, 작은 스크립트를 만들어두고 이를 호출하는 방식이 관리에 좋다.

1. 디렉터리 및 스크립트 파일 생성

```bash
sudo mkdir -p /opt/morningdigest
sudo nano /opt/morningdigest/run-cron.sh
```

2. 스크립트 내용 예시

```bash
#!/usr/bin/env bash
set -euo pipefail

# 환경 변수 로드
source /root/.cron-env

LOG_DIR="/var/log/morningdigest"
mkdir -p "$LOG_DIR"

timestamp="$(date -Iseconds)"
logfile="$LOG_DIR/cron-$(date +%Y-%m-%d).log"

{
  echo "[$timestamp] Calling MorningDigest cron trigger..."
  http_code=$(curl -s -o /tmp/md_response.json -w "%{http_code}" \
    -X POST "$CRON_ENDPOINT" \
    -H "x-cron-secret: $CRON_SECRET")

  echo "HTTP Status: $http_code"
  cat /tmp/md_response.json
  echo
} >> "$logfile" 2>&1
```

3. 실행 권한 부여

```bash
sudo chmod +x /opt/morningdigest/run-cron.sh
```

---

## 7. 스크립트 수동 테스트

cron 에 맡기기 전에, 스크립트를 직접 실행해서 동작을 확인한다.

```bash
sudo /opt/morningdigest/run-cron.sh
sudo tail -n 50 /var/log/morningdigest/cron-$(date +%Y-%m-%d).log
```

정상적인 예시 로그:

```text
[2025-12-13T11:55:48+09:00] Calling MorningDigest cron trigger...
HTTP Status: 200
{"ok":true,"stats":{"groupsProcessed":3,"successes":0,"failures":3},"dispatch":[]}
```

- `HTTP Status: 200` → 인증과 엔드포인트 호출 모두 성공
- `ok: true` → 서버 로직이 정상 수행됨을 의미
- `groupsProcessed`, `successes`, `failures` 값은
  - 실제 발송 대상 그룹 수, 성공/실패 개수를 의미
  - 예를 들어 기사 없음으로 인해 digest 생성이 실패하면 `failures` 가 증가할 수 있음

만약 `HTTP Status: 401` 이라면 `CRON_SECRET` 값 불일치이므로,
`/root/.cron-env` 의 값을 다시 확인해야 한다.

---

## 8. crontab 등록

### 8.1 root crontab 열기

`/root/.cron-env` 와 스크립트가 모두 root 기준이므로, root 의 crontab 을 설정한다.

```bash
sudo crontab -e
```

처음 실행 시 편집기 선택 화면이 나오면 nano 등을 선택한다.

### 8.2 5분 주기로 실행하는 예시

파일 맨 아래에 다음 라인을 추가:

```cron
*/5 * * * * /opt/morningdigest/run-cron.sh
```

- 의미: 매 분(`*`) 중에서 5분마다(`*/5`) 스크립트 실행
- 타임존은 앞서 `timedatectl` 로 설정한 시스템 타임존(예: Asia/Seoul)을 따름

### 8.3 특정 시간대에만 실행하는 예시

예: 매일 오전 06:40 ~ 08:00 사이에만 5분 간격으로 실행하고 싶을 때:

```cron
40-59/5 6 * * * /opt/morningdigest/run-cron.sh
0-59/5  7 * * * /opt/morningdigest/run-cron.sh
0       8 * * * /opt/morningdigest/run-cron.sh
```

crontab 저장 후 현재 설정 확인:

```bash
sudo crontab -l
```

---

## 9. 동작 확인 및 모니터링

1. 일정 시간이 지난 후 로그 확인

```bash
sudo tail -n 50 /var/log/morningdigest/cron-$(date +%Y-%m-%d).log
```

- 5분마다(or 설정한 주기마다) `Calling MorningDigest cron trigger...` 와
  `HTTP Status: 200` 로그가 반복해서 찍히는지 확인.

2. 웹앱 쪽 로그 (예: Vercel 로그) 에서도 `/api/cron/trigger` 요청이
   동일한 시각에 들어오는지 확인.

3. 실제 메일 수신 시간과 비교해서,
   - 그룹의 `sendTime` 이후에 같은 날짜 안에서 한 번만 발송되는지,
   - 중복 발송은 없는지 체크한다.

---

## 10. GitHub Actions 스케줄 비활성화 (현재: 비활성화됨)

GCP cron 이 안정적으로 동작하기 시작했기 때문에,
**이 레포에서는 GitHub Actions 스케줄을 비활성화하고, GCP VM + crontab 을 "공식 스케줄러"로 사용한다.**

아래 설정은 이미 적용되어 있거나, 새 환경에서 동일하게 유지해야 한다.

`.github/workflows/cron-digest.yml` 에서:

```yaml
on:
  schedule:
    - cron: "*/5 * * * *"      # ← 이 부분 삭제 또는 주석 처리
  workflow_dispatch:
```

처럼 `schedule` 블록을 제거하고 `workflow_dispatch` 만 남겨두면,
필요할 때만 GitHub Actions 를 수동으로 실행할 수 있다.

> **중요:**
> - 정기 발송 스케줄은 **반드시 GCP VM 의 crontab 에서만 관리**한다.
> - GitHub Actions 의 `schedule` 을 다시 활성화하면,
>   `/api/cron/trigger` 가 GCP와 GitHub 양쪽에서 동시에 호출될 수 있다.
>   (백엔드에서 중복 발송을 방지하고 있기는 하지만, 운영 상 혼동을 피하기 위해
>   GitHub Actions 쪽 스케줄은 비활성 상태로 유지할 것.)

> 웹앱 쪽에서는 `digestIssueExists(groupId, today)` 로
> 하루에 한 번만 발송되도록 idempotent 하게 막고 있으므로,
> 설령 GitHub 스케줄과 GCP 스케줄이 동시에 살아있더라도
> 실제 중복 발송은 발생하지 않는다. 다만 불필요한 호출을 줄이기 위해
> 최종적으로는 한 쪽만 남겨두는 것이 좋다.

---

## 11. 트러블슈팅

### 11.1 HTTP Status: 401 (Unauthorized)

- 원인: `CRON_SECRET` 가 서버와 VM 에서 서로 다르거나,
  `x-cron-secret` 헤더가 누락된 경우
- 해결 순서:
  1. 웹앱 배포 환경(Vercel 등)에서 `CRON_SECRET` 값을 확인
  2. `/root/.cron-env` 의 `CRON_SECRET` 를 동일하게 수정
  3. `sudo -i` 후 `source /root/.cron-env` 로 로드하고
     `echo "$CRON_SECRET"` 로 값 확인
  4. `/opt/morningdigest/run-cron.sh` 를 수동 실행하여 HTTP Status 가 200 으로 바뀌는지 확인

### 11.2 로그 파일이 생성되지 않음

- `/opt/morningdigest/run-cron.sh` 에 실행 권한이 없거나,
  스크립트 경로가 잘못된 경우
- 확인:
  - `sudo ls -l /opt/morningdigest/run-cron.sh`
  - `sudo /opt/morningdigest/run-cron.sh` 수동 실행 시 에러가 나는지 확인

### 11.3 crontab 이 실행되지 않는 것처럼 보임

- `sudo crontab -l` 로 root crontab 에 등록되어 있는지 확인 (일반 사용자 crontab 과 혼동 주의)
- 시스템 타임존이 의도한 것과 다른 경우, 시간대가 어긋난 것처럼 보일 수 있음 → `timedatectl` 로 재확인

---

이 문서의 과정을 따르면, GitHub Actions 에 의존하지 않고
**GCP VM + crontab** 만으로 MorningDigest 의 일일/주기적 발송 스케줄을
안정적으로 운영할 수 있다.
