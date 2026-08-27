## 프로젝트 개요
**포도알 채우기** — 피아노 학원 "포도알 스티커판"을 디지털화한 반복/습관 기록 앱.
악기 연습, 다회독, 운동 등 반복 행위를 "포도송이" 단위로 만들어 기록한다.

- **지금은 1단계: 백엔드 없이 클라이언트 로컬 저장소만으로 완결되는 앱.** 서버/계정/동기화 코드는 넣지 않는다.
- 2단계(친구와 함께 보기 + Spring Boot 백엔드)는 향후 계획일 뿐, 지금 단계에서 미리 구현하거나 대비 코드를 넣지 말 것.

## 기술 스택
**Expo(RN 0.86.2, SDK 57) + expo-router + React Context 상태관리**가 이 프로젝트의 골격  
아래 표 밖의 라이브러리(Zustand, NativeWind, AsyncStorage 등)는 아직 없다.

| 영역 | 선택 | 비고 |
|---|---|---|
| 라우팅 | expo-router (파일 기반) | `<Stack>`/`<Tabs>` 직접 조립 안 함 |
| 상태관리 | React Context (`grape-store.tsx`) | 유일한 전역 상태. Zustand 아님 |
| 저장소 | **없음(미구현)** | 시드 데이터로 시작, 새로고침 시 초기화됨. 영속화는 남은 과제 |
| 스타일링 | `StyleSheet.create` | NativeWind 안 씀 |
| 애니메이션 | reanimated + worklets | 웹에서 `entering` 버그 있음 → "구현 참고사항" 참고 |
| 아이콘 | lucide-react-native | 뒤로가기=ChevronLeft, 삭제=Trash2 |
| 폰트 | Gowun Batang(타이틀) / Noto Sans KR(본문) | |
| 테스트 | 없음 | 검증은 `npm run lint` + 수동 확인 |
| 빌드 설정 | `eas.json`/`.env` 없음 | 빌드 프로필·환경변수 분기 코드 넣지 말 것 |

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
- `lib/` — React/상태 비의존 순수 함수 (`stats.ts` 등)
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
**API 연동 시, 하나의 리스트가 됨 서로 연동이 되고, 완료 상태값에 따라 bunches와 harvests에 자동으로 분류되는 구조로 바뀔 수 있음.**


```ts
interface Bunch {
  id: string; name: string; detail: string; unitLabel: string;
  total: number; filled: number; periodDays: number; // 0 = 기간 없음
  createdAt: string; fillDates: string[]; // 수확해도 초기화 안 됨
  completedAt?: string; completions: number;
}

interface Harvest {
  id: string; sourceBunchId: string; // 원본 삭제돼도 값 유지(고아 참조 허용)
  name: string; count: number; harvestedAt: string;
}
```

완성 시 두 버튼의 차이 (/bunch/complete), 둘 다 Harvest는 추가함:
- 같은 송이 다시 심기 → Bunch를 filled:0, completedAt:undefined로 리셋해 계속 유지 → 홈으로 이동
- 보관함에서 확인하기 → Bunch 완전 삭제 → 보관함으로 이동

## 화면 구성
인증 분기는 `_layout.tsx`의 `Stack.Protected`(`isAuthenticated`, 게스트 포함).
- `index.tsx` — 로그인(Google/카카오/게스트)
- `(tabs)/index.tsx` — 홈: "포도송이 N개"(필터링 없는 `bunches.length`) + 목록 + 새 송이 만들기
- `(tabs)/records.tsx` — 기록: 히트맵/스트릭 등 전부 `bunches.fillDates` 기준 (`harvests`는 날짜 기록이 없어 집계에서 제외)
- `(tabs)/archive.tsx` — 보관함: `harvests` 카드 목록. 카드 클릭 시 **`harvest/[id]`로 이동**(원본 `bunch/[id]`가 아님 — 원본은 리셋되어 있어 빈 송이가 보이는 문제 방지)
- `settings.tsx` — 알림/소리/로그아웃 등
- `bunch/new.tsx` — 새 송이 생성 모달
- `bunch/[id].tsx` — 진행 중 송이 상세(채우기/되돌리기/삭제)
- `bunch/complete.tsx` — 완성 축하 화면, 위 "데이터 모델" 표의 두 버튼
- `harvest/[id].tsx` — 수확 상세. `Bunch`를 조회하지 않아 원본이 바뀌어도 항상 수확 당시 모습 유지. 알을 줄이면 `recallHarvest` 동작

## 구현 참고사항 (이유 있는 코드 — 임의로 "정상화"하지 말 것)
- **reanimated `entering` 웹 버그**: 화면 전환 중 요소가 고스트로 남아 `GrapeCell`에서 `Platform.OS === 'web'`일 때 꺼둠
- **웹 그라디언트**: `experimental_backgroundImage` 단독으로는 react-native-web 0.21이 무시해서 안 보임 → 반드시 `theme.ts`의 `gradientBackground()` 헬퍼로 두 속성 동시 설정
- **탭바 아이콘 숨김**: `tabBarIcon: () => null`만으로는 공간이 예약되어 남음 → `tabBarIconStyle`로 0×0 처리 필요
- **탭바 상단 구분선**: `tabBarStyle.borderTopColor`가 웹에서 다른 값에 밀릴 수 있어 테두리는 0으로 없애고 `tabBarBackground`로 직접 그림
- **삭제 아이콘 색**: 화면에 상시 노출될 땐 `Colors.textTertiary`, 삭제 확정 모달의 버튼 안에서만 `Colors.textDanger` — 확정 전 아이콘을 빨갛게 칠하지 말 것

## 하지 말 것 (이번 단계 스코프 아님)
- 서버 API 호출
- 홈 화면 위젯, 푸시 알림