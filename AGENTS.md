## 프로젝트 개요
**포도알 채우기** — 피아노 학원 "포도알 스티커판"을 디지털화한 반복/습관 기록 앱.
악기 연습, 다회독, 운동 등 반복 행위를 "포도송이" 단위로 만들어 기록한다.

- **grape-api 서버(Spring Boot)에 연결돼 있다.** 게스트/소셜 로그인 + 개인 데이터 서버 동기화까지가 현재 범위. 전역 상태(`grape-store.tsx`)의 모든 액션이 `src/lib/api.ts`를 통해 실제 API를 호출한다. `setFilled`/삭제/설정은 낙관적(즉시 반영 후 실패 시 `refresh()` 롤백), **생성(`addBunch`)은 서버 응답을 기다린 뒤 상태에 추가**한다 — 클라가 임시 id를 만들지 않으므로 이후 모든 액션이 실제 UUID를 대상으로 한다.
- 소셜 로그인(Google/Kakao)은 **매니지드 워크플로 방식으로 연동 완료**(kkori 앱과 동일한 방식) — 네이티브 로그인 SDK 없이 `expo-auth-session` + `expo-web-browser`로 시스템 브라우저를 띄운다. `loginContinue(provider)`가 `src/lib/social-auth.ts`로 provider 자격증명을 받아 `api.loginWith*`에 넘긴다. 게스트 세션에서 호출하면 현재 access 토큰을 guest-merge 헤더로 함께 보낸다.
  - **Google**: 웹은 implicit `id_token token` 흐름, iOS/Android는 authorization code + PKCE를 클라에서 교환. 어느 플랫폼이든 결과는 idToken 하나 → `POST /api/auth/google`(`aud`는 모든 플랫폼에서 Web 클라이언트 ID). 네이티브 리다이렉트는 reversed-client-ID 스킴(`com.googleusercontent.apps.<id>`)으로 돌아오며 `app.config.ts`가 이 스킴을 Info.plist(iOS)/intent filter(Android, Android 클라이언트 ID 설정 시)에 주입한다.
  - **Kakao**: REST API 키로 authorize URL을 만들고 인앱 브라우저를 띄운다. 웹/네이티브 **모두** authorization code만 얻어 `POST /api/auth/kakao/web`으로 서버가 교환한다(네이티브 access token 경로 없음). 네이티브는 `EXPO_PUBLIC_KAKAO_REDIRECT_URI`(Kakao 콘솔 등록)로 지정한 호스팅 페이지가 code를 `grape://auth/kakao/callback` 딥링크로 되돌린다 — 이 호스팅 페이지가 곧 `src/app/auth/kakao/callback.tsx`가 웹에서 렌더될 때의 동작이다. 웹 로그인이면 같은 라우트가 `store.completeKakaoWebLogin`으로 code를 교환한다. 콜백 라우트는 `_layout.tsx`에서 두 `Stack.Protected` 밖에 둔다(게스트가 인증 상태로 돌아오므로).
  - 네이티브 로그인 SDK가 없어 로그인 코드 자체는 Expo Go에서도 돈다. 단 `app.config.ts`가 주입하는 URL 스킴은 네이티브 빌드(`expo prebuild` / EAS)에서만 반영된다.
- "친구와 함께 보기"(공유) 기능은 여전히 향후 계획 — 미리 구현하거나 대비 코드를 넣지 말 것.

## 기술 스택
**Expo(RN 0.86.2, SDK 57) + expo-router + React Context 상태관리**가 이 프로젝트의 골격  
아래 표 밖의 라이브러리(Zustand, NativeWind, AsyncStorage 등)는 아직 없다.

