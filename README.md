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
| `npm run lan` | `npm start`와 같지만 같은 네트워크의 다른 기기에서도 접속 가능 |

8080 대신 다른 포트를 쓰려면 `PORT` 환경변수를 지정합니다(예: `PORT=3000 npm start`).

### 같은 네트워크의 다른 기기에서 보기

기본값으로는 이 컴퓨터(`127.0.0.1`)에서만 접속됩니다. 휴대폰이나 다른 PC에서 보려면 `npm run lan`으로 띄웁니다. 실행하면 `http://192.168.x.x:8080`처럼 접속할 주소가 출력됩니다.

- 같은 와이파이나 사내망에 있는 **누구나** 접속할 수 있으니, 다 보면 서버를 끕니다(Ctrl+C).
- 처음 실행하면 macOS 방화벽이 Node의 연결 허용 여부를 묻습니다.
- 서버는 페이지와 데이터 파일 두 개만 읽기 전용으로 내보내고, `.env` 같은 다른 파일은 404를 반환합니다. 페이지는 API를 호출하지 않으므로 접속자가 늘어도 API 한도에는 영향이 없습니다.
- 인터넷 전체 공개(포트 포워딩, 공개 터널)는 접속 제한이 없어 권하지 않습니다.

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
- **세부 벤치마크**: 정답률(%)로 저장합니다(AA는 0~1 비율로 제공).
  - 현재 측정: GPQA Diamond, Humanity's Last Exam, SciCode, AA-LCR, Terminal-Bench 2.1, τ²-Bench Banking
  - 이전 측정: MMLU-Pro, LiveCodeBench, AIME 2025, IFBench, Terminal-Bench Hard, τ²-Bench Telecom. AA가 최신 모델에서는 측정하지 않아 최근 모델 점수가 없습니다. Math Index도 같은 상태입니다.
  - 페이지는 상위 30개 모델 중 절반 이상이 점수를 가진 지표를 "현재 측정"으로 자동 분류하고, 나머지를 고르면 경고를 표시합니다.
