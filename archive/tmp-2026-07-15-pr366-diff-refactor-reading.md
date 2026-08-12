# PR #366 diff 읽기에서 실제 리팩터링까지 — 검색 경로 기록

> 상태: tmp. 아직 card/note/guide 중 어디로 분류할지 정하지 않았다.
> 작성일: 2026-07-15.
> 출발점: 모기가 PR #366 코드를 한 줄씩 읽으며 만든 `2026-07-15-code-diff-reading.md`.
> 이 문서는 제품 결정의 원본이 아니다. 코드를 지우거나 이름을 바꾸기 전에 파급효과를 어떻게 찾았는지 남기는 공부 기록이다.

## 한 줄 결론

PR #366이 새 버그를 만든 것은 아니었다. 모기가 diff를 천천히 읽다가 기존 코드에 숨어 있던 두 종류의 부채를 찾았다.

1. DB에서는 새 값을 추가할 수 있는데 TypeScript는 값 목록이 고정된 것처럼 선언하고, 실제 조회에서는 강제 단언으로 그 목록을 우회하고 있었다.
2. CascadePicker가 실제로는 finish를 고르면서 코드에서는 `formula`, 화면에서는 `질감`이라고 부르고 있었다.

작은 두 문제는 quick으로 바로 고쳤다. `supabaseAdapter` 책임 분리는 맞는 문제 제기지만 파급 범위가 커서 출시 후 todo로 분리했다.

작업 브랜치:

```text
refactor/dynamic-vocabulary-finish-naming
```

## 무엇이 수상했나

### 1. 닫힌 타입인데 DB 값은 열려 있었다

처음 본 선언은 아래 모양이었다.

```ts
export type ColorFamily =
  | 'coral'
  | 'rose'
  | 'pink'
  // ...

export type Texture =
  | 'creamy'
  | 'glowy'
  // ...
```

이 코드만 보면 TypeScript는 “목록 밖 값은 들어올 수 없다”고 이해한다. 그런데 실제 repo의 관리자 저장 코드는 새 slug를 DB에 만들 수 있었다. 조회 코드는 새 값을 막는 대신 다음처럼 컴파일러만 설득했다.

```ts
slug: slug as ColorFamily
slug: slug as Texture
```

`as`는 값 검사나 변환이 아니다. DB에 `lavender_grey`가 들어오면 런타임 값은 그대로 `lavender_grey`이고, TypeScript만 기존 목록 중 하나라고 믿는다.

즉 선언과 실제 동작이 갈라져 있었다.

```text
타입 선언: 값 목록은 고정됨
DB 동작: 어드민이 새 slug 추가 가능
조회 코드: 목록 밖 값도 받되 as로 경고만 끔
```

### 2. 이름 세 개가 서로 다른 뜻이었다

CascadePicker의 세 번째 단계는 `productFinishEntries()`로 값을 만들고 finish slug로 필터했다. 실제 값은 `matte`, `glossy`, `shimmer` 같은 마감이었다.

그런데 코드와 화면은 이렇게 되어 있었다.

```text
state 이름: formula
번역 key: my.cascade.step.formula
화면 문구: 질감
실제 데이터: finish
```

이 repo에서는 세 말이 같은 뜻이 아니다.

- formula: `Shade.formula`에서는 제품 라인명으로 쓰이는 오래된 필드 이름이다.
- texture: 발림감·입자감 쪽 shade trait다.
- finish: 매트·글로시·쉬머 같은 마감이다.

D-109도 texture와 finish를 분리한다. 따라서 단순 취향 문제가 아니라 코드가 다루는 도메인과 이름이 어긋난 상태였다.

## 코드 한 줄을 지우기 전에 파급효과를 찾는 순서

여기부터가 이번 기록의 핵심이다. “이 선언 지워도 되나?”를 느낌으로 판단하지 않고 검색 범위를 점점 넓혔다.

### 0. 내가 읽는 diff를 먼저 고정한다

PR 전체 설명만 읽으면 어느 코드가 이번 PR에서 바뀌었는지와 원래 있던 코드인지 섞인다.

```powershell
gh pr view 366 --json number,title,state,baseRefName,headRefName,body,files,commits,url
```

PR #366의 실제 코드 commit을 확인한 뒤 관심 파일만 잘라 읽었다.

```powershell
git diff 62c4d886^ 62c4d886 -- `
  app/src/data/types.ts `
  app/src/data/supabaseAdapter.ts `
  app/src/features/home/CascadePicker.tsx `
  app/src/shared/lib/finishLabel.ts
```