| 영역 | 선택 | 비고 |
|---|---|---|
| 라우팅 | expo-router (파일 기반) | `<Stack>`/`<Tabs>` 직접 조립 안 함 |
| 소셜 로그인 | `expo-auth-session` + `expo-crypto` + `expo-web-browser` | 네이티브 SDK 없음(kkori와 동일 방식). `app.config.ts`가 env의 Google 클라이언트 ID로 reversed-client-ID URL 스킴을 주입 |
| 상태관리 | React Context (`grape-store.tsx`) | 유일한 전역 상태. Zustand 아님. 액션 = 낙관적 로컬 갱신 + `api.ts` 호출 |
| 서버 통신 | `fetch` 래퍼 (`src/lib/api.ts`) | Bearer 자동 첨부, 401 시 refresh 토큰 로테이션 후 1회 재시도 |
| 토큰 저장 | `expo-secure-store` (네이티브) / `localStorage` (웹) | `src/lib/token-store.ts`. access + refresh |
| 데이터 영속 | grape-api 서버 (PostgreSQL) | 시드 데이터 없음. 로그인 직후 목록 fetch로 초기 상태 구성 |
| 스타일링 | `StyleSheet.create` | NativeWind 안 씀 |
| 애니메이션 | reanimated + worklets | 웹에서 `entering` 버그 있음 → "구현 참고사항" 참고 |
| 아이콘 | lucide-react-native | 뒤로가기=ChevronLeft, 삭제=Trash2 |
| 폰트 | Gowun Batang(타이틀) / Noto Sans KR(본문) | |
| 테스트 | 없음 | 검증은 `npm run lint` + 수동 확인 |
| 환경변수 | `.env.development` / `.env.production` | `EXPO_PUBLIC_API_BASE_URL` — dev `http://localhost:8080`, prod `https://grape.kkori.co.kr`. 소셜 로그인: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`(idToken aud = 서버 `GOOGLE_OAUTH_CLIENT_ID`와 동일) / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`(iOS 전용이라 비어 있음) / `EXPO_PUBLIC_KAKAO_REST_API_KEY`(authorize URL + 서버 code 교환, kkori와 같은 Kakao 앱) / `EXPO_PUBLIC_KAKAO_REDIRECT_URI`(선택 — 웹은 `<origin>/auth/kakao/callback` 기본, 네이티브 dev는 `localhost:8081` 기본, 네이티브 배포는 필수). `eas.json`은 아직 없음 |

> 참고용 웹 프로토타입(.html)이 있지만 실제 구현은 위 RN 스택으로 하며, 마크업이 아닌 색상/간격/레이아웃 값만 가져온다.

## 실행 명령어

```
npx expo start / npm start / npm run android / npm run ios / npm run web / npm run lint
```

## 폴더 구조
**`store/`(전역 상태)와 `lib/`(순수 유틸)를 구분해서 씀** — 상태 있는 로직과 없는 로직을 섞지 말 것.
- `app/` — expo-router 라우트. 파일명 = URL. `(tabs)/`는 URL에 안 나타남
- `components/` — 공유 UI. 파일명 kebab-case, export명 PascalCase
- `constants/` — `theme.ts`(디자인 토큰), `grape-shapes.ts`(포도송이 도형 계산)
- `store/` — 전역 상태. `grape-store.tsx` 하나뿐. 새 전역 상태도 여기 합칠 것(Context 파편화 금지)
- `lib/` — React/상태 비의존 로직: `stats.ts`(순수 함수), `api.ts`(서버 클라이언트), `token-store.ts`(토큰 저장), `social-auth.ts`(`expo-auth-session`/`expo-web-browser` 기반 Google/Kakao OAuth 클라이언트, 플랫폼 분기), `in-app-browser.ts`(KakaoTalk 인앱 브라우저 탈출 유틸, 웹 전용). 서버 호출은 항상 `api.ts`를, 소셜 로그인 호출은 항상 `social-auth.ts`를 거치고 화면에서 직접 부르지 말 것(Kakao 콜백 화면만 `consumeKakaoOauthState`/`hasPendingKakaoWebLogin`/`escapeKakaoTalkInAppBrowser`를 예외적으로 import)
- `types/` — 여러 곳에서 공유하는 타입만 (`grape.ts`). 컴포넌트 전용 props 타입은 그 파일 안에

## 코딩 컨벤션

**색상/여백/폰트는 항상 `theme.ts` 토큰을 통해서만 쓰고, 전역 상태 변경은 항상 `useGrapeStore()` 액션을 통해서만 함.**  

그 외 세부 규칙:
- 파일명 kebab-case / 컴포넌트·타입 PascalCase / 변수·함수 camelCase
- 경로 별칭 `@/*` → `src/*` 사용, 상대경로는 같은 폴더 안에서만
- import 순서: 외부 패키지(react → react-native → 서드파티) → 빈 줄 → `@/*` alias
- 렌더링 전용 컴포넌트는 `XInner` + `export const X = memo(XInner)` 패턴 (`GrapeCell` 참고). 리렌더 빈도 낮은 화면 최상위 컴포넌트는 생략 가능

## 디자인 방향
- 다크 테마 하나만 존재 (라이트 모드 없음).  
- 색상/폰트/여백/둥글기는 전부 `theme.ts`의 `Colors`/`Fonts`/`FontSize`/`Spacing`/`Radius` 토큰을 참조  
- 화면에서 헥스값이나 매직넘버를 직접 쓰지 않음
- 핵심 시각 모티프는 포도알(`GrapeCell`)이며 세 variant(`hero`/`interactive`/`dot`)마다 정해진 간격 값이 있음   
- 새 화면에 포도알을 넣을 때 기존 variant를 재사용하고 gap을 임의로 정하지 말 것. 
- 정확한 수치는 `theme.ts`/`grape-shapes.ts` 참고.

