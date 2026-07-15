# 모기 코드 diff 노트 — 2026-07-15

> diff를 읽다가 물어본 것과 발견한 것을 기록한다. 이해에 도움이 되는 Java·Spring 비교와 상세 코드 예시도 함께 남긴다.

## `app/src/data/types.ts`

- 순수 도메인 모델 파일은 아니다.
- 도메인 타입(`Shade`, `Swatch`) + 조회 DTO(`Catalog`, `AtlasData`) + 화면 상태(`SheetState`)가 섞인 프론트 공용 타입 모음이다.
- `Product = Shade`는 기존 컴포넌트를 위한 호환용 별칭이다.
- `ColorFamily`와 `Texture` literal union은 DB에서 어드민이 새 값을 추가할 수 있다는 현재 동작과 어긋나는 하드코딩이다.
- 실제 repo도 DB slug를 `as ColorFamily`·`as Texture`로 캐스팅해 union 검사를 우회하므로 타입 가드 역할을 하지 못한다.
- TypeScript의 `as Texture`는 값 변환이나 런타임 검사가 아니라 컴파일러 경고를 끄는 단언이다. Java의 `Enum.valueOf()`보다 `@SuppressWarnings`를 붙인 unchecked cast에 가깝다.
- DB에 union 밖 slug가 추가돼도 그대로 통과하고, 이후 `switch`나 라벨 맵은 모든 값이 알려졌다고 믿어서 `undefined` 또는 잘못된 fallback이 나올 수 있다.
- 정리할 때 선언만 지우지 말고 `string` 계열 타입 또는 생성된 DB 타입으로 바꾸고 관련 캐스팅·낡은 주석을 함께 걷는다.

### `as Texture` 강제 단언 — Java와 비교

TypeScript의 `as Texture`는 값을 변환하거나 검사하지 않는다. 컴파일러에게만 “이 값은 `Texture`라고 믿어”라고 지시한다.

```ts
type Texture = 'creamy' | 'glowy'

const slugFromDb = 'wet_glass'
const texture = slugFromDb as Texture
```

위 코드는 다음과 같이 동작한다.

- `'wet_glass'`가 `Texture` 목록에 있는지 검사하지 않는다.
- `'wet_glass'`를 다른 값으로 변환하지 않는다.
- 런타임 값은 그대로 `'wet_glass'`다.
- TypeScript 컴파일러만 `texture`가 `Texture`라고 믿는다.

Java의 정상적인 enum 변환은 보통 다음과 같다.

```java
enum Texture {
    CREAMY,
    GLOWY
}

Texture texture = Texture.valueOf(slugFromDb.toUpperCase());
```

DB에서 `wet_glass`가 오면 `IllegalArgumentException`이 발생한다. DB와 코드의 목록이 어긋났다는 사실을 즉시 발견할 수 있다.

TypeScript의 `as Texture`는 `Enum.valueOf()`보다 Java의 unchecked cast를 억지로 신뢰하는 코드에 가깝다.

```java
@SuppressWarnings("unchecked")
static <T> T trustMe(Object value) {
    return (T) value;
}
```

차이도 있다. Java 캐스팅은 실제 타입이 맞지 않으면 런타임 예외가 날 수 있지만, TypeScript 타입은 빌드 후 사라진다. 따라서 `as Texture` 자체는 런타임에서 아무것도 검사하지 않는다.

실제 실패는 이후 코드에서 늦게 나타날 수 있다.

```ts
const TEXTURE_LABELS: Record<Texture, string> = {
  creamy: '크리미',
  glowy: '글로우',
}

const texture = 'wet_glass' as Texture
const label = TEXTURE_LABELS[texture] // 런타임에서는 undefined 가능
```

컴파일러는 모든 `Texture`에 라벨이 있다고 믿지만, 실제 DB 값은 union 밖이라 라벨이 없다. 화면에서 라벨이 사라지거나 잘못된 fallback으로 갈 수 있다.

정리 방향:

- DB에서 어드민이 값을 추가할 수 있다면 slug는 `string` 계열로 받고 표시 라벨도 DB에서 함께 읽는다.
- 값이 정말 고정 enum이라면 DB 제약, 생성 타입, 런타임 parser가 같은 목록을 강제해야 한다.
- `as Texture`로 불일치를 숨기지 않는다.

## `app/src/data/supabaseAdapter.ts`

