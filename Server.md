# 포도알 채우기 — 서버 설계 초안 (1단계: 로컬 → 서버 동기화)

> 목표: 현재 클라이언트 로컬 상태(React Context, 새로고침 시 초기화)를 그대로 서버로 옮긴다.
> 계정/로그인 + 개인 데이터 동기화까지만 다룬다. 친구/학원 "함께 보기" 공유 기능과 그 전용 테이블·API는 이번 산출물에 포함하지 않는다.

---

## 1. 스캔한 파일과 확인한 핵심 내용

| 파일 | 확인한 핵심 내용 |
|---|---|
| `CLAUDE.md` → `AGENTS.md` | 1단계는 백엔드 없는 로컬 앱. `bunches`/`harvests`는 독립된 두 리스트(1:1 상태전환 아님). 완성 시 두 버튼(다시 심기 / 보관함 확인) 의미 차이. `harvests.sourceBunchId`는 원본 삭제돼도 값 유지(고아 참조 허용). |
| `src/store/grape-store.tsx` | 전역 상태의 유일한 소스. 액션 13개(§2 표에 전부 나열) + 시드 데이터 함수(`seedBunches`, `seedHarvests` — 서버 설계와 무관, 로컬 데모용). `applyFilled`가 필드 게이팅 로직(클램프, `fillDates` append 조건, `completedAt` 세팅/해제)을 갖고 있어 서버가 그대로 복제해야 할 부분. |
| `src/types/grape.ts` | `Bunch`, `Harvest`, `NotificationSettings` 타입 정의. `Harvest`는 `Bunch`의 부분집합이 아니라 의도적 축약 스냅샷(주석에 명시). |
| `src/app/index.tsx` | 로그인 화면. Google/카카오 버튼이 **둘 다 동일하게 `loginContinue`만 호출**하는 스텁 — 실제 OAuth SDK 연동은 아직 없음. `loginAsGuest`는 별도 액션. |
| `src/app/_layout.tsx` | 인증 분기는 `isAuthenticated`(= `session !== 'signedOut'`) 하나의 불리언 게이트. 게스트와 실사용자를 라우팅 단에서 구분하지 않음. |
| `src/app/settings.tsx` | `updateSettings` 호출. 프로필 영역의 이름/이메일("지수"/"jisoo@example.com")은 **스토어에 연결되지 않은 하드코딩 값** — 실제 사용자 프로필 조회 액션이 store에 없음. "회원탈퇴" 버튼은 존재하나 연결된 액션 없음(죽은 UI). |
| `src/app/(tabs)/index.tsx` | 홈. `bunches` 목록 렌더링만, "포도송이 N개"는 필터링 없는 `bunches.length`. |
| `src/app/(tabs)/records.tsx`, `src/lib/stats.ts` | 스트릭/히트맵/주평균 전부 `bunches[].fillDates` + `harvests[].fillDates`를 중복 없이 병합해 **클라이언트에서 계산**(순수 함수, 서버 저장 데이터 없음). 서버는 두 리스트의 `fillDates` 배열을 그대로 내려주면 됨 — 집계 API 불필요. |
| `src/app/(tabs)/archive.tsx` | `harvests` 목록 렌더링, 클릭 시 `harvest/[id]`로 이동(원본 `bunch/[id]` 아님). |
| `src/app/bunch/[id].tsx` | `setFilled`(그래프 셀 클릭/버튼) + `deleteBunch`(삭제 확인 모달). `addOneGrape`는 여기서도 쓰이지 않고 `setFilled(id, filled+1)`을 직접 호출 — **`addOneGrape`는 스토어에 정의만 되어 있고 어떤 화면에서도 호출되지 않는 미사용 액션**. |
| `src/app/bunch/new.tsx` | `addBunch({name, unitLabel, total, periodDays})` 호출. `detail`은 입력 필드가 아니라 store 내부에서 `unitLabel`로부터 파생됨. |
| `src/app/bunch/complete.tsx` | 진입 시 `addHarvest(bunch)`를 1회 자동 호출해 원본을 archive(`POST /api/bunches/{id}/archive`). 두 버튼은 서버 호출 없음/이동만: <br>• "같은 송이 다시 심기" → `addBunch({name, unitLabel, total, periodDays})`로 새 Bunch 생성 후 홈 이동 <br>• "보관함에서 확인하기" → 보관함으로 이동만 |
| `src/app/harvest/[id].tsx` | `recallHarvest(harvestId, filled)` 호출 후 반환된 새 `Bunch.id`로 `/bunch/{id}`로 이동. `deleteHarvest` 별도 호출(삭제 모달). |