## 데이터 모델
**현재는 `bunches`(진행 중)와 `harvests`(완성 기록)는 서로 독립된 두 리스트**  
하나의 객체가 두 리스트를 오가지 않음 — 완성 시 `Harvest` 스냅샷이 하나 더 쌓일 뿐, 원본 `Bunch`는 상황에 따라 리셋되거나 삭제  
서버(grape-api)도 이 구조를 그대로 유지한다 — `bunches`/`harvests`는 서버에서도 별개 테이블이며, replant/archive/recall이 두 리스트를 오가게 만든다. 클라 타입과 서버 응답 필드명이 camelCase로 1:1 일치하므로 변환 계층은 없다.


```ts
interface Bunch {
  id: string; name: string; detail: string; unitLabel: string;
  total: number; filled: number; periodDays: number; // 0 = 기간 없음
  createdAt: string; fillDates: string[]; // 늘어난 알 1개당 날짜 1항목(한 번에 3알이면 3항목), 수확해도 초기화 안 됨, 감소 시 삭제 안 됨
  completedAt?: string; completions: number;
}

interface Harvest {
  id: string; sourceBunchId: string; // 원본 삭제돼도 값 유지(고아 참조 허용)
  name: string; count: number; harvestedAt: string;
  fillDates: string[]; // archive 시 원본 Bunch.fillDates를 이관받아 보존, recall 시 새 Bunch로 복원
}
```

**완성 시 보관은 자동이다.** `bunch/complete` 진입 즉시 `store.addHarvest`가 1회 실행돼 원본 Bunch를 archive(완전 삭제, `Bunch.fillDates`→`Harvest.fillDates` 이관)한다 — 버튼을 누르지 않고 새로고침해도 가득 찬 송이가 목록에 남지 않는다. 화면은 진입 시점의 Bunch를 `useState`로 스냅샷해 렌더하며, archive 이후 직접 재진입하면 보관함으로 보낸다. 두 버튼은 더 이상 보관하지 않고 이동/재시작만 한다:
- 같은 송이 다시 심기 → 같은 name/unitLabel/total/periodDays로 `store.addBunch`를 호출해 `filled:0`인 **새 Bunch**를 만든다(원본 id·완성 이력과 무관) → 홈으로 이동. 방금 자동 저장된 Harvest는 그대로 남는다
- 보관함에서 확인하기 → 아무 것도 저장하지 않고 보관함으로 이동만
- 보관함에서 되돌리기(recall) → `Harvest.fillDates`를 새로 생성되는 `Bunch.fillDates`로 복원 (`store.recallHarvest`가 서버 응답에 없으면 로컬 스냅샷으로 폴백)

`store.harvestBunch`(replant 엔드포인트)는 이 자동화 이후 호출부가 없다 — 서버 라우트는 남아 있으나 클라에서 안 쓴다.

## 화면 구성
인증 분기는 `_layout.tsx`의 `Stack.Protected`(`isAuthenticated`, 게스트 포함).
- `login.tsx` — 로그인(Google/카카오/게스트). URL은 `/login` — `/`는 `(tabs)/index`(홈) 전용이라 로그인 화면을 `index.tsx`로 두면 `/` 라우트가 충돌해 인증 후 빈 화면이 뜬다. 미인증 시 `/`는 `(tabs)` 가드가 막혀 `/login`으로 자동 폴백된다
- `auth/kakao/callback.tsx` — Kakao authorize 리다이렉트 도착지(웹 전용 렌더). 두 `Stack.Protected` 밖(게스트가 인증 상태로 돌아오므로 가드로 못 막음 → 화면이 직접 `router.replace('/')`로 이탈). 웹 로그인이면 code 교환, 네이티브 로그인이면 code를 `grape://`로 되돌림. code 교환은 마운트당 1회로 가드(같은 code 재교환 시 Kakao KOE320)
- `(tabs)/index.tsx` — 홈: "포도송이 N개"(필터링 없는 `bunches.length`) + 목록 + 새 송이 만들기
- `(tabs)/records.tsx` — 기록: **탭바에서 숨김 처리됨**(`(tabs)/_layout.tsx`의 `<Tabs.Screen name="records" options={{ href: null }} />`). 라우트 파일과 통계 로직(`stats.ts`, store, archive/complete 흐름)은 전혀 건드리지 않았고 `/records` 직접 URL/딥링크로는 정상 진입한다. 재노출하려면 `_layout.tsx`의 해당 항목을 `options={{ title: '기록' }}`으로 되돌리면 된다. 지표 계산은 모두 `bunches[].fillDates` + `harvests[].fillDates`를 병합한 값 기준(archive/recall로 송이가 리스트를 오가도 이력이 유지돼 통계가 0으로 빠지지 않음). **단 병합 배열을 두 가지로 나눠 씀** — 혼용 금지:

  | 변수 | 형태 | 쓰는 곳 | 의미 |
  |---|---|---|---|
  | `mergedFillDates` | 알 1개당 1항목(중복 유지) | 상단 타이틀 `monthCount`("N월에 M알"), `weeklyAverage`에 넘기는 dates | 채운 **알 개수** |
  | `uniqueFillDays` | `Set`으로 고유 날짜만 | 캘린더 `activityDays`, `currentStreak` 입력 | 활동한 **날짜** |

  즉 캘린더 on/off·연속은 고유 날짜 기준, 월별 알 수·주 평균은 알 개수(비-dedup) 기준.
