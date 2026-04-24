# 문화원 통합 명함 DB

기존 엑셀 `문화원 DB.xlsx`와 앞으로 모바일에서 촬영할 명함 이미지를 하나의 웹앱에서 함께 관리하기 위한 초기 프로젝트입니다.

현재 들어있는 기능:

- Next.js 기반 관리자/모바일 웹 골격
- 기존 엑셀 `.xlsx` 구조 분석 API
- 명함 이미지 업로드 + OCR 분석 API
- 브라질 포르투갈어 악센트 보정을 위한 OpenAI 후처리 구조
- Supabase용 기본 SQL 스키마
- 통합 연락처 UI 초안

## 1. 지금 제가 해둔 것

- 프로젝트 생성 완료
- 필수 라이브러리 설치 완료
- 환경변수 예시 파일 추가: [`.env.example`](.env.example)
- Supabase SQL 초안 추가: [`supabase/migrations/001_init_contacts.sql`](supabase/migrations/001_init_contacts.sql)
- 엑셀 분석 화면 추가: [`app/import/page.tsx`](app/import/page.tsx)
- 명함 OCR 테스트 화면 추가: [`app/upload/page.tsx`](app/upload/page.tsx)

## 2. 지금 사용자가 해야 할 것

아래 순서대로 하면 됩니다.

### 2-1. Supabase 프로젝트 만들기

1. [Supabase](https://supabase.com/) 로그인
2. `New project` 클릭
3. 프로젝트 이름 입력
4. 데이터베이스 비밀번호 저장
5. 생성 완료까지 대기

### 2-2. Supabase SQL 실행하기

1. Supabase 프로젝트 열기
2. 왼쪽 메뉴에서 `SQL Editor` 클릭
3. 새 쿼리 만들기
4. [`supabase/migrations/001_init_contacts.sql`](supabase/migrations/001_init_contacts.sql) 파일 내용 전체 복사
5. SQL Editor에 붙여넣기
6. `Run` 실행

이 작업이 끝나면 연락처, 행사, 이미지, 명함 OCR, 엑셀 원본 보존용 테이블이 생성됩니다.

### 2-3. Storage 버킷 만들기

Supabase 왼쪽 메뉴에서 `Storage`로 이동해서 아래 3개 버킷을 만듭니다.

- `cards-original`
- `cards-preview`
- `contact-photos`

일단은 `Private`로 만들어 두는 것을 추천합니다.

### 2-4. API 키 준비하기

#### Supabase

`Project Settings -> API`에서 아래 값을 찾습니다.

- `Project URL`
- `anon public key`
- `service_role secret key`

#### Google Vision

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성
3. `Vision API` 활성화
4. `APIs & Services -> Credentials`
5. `Create credentials -> API key`
6. 생성된 키 복사

#### OpenAI

1. [OpenAI Platform](https://platform.openai.com/) 접속
2. API 키 생성
3. 키 복사

### 2-5. `.env.local` 만들기

프로젝트 루트에 `.env.local` 파일을 만들고 아래처럼 넣어주세요.

```bash
NEXT_PUBLIC_SUPABASE_URL=여기에_프로젝트_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key
SUPABASE_SERVICE_ROLE_KEY=여기에_service_role_key
GOOGLE_VISION_API_KEY=여기에_google_vision_api_key
OPENAI_API_KEY=여기에_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
APP_URL=http://localhost:3000
```

## 3. 로컬에서 실행하기

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열면 됩니다.

## 4. 테스트 순서

### 먼저 엑셀 구조 확인

1. `/import` 페이지 열기
2. 기존 `문화원 DB.xlsx` 업로드
3. 시트 수, 헤더 행, 사진 컬럼, 샘플 행 확인

이 단계는 실제 DB 저장 전 점검용입니다.

### 다음으로 OCR 확인

1. `/upload` 페이지 열기
2. 휴대폰으로 명함 촬영 또는 이미지 선택
3. OCR 원문과 구조화 결과 확인
4. 중복 후보 제안 확인

## 5. 이 프로젝트 구조 설명

### 주요 화면

- [`app/page.tsx`](app/page.tsx): 메인 대시보드
- [`app/import/page.tsx`](app/import/page.tsx): 기존 엑셀 구조 분석
- [`app/upload/page.tsx`](app/upload/page.tsx): 모바일 명함 OCR 테스트
- [`app/cards/page.tsx`](app/cards/page.tsx): 통합 연락처 목록 초안
- [`app/cards/[id]/page.tsx`](app/cards/[id]/page.tsx): 연락처 상세 초안

### 주요 서버 코드

- [`app/api/import/excel/route.ts`](app/api/import/excel/route.ts): 엑셀 분석 API
- [`app/api/cards/upload/route.ts`](app/api/cards/upload/route.ts): 명함 OCR 분석 API
- [`lib/import/mapLegacyExcel.ts`](lib/import/mapLegacyExcel.ts): 시트/컬럼 정규화
- [`lib/ocr/googleVision.ts`](lib/ocr/googleVision.ts): Google Vision OCR
- [`lib/ocr/normalizeCard.ts`](lib/ocr/normalizeCard.ts): OpenAI 후처리
- [`lib/contacts/mergeContact.ts`](lib/contacts/mergeContact.ts): 중복 점수 계산

## 6. 현재 상태에서 아직 남은 작업

아직 아래는 다음 단계에서 제가 이어서 붙일 예정입니다.

- Supabase Auth 실제 로그인 화면
- 엑셀 데이터를 DB에 실제 저장하는 이관 로직
- OCR 결과를 `contacts`와 `business_cards`에 실제 저장하는 로직
- 관리자용 중복 검수 화면
- 실제 검색과 수정 기능

## 7. 가장 쉬운 진행 순서

사용자는 지금 딱 두 가지만 먼저 해주면 됩니다.

1. Supabase 프로젝트 만들고 SQL 실행
2. `.env.local` 채우기

그 다음부터는 제가 계속 코드 작업을 이어갈 수 있습니다.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