---

## 2. store 액션 → 서버 API 후보 전체 매핑

| store 액션 | 후보 엔드포인트 | 비고 |
|---|---|---|
| `loginContinue` (Google 버튼) | `POST /api/auth/google` | 클라이언트가 아직 실제 OAuth 미연동(§4 가정) |
| `loginContinue` (카카오 버튼) | `POST /api/auth/kakao` | 위와 동일 스텁 |
| `loginAsGuest` | `POST /api/auth/guest` | |
| `logout` | `POST /api/auth/logout` | |
| `getBunch` | `GET /api/bunches/{id}` | 목록에서 파생되는 selector, 별도 서버 로직 아님 |
| (목록 조회, `bunches` state) | `GET /api/bunches` | 홈/기록 화면이 소비 |
| `addBunch` | `POST /api/bunches` | |
| `setFilled` | `PATCH /api/bunches/{id}/fill` | |
| `addOneGrape` | *(엔드포인트 설계 안 함)* | 어느 화면에서도 호출 안 됨 + `setFilled(id, filled+1)`과 완전히 동일한 효과 → 중복 엔드포인트 불필요 |
| `harvestBunch`(다시 심기 경로) | `POST /api/bunches/{id}/replant` | §3-4 근거 참고. **현재 클라 호출부 없음**(complete 화면 자동화 이후 미사용) — 라우트는 유지 |
| `addHarvest`(보관함 경로, complete 진입 시 자동 + harvest 화면) | `POST /api/bunches/{id}/archive` | §3-4 근거 참고 |
| `deleteBunch`(단독 삭제, bunch 상세 화면) | `DELETE /api/bunches/{id}` | |
| `deleteHarvest` | `DELETE /api/harvests/{id}` | |
| (목록 조회, `harvests` state) | `GET /api/harvests`, `GET /api/harvests/{id}` | |
| `recallHarvest` | `POST /api/harvests/{id}/recall` | |
| `updateSettings` | `PATCH /api/settings` | |
| (설정 조회) | `GET /api/settings` | |
| *(store에 없음, §4 가정)* | `GET /api/users/me` | settings 화면 프로필 표시용 — 클라이언트 미연결 상태 |

---

## 3. API 명세

공통 사항:
- Base path: `/api`
- 인증: `Authorization: Bearer <accessToken>` (JWT). `/api/auth/**`만 인증 불필요.
- 응답 바디의 필드명/타입은 클라이언트 `Bunch`/`Harvest`/`NotificationSettings`와 1:1 일치(camelCase, Jackson 기본 직렬화로 변환 코드 없이 매칭).
- `bunches`/`harvests` 응답은 해당 사용자(`user_id`) 소유 레코드만 반환.

### 3-1. 인증

#### `POST /api/auth/google`
- 인증: 불필요
- 요청: `{ "idToken": string }`
- 응답 200: `{ "accessToken": string, "user": { "id": string, "provider": "GOOGLE", "email": string | null, "nickname": string | null } }`
- 신규 `provider_user_id`면 계정 생성, 기존이면 로그인.

#### `POST /api/auth/kakao`
- 요청/응답: 위와 동일 shape, `provider: "KAKAO"`. 요청 바디는 `{ "accessToken": string }`(카카오 SDK 토큰을 서버가 카카오 API로 검증).

#### `POST /api/auth/guest`
- 요청: `{}`
- 응답 200: `{ "accessToken": string, "user": { "id": string, "provider": "GUEST", "email": null, "nickname": null } }`
- 매 호출마다 새 익명 계정을 생성(§4 가정 — 게스트→실계정 전환/병합 로직은 클라이언트에 대응 UI가 없어 이번 설계 범위 밖).