이 검색으로 구분한 것:

- PR #366이 새로 만든 것: `finishes[]`, `finishLabels[]`, `productFinishEntries()` 소비 경로.
- PR 전부터 있던 것: `ColorFamily`·`Texture` literal union, CascadePicker의 `formula` 이름.

그래서 이번 후속을 “PR #366 버그 수정”이라고 부르지 않았다. PR diff가 기존 부채를 드러낸 것이다.

### 1. 선언 이름의 모든 사용처를 찾는다

```powershell
rg -n '\b(ColorFamily|Texture)\b|as (ColorFamily|Texture)' app/src
```

`\b`는 단어 경계다. `TextureOption` 안의 일부 글자까지 무작정 잡지 않고 `Texture` 타입 자체를 찾는 데 도움이 된다.

이 검색에서 확인한 것:

- 타입 선언 위치.
- `ColorFamily`가 CascadePicker state와 DB adapter에 쓰임.
- `Texture`가 어드민 option·selection 타입에 쓰임.
- `adminColorFamilyRepo`와 `adminTextureRepo`가 신규 DB slug를 허용한다고 주석으로 이미 인정하고 있음.
- 직접적인 `as ColorFamily`, `as Texture` 단언 위치.

### 2. “타입 목록이 완전하다”는 전제에 기대는 소비자를 찾는다

literal union을 `string`으로 바꾸면 가장 위험한 곳은 exhaustive consumer다.

예를 들면 다음과 같다.

```ts
const labels: Record<ColorFamily, string> = { /* 모든 값이 있다고 믿음 */ }

switch (colorFamily) {
  case 'pink':
  case 'red':
    // 목록 밖 값은 없다고 믿음
}
```

그래서 아래를 보강 검색했다.

```powershell
rg -n "Record<ColorFamily|Record<Texture|switch \(.*(?:colorFamily|texture)|case '(?:coral|creamy|glowy)'|COLOR_FAMILY|TEXTURE_" `
  app/src -g '*.ts' -g '*.tsx'
```

결과:

- `Record<ColorFamily, ...>`나 `Record<Texture, ...>` 없음.
- 해당 union을 기준으로 한 `switch/case` 없음.
- texture 그룹 라벨은 이미 `Record<string, string>`.
- color family 화면 라벨도 DB 라벨 맵에 값이 없으면 slug를 그대로 보여주는 fallback을 가짐.

fallback 경로 확인:

```powershell
rg -n -A 18 -B 3 'function getColorFamilyLabel|const COLOR_FAMILY' `
  app/src/data app/src/shared app/src/features -g '*.ts' -g '*.tsx'
```

실제 함수:

```ts
export function getColorFamilyLabel(slug: string): string {
  return _colorFamilyLabels[slug] ?? slug
}
```

따라서 literal union을 없애도 새 slug 때문에 이 함수가 바로 `undefined`를 반환하는 구조는 아니었다.
풀어서 보면 다음 순서다.

```ts
const slug = 'lavender_grey'

_colorFamilyLabels[slug] // 맵에 없으면 undefined
undefined ?? slug        // 오른쪽 fallback 선택
// 최종 반환: 'lavender_grey'
```

함수가 아래처럼 fallback 없이 끝났다면 새 slug에서 진짜 `undefined`가 나왔을 것이다.

```ts
return _colorFamilyLabels[slug]
```

현재 함수는 `?? slug`가 있으므로 최소한 화면 문자가 사라지지는 않는다. 다만 이것은 “한글 라벨까지 정상이다”가 아니라 “라벨을 못 찾으면 raw slug라도 보여준다”는 마지막 안전망이다.

### 현재 DB의 label_kr을 실제로 함께 읽고 있나

그렇다. 다만 이번 quick에서 새로 만든 배선은 아니고 기존에 이미 있었다.

`ensureLoaded()`가 catalog를 불러온 뒤 color family 목록을 별도로 조회한다.

```ts
const families = await fetchColorFamilies()
_colorFamilyLabels = Object.fromEntries(
  families.map((f) => [f.slug, f.labelKr || f.slug]),
)
```

`fetchColorFamilies()`는 DB `color_families`를 조회하고 다음처럼 바꾼다.

```text
DB label_kr → ColorFamilyOption.labelKr → _colorFamilyLabels[slug]
```

그래서 정상 경로는 다음과 같다.

```text
DB: slug=lavender_grey, label_kr=라벤더 그레이
→ fetchColorFamilies()
→ _colorFamilyLabels['lavender_grey'] = '라벤더 그레이'
→ getColorFamilyLabel('lavender_grey')
→ 화면: 라벤더 그레이
```

