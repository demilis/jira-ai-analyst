# Jira AI Analyst

## 프로젝트 개요

**Jira AI Analyst**는 Jira API를 통해 실시간 데이터를 직접 분석하여, AI가 자동으로 핵심 내용을 요약하고 실행 가능한 조치 항목을 제안해주는 웹 애플리케이션입니다. 복잡한 이슈 목록을 빠르게 파악하고 프로젝트의 병목 현상이나 중요한 트렌드를 발견하는 데 도움을 줍니다.

## 주요 기능

- **실시간 Jira 데이터 연동:** Jira API 토큰을 사용하여 실시간으로 프로젝트 데이터를 가져옵니다.
- **AI 기반 리포트 생성:**
  - **전체 요약:** 전체 이슈 수, 상태별 분포, 주요 동향 및 병목 현상 요약
  - **주요 조치 항목:** 우선순위가 높은 3~5개의 핵심 실행 과제 제안
  - **개별 이슈 분석:** 각 이슈에 대한 짧은 요약 및 AI 추천 사항 제공
- **고급 맞춤 분석:** 사용자는 10가지의 분석 예시(예: '5월에 해결된 이슈') 중에서 선택하거나, **'지난 주에 생성된 결함'과 같은 자연어**를 직접 입력하여 분석 관점을 설정할 수 있습니다. AI는 날짜, 키워드, 담당자 등을 종합적으로 이해하여 매우 구체적이고 심도 있는 리포트를 생성합니다.

## 앱 아키텍처 (동작 방식)

이 애플리케이션은 역할과 책임이 명확하게 분리된 3개의 계층으로 구성됩니다. 이 구조와 함께, AI와 통신하는 방식인 **MCP(Model Context Protocol)** 를 이해하면 전체 시스템을 쉽게 파악할 수 있습니다.

### 1. Client (프론트엔드 - `src/app/page.tsx`)

- **역할:** 사용자와의 모든 상호작용을 담당하는 UI(User Interface) 계층입니다.
- **동작:**
    - 사용자는 웹 브라우저에서 Jira 접속 정보, 프로젝트 키, 분석 관점 등을 입력합니다.
    - '리포트 생성' 버튼을 클릭하면, 입력된 정보를 백엔드(App Server)로 전송하여 분석을 요청합니다.
    - 분석이 완료되면 백엔드로부터 최종 리포트(JSON 형식)를 받아 사용자에게 시각적으로 보여줍니다.

### 2. App Server (백엔드 - Next.js)

- **역할:** Client의 요청을 받아 핵심 로직을 수행하고 외부 서비스와 통신하는 중간 계층입니다.
- **동작:**
    - **Jira 데이터 요청 (`src/services/jira-service.ts`):** Client의 요청에 따라 Jira 서버의 REST API를 호출하여 분석에 필요한 원본 이슈 데이터를 가져옵니다.
    - **AI 분석 요청 및 MCP (`src/ai/flows/jira-report-flow.ts`):** 앱의 가장 핵심적인 부분입니다. Jira에서 가져온 데이터를 AI에게 그냥 던져주는 것이 아니라, **MCP(Model Context Protocol)** 라는 명확한 '문맥 규약'을 사용하여 AI와 통신합니다.

### 3. External Services (외부 서비스)

- **Jira 서버:** 이슈 데이터의 원천 소스입니다. App Server의 요청에 따라 데이터를 제공합니다.
- **Google AI (Genkit):** App Server의 요청을 받아, MCP에 정의된 대로 데이터를 분석하고 결과를 생성하는 지능형 서비스입니다.

---

### AI 통신 규약: Model Context Protocol (MCP) 란?

MCP는 거창한 기술이 아니라, **우리 앱이 AI에게 원하는 작업을 정확하게 전달하기 위한 약속(프로토콜)** 입니다. 이 규약은 `src/ai/flows/jira-report-flow.ts` 파일 내부의 `jiraReportPrompt` 객체를 통해 구체적으로 정의되며, 주로 다음 요소들을 포함합니다.

-   **AI의 역할 (Persona):** AI에게 어떤 전문가 역할을 수행할지 지정합니다. (예: "너는 최고의 프로젝트 관리 전문가야.")
-   **작업 지시 (Instruction):** 분석해야 할 데이터와 수행할 작업을 명시합니다. (예: "이 데이터를 바탕으로 동향과 병목 현상을 요약해줘.")
-   **데이터 문맥 (Data Context):** `jira-service`가 가져온 실제 Jira 데이터를 AI에게 제공합니다.
-   **출력 형식 (Output Schema):** AI가 결과를 어떤 JSON 구조로 반환해야 하는지 Zod 스키마를 통해 명확하게 정의합니다. (예: `{ "summary": "...", "priorityActions": [...] }`)

이 MCP 덕분에 AI는 우리가 원하는 맥락 안에서, 우리가 원하는 형식대로 정확한 결과물을 생성할 수 있습니다.

## 주요 기술 스택

- **프레임워크:** Next.js (App Router), React
- **UI:** ShadCN, Tailwind CSS
- **AI:** Genkit, Google Gemini

## 프로젝트 소스 코드 다운로드 (로컬 개발 준비)

Firebase 환경에서 개발 중인 소스 코드를 당신의 PC로 가져와야 로컬 실행이 가능합니다. 이 과정은 보통 Git이라는 버전 관리 시스템을 통해 이루어집니다.