#### `POST /api/auth/logout`
- 인증 필요
- 응답 204. 스테이트리스 JWT를 쓰는 한 서버 측 부가 동작은 없어도 되지만(§4), 클라이언트 `logout()` 액션과 대칭을 맞추기 위해 엔드포인트는 유지.

### 3-2. 사용자

#### `GET /api/users/me`
- 응답 200: `{ "id": string, "provider": string, "email": string | null, "nickname": string | null }`
- §4 가정 항목 — settings.tsx가 지금은 이 데이터를 쓰지 않고 하드코딩된 이름을 표시 중이므로, 클라이언트 연결은 후속 작업.

### 3-3. Bunch

#### `GET /api/bunches`
- 응답 200: `Bunch[]` (created_at DESC — `addBunch`가 새 항목을 배열 맨 앞에 넣는 클라이언트 동작과 동일한 정렬)

```ts
interface Bunch {
  id: string; name: string; detail: string; unitLabel: string;
  total: number; filled: number; periodDays: number;
  createdAt: string; fillDates: string[];
  completedAt?: string; completions: number;
}
```

#### `GET /api/bunches/{id}`
- 응답 200: `Bunch` / 404

#### `POST /api/bunches`
- 요청: `{ "name": string, "unitLabel": string, "total": number, "periodDays": number }`
- 응답 201: `Bunch`
- 서버 로직(클라이언트 `addBunch`와 동일하게 이식):
  - `id`: 서버 생성(§4)
  - `detail` = `unitLabel`이 비어있지 않으면 `"한 알 = ${unitLabel}"`, 아니면 `""` — **서버가 파생**(클라이언트 입력 필드에 없는 값이라 클라이언트가 보내는 게 아니라 서버가 동일 공식으로 계산)
  - `filled = 0`, `createdAt = now`, `fillDates = []`, `completions = 0`, `completedAt = null`

#### `PATCH /api/bunches/{id}/fill`
- 요청: `{ "filled": number }`
- 응답 200: `Bunch`
- 서버 로직(클라이언트 `applyFilled` 그대로 이식 — 게이팅 로직 추가 금지, 클램프만 유지):
  1. `clamped = max(0, min(total, filled))`
  2. `gained = clamped - 기존 filled`가 양수면 `fill_date = today` 행을 **`gained` 건** append(늘어난 알 수만큼 — 한 번에 3알 늘면 3건. 클라이언트 `applyFilled`와 동일). 감소 시에는 기존 행을 지우지 않음
  3. `clamped === total`이면 `completedAt`을 기존 값 유지 또는 `now`로 세팅, 아니면 `completedAt = null`(총량 밑으로 다시 내려가면 완성 해제)

#### `POST /api/bunches/{id}/replant` — "같은 송이 다시 심기"
- 요청: `{}`
- 응답 200: `{ "harvest": Harvest, "bunch": Bunch }`
- 트랜잭션: `harvests`에 스냅샷 insert(`fillDates = []` — row가 살아남아 계속 누적하므로 스냅샷엔 날짜를 담지 않음, 중복 집계 방지) + 같은 `bunches` row를 `filled=0, completedAt=null, createdAt=now, completions=completions+1`로 갱신(row·`fill_events` 모두 삭제되지 않음, `fillDates`는 사이클을 넘어 누적).

#### `POST /api/bunches/{id}/archive` — "보관함에서 확인하기"
- 요청: `{}`
- 응답 200: `{ "harvest": Harvest }`
- 트랜잭션: `harvests`에 스냅샷 insert(`fillDates = 원본 bunch의 fillDates 전체`) + 해당 `bunches` row 삭제. **`fill_events` 행은 삭제하지 않고 harvest로 재귀속**(§5) — 통계가 보관 후에도 이 날짜들을 계속 세야 하므로.

> **왜 하나의 엔드포인트(모드 파라미터)로 안 합쳤나**: 두 버튼은 "송이가 살아남는가/사라지는가"라는 상호배타적이고 되돌릴 수 없는 결과를 만든다. 하나의 `POST /bunches/{id}/harvest`에 `{mode: "replant"|"archive"}`를 넣는 방식은, 클라이언트 버그나 잘못된 값 하나로 사용자의 진행 중 송이가 조용히 삭제될 수 있는 위험을 만든다. 두 화면 버튼과 1:1 대응하는 의도가 분명한 엔드포인트로 분리하는 편이 오조작 위험이 낮고 각 트랜잭션도 단일 책임으로 단순해진다.