DB 조회가 실패하면 `_colorFamilyLabels = {}`로 비우고, 그때만 `getColorFamilyLabel()`의 `?? slug`가 작동한다. 즉 우선순위는 `DB label_kr → raw slug fallback`이다.

주의할 점: `supabaseAdapter`도 `color_families`를 조회하지만 그쪽은 shade의 `colorFamily: string[]`를 만들기 위한 `id → slug` 연결에 쓴다. 화면 라벨 맵은 `data/index.ts`의 `ensureLoaded() → fetchColorFamilies()` 경로가 따로 맡는다.

이번 quick은 이 라벨 배선을 수정하지 않았다. 기존 배선이 새 slug를 이미 받을 수 있다는 것을 확인하고, 그 실제 동작과 충돌하던 거짓 literal union·타입 단언만 제거했다.


### 3. 직접 단언만 찾고 끝내지 않는다

처음에는 아래 검색으로 직접 단언을 찾았다.

```powershell
rg -n 'as ColorFamily|as Texture' app/src
```

이 검색만 믿고 첫 patch를 만들었다. 그런데 수정 뒤 낡은 주석을 확인하려고 더 넓게 찾다가 간접 단언 두 곳을 발견했다.

```ts
slug as ShadeColorFamilySelection['slug']
slug as ShadeTextureSelection['slug']
```

겉에 `ColorFamily`나 `Texture`라는 이름이 없어서 첫 검색에 안 잡힌 것이다. 실제로는 두 selection의 `slug`가 각각 그 타입을 가리킨다.

두 번째 검색:

```powershell
rg -n "as [A-Za-z]+(?:Selection|Option)?\['slug'\]|as .*Texture|as .*ColorFamily" app/src
```

여기서 얻은 교훈:

```text
타입을 지울 때는 타입 이름 검색만 하지 않는다.
그 타입을 감싼 interface의 indexed access type과 별칭도 찾는다.
```

이번에는 간접 단언 두 곳도 같이 제거했다.

### 4. 이름 변경은 state만 보지 말고 번역 key까지 따라간다

CascadePicker의 `formula`를 `finish`로 바꾸기 전 관련 state·계산값·번역 key를 한꺼번에 찾았다.

```powershell
rg -n 'cascade.*formula|step\.formula|formulaLabels|setFormula|Stage =' `
  app/src app/public app