- `(tabs)/archive.tsx` — 보관함: `harvests` 카드 목록. 카드 클릭 시 **`harvest/[id]`로 이동**(원본 `bunch/[id]`가 아님 — 원본은 리셋되어 있어 빈 송이가 보이는 문제 방지)
- `settings.tsx` — 알림/소리/로그아웃 등
- `bunch/new.tsx` — 새 송이 생성 모달
- `bunch/[id].tsx` — 진행 중 송이 상세(채우기/되돌리기/삭제)
- `bunch/complete.tsx` — 완성 축하 화면. 진입 시 자동 archive(위 "데이터 모델" 참고), 두 버튼은 이동/재시작만
- `harvest/[id].tsx` — 수확 상세. `Bunch`를 조회하지 않아 원본이 바뀌어도 항상 수확 당시 모습 유지. 알을 줄이면 `recallHarvest` 동작

## 구현 참고사항 (이유 있는 코드 — 임의로 "정상화"하지 말 것)
- **reanimated `entering` 웹 버그**: 화면 전환 중 요소가 고스트로 남아 `GrapeCell`에서 `Platform.OS === 'web'`일 때 꺼둠
- **웹 그라디언트**: `experimental_backgroundImage` 단독으로는 react-native-web 0.21이 무시해서 안 보임 → 반드시 `theme.ts`의 `gradientBackground()` 헬퍼로 두 속성 동시 설정
- **탭바 아이콘 숨김**: `tabBarIcon: () => null`만으로는 공간이 예약되어 남음 → `tabBarIconStyle`로 0×0 처리 필요
- **탭바 상단 구분선**: `tabBarStyle.borderTopColor`가 웹에서 다른 값에 밀릴 수 있어 테두리는 0으로 없애고 `tabBarBackground`로 직접 그림
- **삭제 아이콘 색**: 화면에 상시 노출될 땐 `Colors.textTertiary`, 삭제 확정 모달의 버튼 안에서만 `Colors.textDanger` — 확정 전 아이콘을 빨갛게 칠하지 말 것
- **Google 네이티브 리다이렉트 스킴**: `grape://`가 아니라 reversed iOS/Android 클라이언트 ID 스킴이어야 함(Google이 커스텀 스킴을 400으로 거부). `social-auth.ts`가 이 스킴을 계산하고 `app.config.ts`가 네이티브에 등록 — 둘 중 하나만 바꾸지 말 것
- **Kakao redirect_uri는 웹/네이티브가 서로 다름**: 웹은 `<origin>/auth/kakao/callback`, 네이티브는 `EXPO_PUBLIC_KAKAO_REDIRECT_URI`(호스팅 bounce 페이지). authorize 요청·서버 code 교환에 쓰는 값이 바이트 단위로 같아야 하므로 `signInWithKakao`가 반환한 `redirectUri`를 그대로 서버로 넘김
- **`social-auth.ts` 최상단 `WebBrowser.maybeCompleteAuthSession()`**: OAuth 리다이렉트로 앱이 다시 열릴 때 대기 중인 세션을 종료시킴 — 지우지 말 것
- **`Harvest.fillDates` 이관/복원**: `store.addHarvest`(archive)는 삭제되는 `Bunch.fillDates`를 harvest로 옮기고, `store.recallHarvest`는 그걸 새 `Bunch`로 되돌린다. 서버도 같은 이관/복원을 하지만, 두 액션은 서버 응답에 `fillDates`가 비어 오면 로컬 값으로 폴백한다(전환기 안전장치이자 낙관적 상태 정확성용) — 이 폴백은 "서버 응답 변환 코드 금지"의 예외. `records.tsx`가 `bunches`+`harvests`의 `fillDates`를 병합 집계하므로 이관을 빼먹으면 통계가 깨진다

## 하지 말 것 (이번 단계 스코프 아님)
- 화면 컴포넌트에서 직접 `fetch` (항상 `store` 액션 → `lib/api.ts` 경유)
- "함께 보기"(공유) 관련 화면·상태·API
- 홈 화면 위젯, 푸시 알림
- `Bunch`/`Harvest`/`NotificationSettings`에 서버 응답 변환 코드 추가 (필드명이 이미 1:1 일치)