#### `DELETE /api/bunches/{id}`
- 응답 204 (진행 중 송이 상세 화면의 삭제 확인 모달)

### 3-4. Harvest

#### `GET /api/harvests`
- 응답 200: `Harvest[]` (harvested_at DESC)

```ts
interface Harvest {
  id: string; sourceBunchId: string; name: string; count: number; harvestedAt: string;
  fillDates: string[];   // archive: 원본 Bunch.fillDates 전체를 이관 / replant: []. recall이 새 Bunch로 복원
}
```

#### `GET /api/harvests/{id}`
- 응답 200: `Harvest` / 404

#### `DELETE /api/harvests/{id}`
- 응답 204

#### `POST /api/harvests/{id}/recall`
- 요청: `{ "filled": number }`
- 응답 200: `Bunch` (새로 생성된 활성 송이)
- 트랜잭션: 해당 `harvests` row 삭제 + `bunches`에 새 row insert:
  - `id`: 새로 생성(원본 `sourceBunchId`를 재사용하지 않음 — 클라이언트 주석과 동일 이유: 그 id는 이미 전혀 다른 사이클을 돌고 있을 수 있음)
  - `name = harvest.name`, `total = harvest.count`, `filled = clamp(0, harvest.count, 요청값)`
  - `fillDates = harvest.fillDates` — 보관 시 이관해 둔 채움 이력을 그대로 복원(`fill_events`를 새 bunch_id로 재귀속). 클라이언트 `recallHarvest`도 응답이 비면 로컬 스냅샷으로 폴백
  - `detail = ""`, `unitLabel = ""`, `periodDays = 0`, `completions = 0` — 하베스트 스냅샷에 없던 필드라 복원 불가(명시적으로 빈 값)

### 3-5. 설정

#### `GET /api/settings`
- 응답 200: `NotificationSettings`

```ts
interface NotificationSettings {
  dailyReminder: boolean; reminderTime: string; fillSound: boolean;
}
```

#### `PATCH /api/settings`
- 요청: `Partial<NotificationSettings>`
- 응답 200: 갱신된 전체 `NotificationSettings`

---

## 4. 스캔만으로 판단이 안 서서 가정한 부분

- **DB 종류**: 클라이언트 코드로는 알 수 없음. PostgreSQL을 가정(Spring Boot/JPA 조합에서 흔한 선택). MySQL로 바뀌어도 스키마 구조 자체는 그대로 적용 가능.
- **ID 전략**: 클라이언트 `nextId()`는 `"bunch_<timestamp>_<counter>"` 형태의 로컬 임시 id일 뿐 서버 PK로 쓰기 부적합. 서버가 UUID(문자열)를 새로 발급하는 것으로 가정 — 타입은 여전히 `string`이라 클라이언트 타입 정의를 바꿀 필요는 없음.
- **인증 방식/토큰 종류**: `loginContinue`가 Google/카카오 버튼 양쪽에서 동일하게 호출되는 스텁이라 실제 OAuth SDK 연동이 클라이언트에 전혀 없음. 표준적인 방식(Google ID Token 검증, 카카오 Access Token 검증 후 서버가 자체 JWT 발급)으로 가정했고, 리프레시 토큰 유무·만료 정책 등은 정해지지 않음.
- **게스트 계정의 실계정 전환/병합**: 클라이언트에 게스트 데이터를 로그인 계정으로 옮기는 액션/화면이 전혀 없음. 이번 설계에서는 게스트도 독립된 서버 계정으로만 다루고, 병합 플로우는 설계하지 않음(향후 필요 시 별도 논의).
- **`detail` 필드의 소유권**: `bunch/new.tsx`에 `detail` 입력 UI가 없고 store가 `unitLabel`로부터 파생시킴. 서버가 동일 공식으로 파생시키는 걸로 가정(클라이언트가 `detail`을 요청 바디로 보내지 않음).
- **`GET /api/users/me`의 실사용 여부**: settings 화면의 이름/이메일이 하드코딩이라 store에도 해당 selector가 없음. 서버 쪽엔 필요할 것으로 보여 엔드포인트만 추가했고, 클라이언트에서 이걸 실제로 소비하도록 연결하는 작업은 이번 서버 설계 범위 밖(후속 클라이언트 작업).
- **`addOneGrape`**: store에 정의는 있지만 어떤 화면도 호출하지 않는 죽은 코드로 판단, 별도 엔드포인트를 만들지 않음. 향후 이 액션이 실제로 쓰이게 되어도 `PATCH /bunches/{id}/fill`로 충분히 커버됨.
- **회원탈퇴**: settings 화면에 버튼만 있고 연결된 액션이 없어(죽은 UI) 계정 삭제 API를 이번 명세에서 제외.
- **알림 발송/예약 로직**: `reminderTime`은 `"저녁 9:00"` 같은 자유 문자열이며 실제 스케줄링/푸시 로직이 클라이언트에 없음(AGENTS.md에도 푸시 알림은 이번 단계 스코프 아님으로 명시). 서버도 값만 저장하고 별도 스케줄러/알림 발송은 설계하지 않음.