```

그리고 `formula`가 repo의 다른 곳에서 어떤 뜻으로 쓰이는지도 확인했다.

```powershell
rg -n '"formula"|formula:' app/src/locales app/src -g '*.json' -g '*.ts'
```

여기서 중요한 구분:

- `CascadePicker` 안의 `formula`만 finish를 뜻하는 오명칭이었다.
- `Shade.formula`, line tray, 검색 haystack 등의 `formula`는 제품 라인명을 뜻하는 기존 필드라 이번에 일괄 rename하면 안 됐다.
- `attributeGroups.ts`의 `formula`는 D-109에서 정한 물리 제형 group slug라 또 다른 정상 사용이다.

즉 repo 전체 `formula`를 치환하지 않고 CascadePicker 경로만 좁게 바꿨다.

### 5. 호환 별칭은 사용 범위를 먼저 보고 보류한다

`Product = Shade`도 읽으면서 발견했지만 바로 지우지 않았다.

```powershell
rg -l '\bProduct\b' app/src -g '*.ts' -g '*.tsx'
```

결과는 archive, home, explore, detail sheet, line page, profile, store 주변까지 수십 파일이었다.

이 별칭 제거는 이름 한 줄 삭제가 아니다. 컴포넌트 props와 helper signature가 넓게 움직인다. 이번 quick의 목적과 관계가 약하고 회귀면이 크므로 유지했다.

판정 기준:

```text
작은 거짓 단언 제거: 바로 quick
한 화면 내부 오명칭: 바로 quick
앱 전역 호환 별칭 제거: 별도 계획 없이는 보류
```

### 6. 코드보다 먼저 정해진 원칙이 있는지 원문을 읽는다

요약만 보고 “동적 enum이니까 string으로”라고 결론내리지 않았다. 관련 결정 원문을 확인했다.

```powershell
Get-Content -Raw -Encoding UTF8 docs/wiki/decisions/D-104.md
Get-Content -Raw -Encoding UTF8 docs/wiki/decisions/D-107.md
Get-Content -Raw -Encoding UTF8 docs/wiki/decisions/D-109.md
```

확인한 경계:

- D-104: texture/finish/form 추천 규칙과 어휘 SSOT를 프런트 상수가 아니라 DB에 둔다.
- D-107: finish는 제품 라인 identity가 아니라 trait다.
- D-109: 공식 taxonomy는 드라이하게 유지하지만 texture와 finish는 서로 다른 영역이다.

여기서 두 결론이 나왔다.

1. DB 확장형 slug를 닫힌 TypeScript union으로 가장할 근거가 없다.
2. finish를 화면에서 texture 의미인 `질감`이라고 부르면 결정의 어휘 경계와 어긋난다.

## 실제로 고친 것

### 1. ColorFamily와 Texture를 정직한 타입으로 변경

전:

```ts
export type ColorFamily = 'coral' | 'rose' | 'pink' | /* ... */
export type Texture = 'creamy' | 'glowy' | /* ... */
```

후:

```ts
export type ColorFamily = string
export type Texture = string
```

그냥 `string`을 직접 쓰지 않고 이름은 남겼다. 컴파일러 제약은 없지만 함수와 interface에서 “이 문자열이 어떤 도메인 slug인지” 읽는 표지 역할은 유지한다.

### 2. 거짓 단언 제거

제거한 모양:

```ts
slug as ColorFamily
slug as Texture
slug as ShadeColorFamilySelection['slug']
slug as ShadeTextureSelection['slug']
```

이미 앞에서 `slug`가 `string | null`인지 확인하고 빈 값을 거른 뒤라, 남은 값은 `string`이다. string 기반 별칭에 다시 단언할 이유가 없다.

### 3. CascadePicker의 실제 의미와 이름 통일

전:

```text
formula / setFormula
availableFormulas
formulaLabels
Stage = 'formula'
my.cascade.step.formula = 질감
```

후:

```text
finish / setFinish
availableFinishes
finishLabels
Stage = 'finish'
my.cascade.step.finish = 마감
```

필터 조건은 그대로 `productFinishEntries(p)`의 slug를 비교한다. 사용자에게 보이는 단계 이름과 내부 변수 이름만 실제 데이터 의미에 맞췄다.

### 4. 큰 리팩터링은 별도 todo로 분리

`supabaseAdapter.loadFromSupabase()`는 여러 조회와 row 해석, fallback, `Shade[]` 조립, 오류 처리가 한 함수에 모여 있다. 문제 제기는 맞지만 이번에 분리하지 않았다.

이유:

- catalog 전체 read path라 회귀면이 넓다.
- 단순 파일 나누기가 아니라 조회 orchestration과 순수 mapper 경계를 정해야 한다.
- 대표 이미지, finish fallback, color family 정렬, 관계 조립을 먼저 characterization test로 고정해야 한다.
- MVP 출시 전에는 구조 미관보다 현재 동작 보존이 우선이다.

후속 위치:

```text
.planning/todos/pending/supabase-adapter-read-model-split.md
```

## 당시 실제 검색과 글을 쓰며 보강한 검색

사후에 절차를 너무 매끈하게 꾸미지 않기 위해 구분한다.

### 당시 실제로 한 것

- PR #366 메타데이터와 파일 목록 확인.
- commit 범위의 관심 파일 diff 확인.
- `ColorFamily`·`Texture` 타입과 직접 단언 검색.
- admin repo 원문을 읽어 신규 slug 허용 주석 확인.
- CascadePicker의 `formula` state·번역 key 검색.
- repo 전체 `Product` 별칭 사용 파일 검색.
- 첫 patch 뒤 낡은 주석 검색 중 간접 slug 단언 발견.
- 간접 단언까지 포함한 넓은 regex로 재검색.
- 수정 후 옛 이름과 단언이 0건인지 확인.

### 이 글을 쓰며 보강한 것

- `Record<ColorFamily, ...>`·`Record<Texture, ...>` 존재 여부.
- color family·texture 기준 `switch/case` 존재 여부.
- 새 color family slug의 화면 라벨 fallback 경로.

이 보강 검색은 최초 patch 전에 전부 한 것이 아니다. 하지만 다음 리팩터링부터는 삭제 전 체크리스트에 올릴 가치가 있다.

## 검증

### 잔존 검색

```powershell
rg -n "as ColorFamily|as Texture|as ShadeColorFamilySelection\['slug'\]|as ShadeTextureSelection\['slug'\]|formulaLabels|availableFormulas|setFormula|step\.formula" app/src
```

결과: 0건.

### TypeScript

```powershell
pnpm --filter app exec tsc --noEmit
```

결과: 통과. 마지막 간접 단언 두 곳을 제거한 뒤 다시 실행해도 통과.

### 단위 테스트

```powershell
pnpm --filter app test
```

결과:

```text
Test Files  23 passed (23)
Tests       159 passed (159)
```

### 파일 형식과 diff

```powershell
git diff --check
node -e "JSON.parse(require('fs').readFileSync('app/src/locales/ko/pages.json','utf8'))"
```

결과: 둘 다 통과.

### 검증에서 별도로 걸린 것

- 전체 wiki lint는 Windows 환경에서 2분 timeout. 이번 변경 대상은 `docs/wiki/`가 아니라 app 코드와 `.planning` 문서였다.
- `verify-agent-ssot.sh`의 Codex hook 2건 FAIL은 이번 변경과 무관한 Windows symlink 가짜 양성이다. `.agent/Memory.md`에 이미 같은 환경 원인이 기록돼 있다.

이 두 결과를 코드 실패처럼 뭉개지 않고, 변경과 관련된 실패인지 분리했다.

## 각 검증이 증명하는 것과 못 하는 것

| 검증 | 증명하는 것 | 증명하지 못하는 것 |
|---|---|---|
| rg 잔존 검색 | 알고 있는 옛 이름·단언 패턴이 남지 않음 | 다른 이름으로 감싼 새로운 단언까지 자동 보장하지 않음 |
| tsc | 타입 연결이 깨지지 않음 | 실제 화면 문구가 자연스러운지 |
| 159개 테스트 | 기존 테스트가 보는 동작 회귀 없음 | CascadePicker를 사람이 눌렀을 때 체감 |
| JSON parse | 번역 파일 문법이 유효함 | 번역 key가 모든 화면에서 올바른 뜻인지 |
| git diff --check | 공백 오류·충돌 표식 같은 diff 형식 문제 없음 | 제품 의미가 맞는지 |

이번 변경은 필터 알고리즘을 바꾸지 않았고 변수명·타입 진실성·화면 단계 문구를 정리했다. 그래도 화면에서 `마감` 단계가 보이고 기존과 같은 결과가 나오는지는 나중에 브라우저로 한 번 보는 편이 가장 직접적인 확인이다.

## 다음에 “이 코드 지워도 돼?”가 나오면 쓰는 검색 체크리스트

### A. 선언과 직접 사용

```powershell
rg -n '\b삭제할이름\b' app/src
```

### B. 별칭과 간접 타입

```powershell
rg -n "as .*삭제할이름|\['관련필드'\]|type .* = 삭제할이름|interface .*삭제할이름" app/src
```

### C. 목록이 완전하다고 믿는 코드

```powershell
rg -n 'Record<삭제할타입|switch \(|case ' app/src
```

### D. 사용자에게 보이는 이름

```powershell
rg -n '번역키|화면문구|state이름' app/src/locales app/src
```

### E. 특정 PR이 만든 변경인지

```powershell
git diff <commit>^ <commit> -- <관심파일>
git blame -L <시작줄>,<끝줄> <파일>
```

### F. 삭제 뒤 잔존 검색

```powershell
rg -n '옛이름|옛단언|옛번역키' app/src
```

검색 결과가 0건이어도 끝은 아니다. 그 코드가 맡던 계약을 다른 코드가 대신하는지, fallback이 있는지, 타입 검사와 동작 검증이 통과하는지까지 확인해야 한다.

## 이번에 배운 것

1. diff를 한 줄씩 읽는 공부는 문법 이해에서 끝나지 않는다. 이름과 실제 데이터가 어긋나는 지점을 찾으면 바로 리팩터링 입력이 된다.
2. TypeScript union은 DB가 같은 목록을 강제할 때만 진짜 가드다. DB가 열려 있는데 `as`로 통과시키면 가드가 아니라 문서처럼 보이는 거짓말이 된다.
3. 코드 삭제 파급효과는 타입 이름만 검색하면 부족하다. indexed access type, alias, `Record`, `switch`, 번역 key까지 따라가야 한다.
4. repo 전체 치환은 위험하다. 같은 `formula`라는 단어도 제품 라인명, form group, 잘못 붙은 finish state라는 세 뜻으로 쓰였다.
5. 좋은 발견을 전부 한 PR에 넣지 않는다. 작은 진실성 수정은 quick으로, catalog 전체 구조 변경은 characterization test를 갖춘 후속 todo로 나누는 편이 안전하다.
6. 검색 절차를 나중에 정리할 때는 실제로 했던 검색과 사후 보강 검색을 구분해야 다음 사람이 재현할 수 있다.
