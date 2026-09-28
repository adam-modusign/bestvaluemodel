# Best value LLM

[Artificial Analysis](https://artificialanalysis.ai/)의 Intelligence Index와 API 혼합 단가(blended price)를 한 차트에 그려, **가성비 경계선(value frontier)** 위의 모델을 강조해 보여주는 단일 정적 페이지입니다. 경계선 위의 모델은 "이보다 싸면서 더 똑똑한 모델이 없는" 모델입니다.

별도 의존성 없이 Node만으로 로컬에서 실행합니다.

[terryds/bestvaluemodel](https://github.com/terryds/bestvaluemodel)을 포크해, GitHub Actions와 Cloudflare 배포를 걷어내고 로컬 실행용으로 바꿨습니다.

## 실행

Node 20.12 이상이 필요합니다. `npm install`은 필요 없습니다.

```sh
cp .env.example .env   # .env에 API 키 입력
npm start              # 데이터 갱신 후 http://127.0.0.1:8080 에서 서빙
```

API 키는 https://artificialanalysis.ai/ 에서 무료로 발급받습니다(Insights Platform → API keys). 하루 1,000회까지 호출할 수 있고, 데이터를 쓸 때는 출처 표기가 필요합니다.

키가 없거나 데이터를 받아오지 못하면 `data/`에 이미 있는 스냅샷으로 페이지를 띄웁니다.

| 명령 | 동작 |
|---|---|
| `npm start` | `AA_API_KEY`가 있으면 최신 데이터를 받은 뒤 서빙 |
| `npm run serve` | 데이터 갱신 없이 서빙만 |
| `npm run fetch` | 데이터 갱신만 |

8080 대신 다른 포트를 쓰려면 `PORT` 환경변수를 지정합니다(예: `PORT=3000 npm start`).

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
- 혼합 단가는 AA가 입력:출력을 3:1로 섞어 낸 가격입니다. 캐시 입력, 배치, 고속 모드 가격은 반영하지 않습니다.
- 데이터 출처: Artificial Analysis(https://artificialanalysis.ai/). API 약관상 출처 표기가 필요합니다.