- Spring 기준 `Repository + Mapper`가 합쳐진 조회 어댑터에 가깝다.
- 브랜드·카테고리·제품 라인·shade·이미지·비교 관계·트윗 등을 한 번에 조회해 `Product[]`로 조립한다.
- 도메인별 Repository가 나뉜 구조는 아니다.
- 조회·변환·기본값·오류 처리가 한 함수에 모여 있어 God Adapter 냄새가 난다.
- 후속: MVP 안정화 뒤 테이블별 조회와 read-model 조립 책임 분리를 검토하는 todo를 남김.
- finish 대표값은 `finishSlug`와 `finishLabel`을 따로 만들기보다 `const representativeFinish = traitFinishes[0]`처럼 한 객체로 잡는 편이 읽기 쉽다.
- `firstFinishLabel`은 현재 구현 순서를 드러내는 이름이고, `representativeFinish`는 값의 역할을 드러내므로 선정 방식이 바뀌어도 이름을 유지하기 쉽다.

## `async`

- Supabase 조회가 즉시 값이 아니라 `Promise`를 반환하므로 결과를 꺼내려면 `await`가 필요하다.
- 함수 안에서 `await`를 쓰려면 함수에 `async`를 붙인다.
- 외부 요청이라고 `async` 문법이 무조건 필요한 것은 아니다. Promise를 그대로 반환할 수도 있다.
- 여기서는 여러 조회를 `Promise.all()`로 동시에 요청한 뒤 결과를 조립해야 해서 `async/await`를 쓴다.
- Java에서 가장 가까운 개념은 `CompletableFuture<T>`다. 둘 다 나중에 완료될 값이나 실패를 표현한다.
- `Promise.all()`은 `CompletableFuture.allOf()`와 비슷하지만, Java의 `join()`처럼 현재 스레드를 막는 동작과 JavaScript의 `await`는 다르다.

## `app/src/features/explore/AtlasExploreView.tsx`

`productFinishEntries`는 변수가 아니라 `finishLabel.ts`에서 named export한 함수다.

```ts
import { productFinishEntries } from '@/shared/lib/finishLabel'
```

Java에서 static method를 import한 뒤 클래스명 없이 호출하는 것과 비슷하다.

```java
import static com.mogui.FinishLabel.productFinishEntries;
```

실제 사용식:

```ts
...productFinishEntries(shade).map(({ slug, label }) => label ?? FINISH_LABEL_KR[slug] ?? slug)
```

처리 순서:

1. `productFinishEntries(shade)`가 `{ slug, label }[]` 배열을 반환한다.
2. `.map(...)`이 각 항목을 화면에 표시할 문자열로 바꾼다.
3. `label ?? FINISH_LABEL_KR[slug] ?? slug`는 DB 라벨, 하드코딩 한글 라벨, slug 순서로 첫 유효값을 고른다.
4. 맨 앞의 `...`는 변환된 문자열 배열을 바깥 태그 배열에 펼친다.
5. 따라서 함수 결과를 변수처럼 쓴 것이 아니라 함수 호출 → 배열 변환 → 바깥 배열에 `addAll`한 흐름이다.

Java로 풀면 대략 다음과 같다.

```java
List<String> tags = new ArrayList<>();
for (ProductFinishEntry entry : productFinishEntries(shade)) {
    String label = entry.label() != null ? entry.label() : finishLabels.getOrDefault(entry.slug(), entry.slug());
    tags.add(label);
}
```

### 왜 `static` 함수처럼 보이나

`productFinishEntries`는 TypeScript에서 `static`으로 선언된 함수가 아니다. 클래스 밖 모듈 최상단에 선언하고 이름 붙여 export한 일반 함수다.

```ts
export function productFinishEntries(product) { /* ... */ }
```

Java에서 같은 사용 모양을 만들면 유틸 클래스의 static method에 가깝다.

```java
public final class FinishLabel {
    private FinishLabel() {}
    public static List<ProductFinishEntry> productFinishEntries(Product product) { /* ... */ }
}
```

하지만 이것은 Java로 이해하기 위한 비유일 뿐, TypeScript 코드에 클래스나 `static` 키워드가 숨어 있는 것은 아니다.

이 형태가 맞는 이유:

- 객체마다 달라지는 상태를 보관하지 않는다.
- 필요한 값을 인자로 받고 결과만 반환한다.
- `this`나 생성자, 인스턴스 생명주기가 필요 없다.