### 1단계: Git 설치
만약 당신의 PC에 Git이 설치되어 있지 않다면, 먼저 설치해야 합니다.
- [공식 Git 웹사이트](https://git-scm.com/downloads)로 이동하여 당신의 운영체제(Windows, Mac 등)에 맞는 버전을 다운로드하고 설치하세요.

### 2단계: 소스 코드 주소(URL) 찾기
이 프로젝트의 소스 코드가 저장된 원격 저장소(예: GitHub, GitLab)의 주소가 필요합니다.
- 보통 프로젝트의 GitHub 페이지에 방문하면, 초록색 **`< > Code`** 버튼이 있습니다.
- 이 버튼을 누르면 나오는 `HTTPS` 주소를 복사하세요. 이 주소가 바로 당신이 사용할 소스 코드 주소입니다.

### 3단계: 소스 코드 다운로드 (Clone)
이제 터미널(명령 프롬프트 또는 PowerShell)을 열고, 코드를 저장하고 싶은 폴더로 이동한 뒤 아래 명령어를 실행하세요.

```bash
git clone 복사한_주소를_여기에_붙여넣으세요
```

예를 들어, 주소가 `https://github.com/user/jira-ai-analyst.git` 라면 아래와 같이 입력합니다.
```bash
git clone https://github.com/user/jira-ai-analyst.git
```
명령을 실행하면 현재 위치에 `jira-ai-analyst` 라는 이름의 폴더가 생성되고, 그 안에 모든 소스 코드가 다운로드됩니다. 이제 `cd jira-ai-analyst` 명령어로 폴더에 들어간 후, 다음 단계인 '로컬에서 실행하기'를 계속 진행할 수 있습니다.

## 로컬에서 실행하기 (내부망 Jira 접속용)

만약 분석하려는 Jira 서버가 회사 내부망(VPN)에서만 접근 가능한 경우(예: `http://jira.company.com`), 이 앱을 당신의 PC(로컬 환경)에서 직접 실행해야 합니다. 아래의 간단한 절차를 따라주세요.

### 사전 준비
1.  **Node.js 설치:** PC에 Node.js (버전 18 이상)가 설치되어 있어야 합니다.
2.  **Google AI API 키 발급:** [Google AI Studio](https://aistudio.google.com/app/apikey?hl=ko)에서 API 키를 발급받으세요.

### 실행 절차
1.  **프로젝트 폴더 열기:** 터미널(명령 프롬프트)을 열고 이 프로젝트 폴더로 이동하세요. (위의 '소스 코드 다운로드'를 마쳤다면 `cd jira-ai-analyst` 명령어를 사용하세요.)
2.  **필요한 패키지 설치:** 아래 명령어를 실행하여 앱 구동에 필요한 모든 라이브러리를 설치합니다.
    ```bash
    npm install
    ```
3.  **API 키 설정:**
    *   프로젝트의 최상위 폴더에 `.env.local` 이라는 새 파일을 만드세요.
    *   파일을 열고, 발급받은 Google AI API 키를 아래와 같은 형식으로 추가한 뒤 저장하세요.
    ```
    GOOGLE_API_KEY=여기에_당신의_API_키를_붙여넣으세요
    ```
4.  **앱 실행:** 아래 명령어를 실행하여 로컬 개발 서버를 시작합니다.
    ```bash
    npm run dev
    ```
5.  **앱 접속:** 웹 브라우저를 열고 `http://localhost:3000` 주소로 접속하세요. 이제 앱이 당신의 PC에서 실행되므로, 회사 내부 Jira 서버에도 정상적으로 접근할 수 있습니다.

## 배포 가이드 (Firebase App Hosting)

이 애플리케이션은 Firebase App Hosting을 사용하여 쉽게 웹에 배포할 수 있습니다. (단, 배포된 앱은 공개 인터넷에서 접근 가능한 Jira 서버만 분석할 수 있습니다.)

### 사전 준비

1.  **Firebase 프로젝트 생성:** 아직 없다면 [Firebase 콘솔](https://console.firebase.google.com/)에서 새 프로젝트를 생성하세요.
2.  **Google AI API 키 발급:** [Google AI Studio](https://aistudio.google.com/app/apikey?hl=ko)에서 API 키를 발급받으세요.

### 배포 절차

1.  **API 키를 Secret으로 등록:**
    *   **가장 중요한 단계입니다.** 발급받은 Google AI API 키는 코드에 직접 넣으면 안 됩니다. Firebase App Hosting의 Secret Manager에 안전하게 저장해야 합니다.
    *   Firebase 콘솔에서 App Hosting 대시보드로 이동한 후, '설정' 탭에서 `GOOGLE_API_KEY`라는 이름으로 당신의 API 키 값을 Secret으로 추가하세요.

2.  **GitHub 리포지토리 연결:**
    *   Firebase App Hosting 대시보드에서 앱의 GitHub 리포지토리를 연결합니다.
    *   배포할 브랜치(예: `main` 또는 `master`)를 선택합니다.

3.  **자동 배포:**
    *   리포지토리가 연결되면, 해당 브랜치에 코드를 푸시(push)할 때마다 Firebase가 자동으로 앱을 빌드하고 새로운 버전을 배포합니다.

이제 당신의 Jira AI Analyst가 전 세계 어디서든 접속할 수 있는 웹 앱으로 탄생했습니다!
