# 쇼핑몰 (Shopping Mall)

FakeStoreAPI를 활용한 현대적인 쇼핑몰 웹 애플리케이션입니다.

## 주요 기능

### 사용자 인증
- 회원가입 및 로그인
- 로그인 상태 유지 (localStorage)
- 사용자명 표시

### 상품 관리
- 상품 목록 조회 및 검색
- 카테고리별 필터링
- 상품 상세 정보 조회
- 페이지네이션

### 장바구니
- 장바구니에 상품 추가
- 수량 조정
- 상품 삭제
- 장바구니 비우기
- 일괄 구매

### 구매 기능
- 상품 구매
- 잔액 관리
- 구매 내역 확인

## 기술 스택

- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **Lucide React** - 아이콘
- **FakeStoreAPI** - 백엔드 API

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

### 빌드

```bash
npm run build
```

### 프로덕션 미리보기

```bash
npm run preview
```

## 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── BalanceDisplay.tsx
│   ├── Cart.tsx
│   ├── CategoryFilter.tsx
│   ├── Login.tsx
│   ├── Pagination.tsx
│   ├── ProductCard.tsx
│   ├── ProductDetail.tsx
│   ├── SearchBar.tsx
│   ├── SignUp.tsx
│   ├── Toast.tsx
│   └── LoadingSkeleton.tsx
├── services/            # API 서비스
│   └── api.ts
├── types/               # TypeScript 타입 정의
│   └── product.ts
├── App.tsx              # 메인 앱 컴포넌트
├── main.tsx             # 진입점
└── index.css            # 전역 스타일
```

## 주요 기능 설명

### 검색 및 필터링
- 실시간 검색 (디바운싱 적용)
- 카테고리별 필터링
- 검색어와 카테고리 조합 검색

### 사용자 경험
- 로딩 스켈레톤 UI
- 토스트 메시지 알림
- 이미지 로딩 에러 처리
- 반응형 디자인
- 접근성 개선 (키보드 네비게이션, ARIA 레이블)

### 성능 최적화
- 개발 모드에서만 콘솔 로그 출력
- 이미지 지연 로딩
- 검색 디바운싱
- 효율적인 페이지네이션

## API 연동

이 프로젝트는 [FakeStoreAPI](https://fakestoreapi.com/)를 사용합니다.

### 사용하는 API 엔드포인트
- `GET /products` - 상품 목록
- `GET /products/:id` - 상품 상세
- `GET /products/categories` - 카테고리 목록
- `GET /products/category/:category` - 카테고리별 상품
- `POST /auth/login` - 로그인
- `POST /users` - 회원가입
- `GET /carts/user/:userId` - 장바구니 조회
- `POST /carts` - 장바구니 생성/업데이트
- `DELETE /carts/:id` - 장바구니 삭제

## 라이선스

MIT