---

## 5. DB 스키마 (PostgreSQL 기준, Spring Boot/JPA 매핑 고려)

```
users
──────────────────────────────────────────────
id                 UUID          PK
provider           VARCHAR(20)   NOT NULL          -- 'GOOGLE' | 'KAKAO' | 'GUEST'
provider_user_id   VARCHAR(255)  NULL              -- 게스트는 NULL
email              VARCHAR(255)  NULL
nickname           VARCHAR(100)  NULL
created_at         TIMESTAMPTZ   NOT NULL DEFAULT now()

UNIQUE (provider, provider_user_id)   -- provider_user_id가 NULL인 게스트 행끼리는
                                       -- 유니크 제약에 걸리지 않음(Postgres는 NULL을 서로 다른 값으로 취급)
```

```
bunches
──────────────────────────────────────────────
id                 UUID          PK
user_id            UUID          NOT NULL, FK → users.id ON DELETE CASCADE
name               VARCHAR(100)  NOT NULL
detail             VARCHAR(255)  NOT NULL DEFAULT ''
unit_label         VARCHAR(100)  NOT NULL DEFAULT ''
total              INTEGER       NOT NULL
filled             INTEGER       NOT NULL DEFAULT 0
period_days        INTEGER       NOT NULL DEFAULT 0   -- 0 = 기간 없음
created_at         TIMESTAMPTZ   NOT NULL
completed_at       TIMESTAMPTZ   NULL
completions        INTEGER       NOT NULL DEFAULT 0

INDEX (user_id)
```

```
fill_events                                        -- Bunch/Harvest 의 fillDates[] 를 정규화한 append-only 로그
──────────────────────────────────────────────
id                 BIGINT        PK, GENERATED ALWAYS AS IDENTITY
bunch_id           UUID          NULL, FK → bunches.id  ON DELETE CASCADE
harvest_id         UUID          NULL, FK → harvests.id ON DELETE CASCADE
fill_date          DATE          NOT NULL          -- toDateKey() 형식(YYYY-MM-DD)과 동일
created_at         TIMESTAMPTZ   NOT NULL DEFAULT now()   -- 정렬용, 응답에는 노출 안 함

CHECK (num_nonnulls(bunch_id, harvest_id) = 1)     -- 정확히 한쪽에만 귀속
INDEX (bunch_id, created_at), INDEX (harvest_id, created_at)
```
- 한 행 = 한 번의 "채움 증가" 이벤트. `Bunch.fillDates`는 `WHERE bunch_id=?`, `Harvest.fillDates`는 `WHERE harvest_id=?`로 `ORDER BY created_at ASC` 재구성.
- 한 날짜가 여러 행일 수 있음: 늘어난 알 1개당 1행이라 하루에 여러 알을 채우면 그 날짜가 여러 번 들어간다. 서버는 이벤트를 있는 그대로 내려주고 중복 필터링은 하지 않는다 — `records.tsx`가 `bunches`+`harvests`의 `fillDates`를 병합한 뒤, 캘린더/스트릭은 `Set`으로 고유 날짜만, "N월에 M알"/주 평균은 중복 유지 배열(=채운 알 수)로 각각 계산한다.
- 귀속 이동:
  - `/archive` → 해당 이벤트를 `bunch_id=NULL, harvest_id=<새 harvest>`로 UPDATE(삭제 아님), 그 뒤 `bunches` row 삭제.
  - `/recall` → `harvest_id=NULL, bunch_id=<새 bunch>`로 UPDATE, 그 뒤 `harvests` row 삭제.
  - `/replant` → 이동 없음. `bunches` row가 살아있어 이벤트도 그 bunch에 계속 누적(클라이언트 "수확해도 초기화 안 됨"과 동일). replant harvest에는 이벤트를 만들지 않음.
  - `DELETE /bunches/{id}`(완성 전 폐기) → 연쇄 삭제(그 송이는 harvest를 남기지 않으므로 이력도 사라지는 게 맞음).