클래스 선언이 귀찮아서 생략한 임시 코드라기보다, 상태 없는 변환 로직을 모듈 함수로 두는 TypeScript·React의 일반적인 스타일이다.

## `app/src/features/home/CascadePicker.tsx`

홈 화면에서 전체 발색 목록을 조건별로 단계적으로 좁혀 보여주는 탐색 필터 컴포넌트다.

### 선택 흐름

1. 카테고리 선택: 립스틱, 틴트, 블러셔 등
2. 선택한 카테고리에 실제로 존재하는 색상 계열만 표시
3. 선택한 카테고리와 색상 계열에 실제로 존재하는 finish만 표시
4. 세 조건에 맞고 이미지가 있는 발색을 최대 24개 그리드로 표시

`Cascade`는 앞 단계 선택에 따라 뒤 단계 선택지가 연쇄적으로 달라진다는 뜻이다. 카테고리를 바꾸면 색상 계열과 finish가 초기화되고, 색상 계열을 바꾸면 finish가 초기화된다.

### 입력과 결과

- 입력: 부모가 넘긴 전체 `products: Product[]`
- 선택지 계산: `useMemo()`로 현재 데이터에 존재하는 값만 추출
- 선택 상태: `category`, `colorFamily`, `formula`
- 결과: 조건에 맞는 `matchedShades`
- 결과 클릭: 선택값을 부모에게 반환하지 않고 전역 store의 `openSwatchSheet(product.id)`로 상세 시트를 연다.

### 이름에서 주의할 점

- 일반적인 form picker처럼 제품 하나를 선택해 callback으로 넘기는 컴포넌트는 아니다. 자체적으로 필터와 결과 목록까지 그리는 탐색 UI다.
- 코드의 `formula` 상태 타입은 `Finish`이고 `productFinishEntries()`로 비교한다. 현재 이름은 formula지만 실제로 고르는 값은 finish라 용어가 어긋나 있다.

Java Stream으로 필터 부분만 비유하면 다음과 비슷하다.

```java
List<Product> filtered = products.stream()
    .filter(p -> category == null || p.productType() == category)
    .filter(p -> colorFamily == null || p.colorFamilies().contains(colorFamily))
    .filter(p -> finish == null || p.finishes().contains(finish))
    .limit(24)
    .toList();
```

## 리팩터링 시점

현재 `detail-sheet-multi-finish-chips` PR에는 원래 목적과 직접 관련된 수정만 둔다. Gist에서 발견한 구조 개선을 한꺼번에 현재 PR에 섞지 않는다.

현재 PR에서 고칠 것:

- 이 PR이 새로 만든 실제 동작 오류
- 머지하면 데이터·화면·권한이 깨지는 blocker
- 현재 변경을 이해할 수 없게 만드는 아주 작은 지역 변수명 정리

머지 후 별도 리팩터링 PR로 보낼 것:

- `supabaseAdapter` 책임 분리
- DB 확장형 `ColorFamily`·`Texture` 하드코딩 제거
- `formula`와 `finish` 용어 정리처럼 여러 파일에 퍼지는 변경

## Git 꿀팁 — 다른 브랜치로 변경 가져가기

변경이 커밋 전인지 이미 커밋됐는지에 따라 방법이 다르다.

### 아직 커밋하지 않은 변경

```bash
git stash push -m "wip"
git switch dev
git pull --ff-only
git switch -c fix/새-브랜치
git stash pop
```

충돌이 없으면 `git switch dev`만으로 작업 파일이 따라갈 수도 있지만, dev를 더럽히지 않도록 stash 후 새 작업 브랜치에서 꺼내는 편이 안전하다.

### 이미 커밋한 변경

```bash
git switch dev
git pull --ff-only
git switch -c docs/새-브랜치
git cherry-pick <커밋해시>
```

`git switch dev`만 하면 커밋은 원래 브랜치에 남는다. 새 브랜치로 그 커밋을 가져오려면 `git cherry-pick`을 쓴다.

### 핵심 구분

- 커밋 전 작업 파일 이동: `stash` → 새 브랜치 → `stash pop`
- 커밋된 변경 이동: 새 브랜치 → `cherry-pick`
- 이 repo에서는 dev에 직접 작업하거나 커밋하지 않는다.