- **가격**: 100만 토큰당 USD. 혼합 단가는 입력:출력을 3:1로 섞은 AA 값입니다. 캐시 입력, 배치, 고속 모드 가격은 반영하지 않습니다.
- **사용 패턴**: 페이지에서 입력:출력 비율을 바꾸면 `(입력 단가×입력 비율 + 출력 단가×출력 비율) ÷ 비율 합`으로 다시 계산합니다. AA 혼합 단가도 같은 공식(3:1)이라, 기본값에서는 AA 값을 그대로 씁니다.
- **월 예상 비용**: 페이지에 월 사용량(입력·출력 토큰, 100만 단위)을 넣으면 `입력 단가×입력량 + 출력 단가×출력량`으로 계산하고, 차트·예산표·표를 월 비용 기준으로 보여줍니다. 비율은 사용량에서 자동으로 정해집니다.
- **속도**: 출력 속도(tok/s)와 첫 토큰까지 걸린 시간(초)의 중앙값. AA 측정 조건은 `models.json`의 `prompt_options`에 기록됩니다(예: 1,000토큰 프롬프트, 동시 요청 1개). 측정되지 않은 값은 비워 둡니다.
- **컨텍스트 크기**: AA API에는 없어서 [OpenRouter 공개 모델 목록](https://openrouter.ai/api/v1/models)(키 불필요)에서 가져와 `context`(최대 입력 토큰)와 `max_output`(최대 출력 토큰)으로 저장합니다. 모델 slug를 정규화해 짝짓고(`anthropic/claude-sonnet-5.5` ↔ `claude-sonnet-5-5`), AA의 effort·reasoning·날짜 변형 접미사(`-xhigh`, `-non-reasoning`, `-0803` 등)는 떼어 가며 다시 찾습니다. 못 찾은 모델은 비워 두고, 갱신할 때 점수 상위 미매칭 모델을 출력합니다. OpenRouter 호출이 실패하면 이전 스냅샷 값을 유지합니다.
  - 이름이 달라 자동으로 못 찾는 모델은 `data/context-map.json`에 적습니다. 값은 OpenRouter 모델 id(문자열), 직접 입력한 값(`{"context": 1000000, "max_output": 128000}`), 또는 정보 없음으로 고정하는 `null`입니다.

    ```json
    { "qwen3-8-max": "qwen/qwen3.8-max-0902", "step-5": { "context": 262144 } }
    ```
- **지원 언어**: 한국어(`ko`)·영어(`en`)·일본어(`ja`)·중국어(`zh`)와 다국어(`multi`, 여러 언어를 폭넓게 지원한다고 공식적으로 밝혔는지)를 `data/languages.json`에 직접 정리합니다. 어느 API도 이 정보를 주지 않아 수동으로 관리하며, 품질 평가가 아니라 제조사 공식 문서·모델 카드의 표기만 봅니다.
  - `official`(공식 지원): 문서에 그 언어를 지원한다고 명시. `unstated`(공식 언급 없음): 문서에 명시가 없음(대체로 동작). `no`(미지원): 공식 지원 언어 목록이 있고 그 언어가 빠져 있거나, 지원하지 않는다고 명시.
  - `creators`에 제조사(`creator_slug`)별 기본값을, `models`에 모델별 예외를 적습니다. 모델 키는 AA slug이고 effort·reasoning·날짜 접미사는 떼고 찾으므로 `llama-4-maverick` 하나로 변형 전체에 적용됩니다. 모델 값이 제조사 기본값보다 우선합니다. 항목마다 `source`(근거 URL)와 `note`(짧은 설명)를 남깁니다.

    ```json
    {
      "creators": { "example-maker": { "ko": "official", "en": "official", "ja": "official", "zh": "official", "multi": "official", "source": "https://...", "note": "공식 문서에 지원 언어 목록 명시" } },
      "models": { "example-model-1": { "ko": "no", "ja": "no", "zh": "no", "source": "https://...", "note": "구형 모델 카드: 8개 언어만 공식 지원" } }
    }
    ```
  - 파일을 고치면 서버를 다시 띄우지 않고 페이지를 새로고침만 하면 반영됩니다. `npm run fetch`는 언어 정보가 없는 점수 상위 모델을 출력합니다.
- **출시일**: AA가 제공하는 `release_date`(YYYY-MM-DD). 페이지의 "출시 시기" 필터는 데이터를 받은 날(`fetched_at`)로부터 3개월·6개월·1년·2년 이내 모델만 남기고, 가성비 경계선도 그 모델들로 다시 계산합니다.
- **측정 시점**: `models.json`의 `fetched_at`(UTC)이며, 페이지 상단에도 표시됩니다.

### 저장 위치

DB나 외부 저장소 없이 `data/` 폴더의 JSON 파일이 전부이고, 페이지는 실행 시 브라우저에서 이 파일을 읽습니다.

- `data/models.json`: 최신 스냅샷. 점수·가격·속도·컨텍스트 크기 중 하나라도 바뀌면 덮어쓰고, 모두 같으면 쓰지 않습니다.
- `data/languages.json`: 모델별 지원 언어(직접 관리). 페이지가 직접 읽습니다.
- `data/context-map.json`: 컨텍스트 크기를 짝지을 때 쓰는 수동 매핑(직접 관리). 페이지에서는 읽지 않습니다.
- `data/changelog.json`: 갱신 사이의 변경 내역. **모델 추가·삭제와 점수·가격 변경만** 기록하고, 속도만 바뀐 경우에는 기록하지 않습니다. 최신순으로 최대 90건까지 보관합니다.

`models.json`과 `changelog.json`은 git으로 추적되므로 갱신할 때마다 변경 사항으로 잡힙니다.

## 구성

| 경로 | 설명 |
|---|---|
| `index.html` | 페이지 본체. 빌드 없는 HTML/SVG/JS이고, 실행 시 `data/models.json`을 불러옵니다. |
| `data/models.json` | AA `/data/llms/models` 응답을 필요한 필드만 남겨 저장한 스냅샷 |
| `data/changelog.json` | 갱신할 때마다 기록되는 변경 내역(추가·삭제·점수 변경·가격 변경). 최신순이며 최대 90건까지 보관합니다. |
| `scripts/fetch-aa.mjs` | API에서 데이터를 받아 정리하고, 이전 스냅샷과 비교해 두 파일을 씁니다. 데이터가 같으면 아무것도 쓰지 않습니다. |
| `scripts/serve.mjs` | 데이터를 갱신한 뒤 페이지와 데이터 파일을 서빙합니다(기본 127.0.0.1, `--lan`이면 같은 네트워크까지). 이 세 파일 외의 경로는 모두 404를 반환합니다. |

## 참고

- 경계선은 선택한 지표(Intelligence, Coding, Math)마다 브라우저에서 전체 모델을 대상으로 계산합니다. 그래서 제조사로 필터링해도 그 제조사 모델이 전체 중 어디쯤 있는지 볼 수 있습니다.
- 데이터 출처: Artificial Analysis(https://artificialanalysis.ai/). API 약관상 출처 표기가 필요합니다.
