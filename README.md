# Best value LLM

[Artificial Analysis](https://artificialanalysis.ai/)의 Intelligence Index와 API 혼합 단가(blended price)를 한 차트에 그려, **가성비 경계선(value frontier)** 위의 모델을 강조해 보여주는 단일 정적 페이지입니다. 경계선 위의 모델은 "이보다 싸면서 더 똑똑한 모델이 없는" 모델입니다.

별도 의존성 없이 Node만으로 로컬에서 실행합니다.

[terryds/bestvaluemodel](https://github.com/terryds/bestvaluemodel)을 포크해, GitHub Actions와 Cloudflare 배포를 걷어내고 로컬 실행용으로 바꿨습니다.

## 실행

Node 20.12 이상이 필요합니다. `npm install`은 필요 없습니다.

```sh
cp .env.example .env   # .env에 API 키 입력
npm start              # 필요하면 데이터 갱신 후 http://127.0.0.1:8080 에서 서빙
```

API 키는 https://artificialanalysis.ai/ 에서 무료로 발급받습니다(Insights Platform → API keys). 하루 1,000회까지 호출할 수 있고, 데이터를 쓸 때는 출처 표기가 필요합니다.

키가 없거나 데이터를 받아오지 못하면 `data/`에 이미 있는 스냅샷으로 페이지를 띄웁니다.

| 명령 | 동작 |
|---|---|
| `npm start` | 마지막 확인 후 6시간이 지났고 `AA_API_KEY`가 있으면 최신 데이터를 받은 뒤 서빙 |
| `npm run serve` | 데이터 갱신 없이 서빙만 |
| `npm run fetch` | 데이터 갱신만(6시간 제한 없이 항상 API 호출) |

8080 대신 다른 포트를 쓰려면 `PORT` 환경변수를 지정합니다(예: `PORT=3000 npm start`).

## 데이터

### 갱신 방식

원본 저장소는 GitHub Actions가 매일 데이터를 받아 커밋했지만, 이 저장소는 로컬에서 직접 갱신합니다.

- `npm start`는 서버를 띄우기 전에 최신 데이터를 받아옵니다. 단, **마지막으로 API를 확인한 지 6시간이 안 됐으면 호출을 건너뛰고** 바로 서버를 띄웁니다. 바로 갱신하고 싶으면 `npm run fetch`를 실행합니다.
- 마지막 확인 시각은 git에 올라가지 않는 `.last-fetch` 파일에 기록합니다. 데이터가 그대로여서 `models.json`을 다시 쓰지 않은 경우에도 확인 시각은 남습니다. 이 파일이 없으면 `models.json`의 `fetched_at`을 기준으로 삼고, API 호출에 실패하면 기록하지 않아 다음 실행 때 다시 시도합니다.
- API 호출은 `npm start`(6시간이 지난 경우)와 `npm run fetch`에서 한 번씩만 일어납니다. 요청 한 번에 전체 모델 목록을 받고, 무료 한도는 하루 1,000회입니다.
- 페이지를 열지 않아도 매일 갱신하려면 cron에 `npm run fetch`를 걸어 둡니다(`crontab -e`, 예: 매일 오전 9시).

  ```
  0 9 * * * cd /path/to/bestvaluemodel && /path/to/node scripts/fetch-aa.mjs
  ```

  cron은 셸 환경을 불러오지 않으므로 node는 절대 경로(`which node`로 확인)로 적습니다. API 키는 `.env`에서 읽습니다.

### 기준

- **출처**: Artificial Analysis API `https://artificialanalysis.ai/api/v2/data/llms/models`
- **포함 모델**: Intelligence Index 점수가 있고 혼합 단가가 0보다 큰 모델만 넣습니다. 받아온 모델이 10개 미만이면 API 이상으로 보고 기존 스냅샷을 덮어쓰지 않습니다.
- **점수**: AA Intelligence / Coding / Math Index(소수점 첫째 자리)
- **가격**: 100만 토큰당 USD. 혼합 단가는 입력:출력을 3:1로 섞은 AA 값입니다. 캐시 입력, 배치, 고속 모드 가격은 반영하지 않습니다.
- **속도**: 출력 속도(tok/s)와 첫 토큰까지 걸린 시간(초)의 중앙값. AA 측정 조건은 `models.json`의 `prompt_options`에 기록됩니다(예: 1,000토큰 프롬프트, 동시 요청 1개). 측정되지 않은 값은 비워 둡니다.
- **측정 시점**: `models.json`의 `fetched_at`(UTC)이며, 페이지 상단에도 표시됩니다.

### 저장 위치

DB나 외부 저장소 없이 `data/` 폴더의 JSON 파일 두 개가 전부이고, 페이지는 실행 시 브라우저에서 이 파일을 읽습니다.

- `data/models.json`: 최신 스냅샷. 점수·가격·속도 중 하나라도 바뀌면 덮어쓰고, 모두 같으면 쓰지 않습니다.
- `data/changelog.json`: 갱신 사이의 변경 내역. **모델 추가·삭제와 점수·가격 변경만** 기록하고, 속도만 바뀐 경우에는 기록하지 않습니다. 최신순으로 최대 90건까지 보관합니다.

두 파일은 git으로 추적되므로 갱신할 때마다 변경 사항으로 잡힙니다.

## 구성

| 경로 | 설명 |
|---|---|
| `index.html` | 페이지 본체. 빌드 없는 HTML/SVG/JS이고, 실행 시 `data/models.json`을 불러옵니다. |
| `data/models.json` | AA `/data/llms/models` 응답을 필요한 필드만 남겨 저장한 스냅샷 |
| `data/changelog.json` | 갱신할 때마다 기록되는 변경 내역(추가·삭제·점수 변경·가격 변경). 최신순이며 최대 90건까지 보관합니다. |
| `scripts/fetch-aa.mjs` | API에서 데이터를 받아 정리하고, 이전 스냅샷과 비교해 두 파일을 씁니다. 데이터가 같으면 아무것도 쓰지 않습니다. |
| `scripts/serve.mjs` | 데이터를 갱신한 뒤 페이지와 데이터 파일을 127.0.0.1에서 서빙합니다. 이 세 파일 외의 경로는 모두 404를 반환합니다. |

## 참고

- 경계선은 선택한 지표(Intelligence, Coding, Math)마다 브라우저에서 전체 모델을 대상으로 계산합니다. 그래서 제조사로 필터링해도 그 제조사 모델이 전체 중 어디쯤 있는지 볼 수 있습니다.
- 데이터 출처: Artificial Analysis(https://artificialanalysis.ai/). API 약관상 출처 표기가 필요합니다.