```
harvests
──────────────────────────────────────────────
id                 UUID          PK
user_id            UUID          NOT NULL, FK → users.id ON DELETE CASCADE
source_bunch_id    VARCHAR(64)   NOT NULL          -- FK 제약 없는 일반 컬럼(이유는 아래)
name               VARCHAR(100)  NOT NULL
count              INTEGER       NOT NULL
harvested_at       TIMESTAMPTZ   NOT NULL

INDEX (user_id)
```

```
user_settings                                      -- users와 1:1
──────────────────────────────────────────────
user_id            UUID          PK, FK → users.id ON DELETE CASCADE
daily_reminder     BOOLEAN       NOT NULL DEFAULT true
reminder_time      VARCHAR(20)   NOT NULL DEFAULT '저녁 9:00'   -- 자유 문자열, LocalTime 아님(§4)
fill_sound         BOOLEAN       NOT NULL DEFAULT true
```

### `harvests.source_bunch_id`를 하드 FK로 안 만든 이유

요구사항은 "원본 `Bunch`가 삭제돼도 `sourceBunchId` **값 자체는 유지**"다(클라이언트 `Harvest` 타입 주석: "keeps `sourceBunchId` pointing at an id that may no longer resolve"). 두 선택지를 검토:

1. **`ON DELETE SET NULL`(하드 FK)** — 기각. 원본이 삭제되는 순간 컬럼값이 `NULL`로 지워지는데, 이는 "값을 유지"하라는 요구사항과 정반대다. 클라이언트는 명시적으로 "resolve되지 않는 채로 매달린 id"를 계속 들고 있길 원하지, 참조를 잃는 걸 원하지 않는다.
2. **애플리케이션 레벨 관리(FK 제약 없는 일반 컬럼) — 채택**. `source_bunch_id`를 `bunches.id`를 참조하는 순수 값 컬럼으로 두면, 원본이 삭제돼도 이 컬럼은 DB가 손대지 않아 원래 값을 그대로 보존한다. 참조 무결성(원본이 실제로 존재하는지)은 어차피 클라이언트도 검사하지 않고 그냥 고아 참조를 허용하는 설계이므로, DB 레벨에서도 강제할 이유가 없다.

---

## 6. 참고 — 클라이언트 그대로 옮기지 않은 부분

- `bunches`/`harvests` 리스트는 여전히 완전히 분리된 두 테이블. `completions`(1:N 반복 수확), 축약 스냅샷(`detail`/`unitLabel`/`periodDays` 없음), 고아 참조 허용 — AGENTS.md와 클라이언트 타입 주석에 명시된 근거를 그대로 스키마에 반영했습니다. 단 `fillDates`는 예외로 `Harvest`도 보유합니다: archive 시 원본 `Bunch.fillDates`를 이관해 통계(스트릭/히트맵/주 평균)가 보관 후에도 그 날짜들을 계속 세도록 하고, recall 시 새 `Bunch`로 되돌립니다. replant harvest는 `[]`.
- 스트릭/히트맵/주 평균 계산은 서버에 옮기지 않았습니다. `lib/stats.ts`가 순수 함수로 클라이언트에만 존재하고, 서버는 `bunches`/`harvests` 양쪽의 `fillDates` 배열만 정확히 복제해 내려주면 됩니다(집계 API 불필요). 클라이언트가 두 배열을 병합·중복 제거합니다.
