# Phantom Log (팬텀 노트)

**Phantom Log**는 일상 기록, 일정 관리, 목표 설정을 한곳에서 간편하게 처리할 수 있는 웹 애플리케이션입니다.

## 주요 기능

1. **캘린더 & To-Do 관리**
   - 월별 달력 뷰 및 일별 기록 확인
   - 오늘 할 일(To-Do) 등록, 삭제 및 완료 체크 기능
   - 카테고리별 태그 및 태그 관리 기능

2. **글 피드**
   - 자유로운 일상 및 아이디어 기록 피드
   - 작성된 기록들의 타임라인 피드 뷰

3. **목표 & 회고**
   - 월별 목표 설정 및 달성 관리
   - 한 달을 되돌아보는 월간 회고 작성

4. **데이터 백업 & 복원**
   - **JSON 파일 내보내기**: `File System Access API`를 지원하여 기존 백업 파일에 **덮어쓰기** 지원 (미지원 브라우저는 다운로드 처리)
   - **JSON 파일 불러오기**: 기존 백업 데이터를 안전하게 복원

5. **다크 / 라이트 테마**
   - 사용자 취향에 맞춘 깔끔하고 감성적인 다크/라이트 테마 전환

## 기술 스택

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6 Modules)
- **Data Storage**: Browser `LocalStorage`
- **Design System**: CSS Variables (`css/tokens.css`) 기반 모듈화 스타일링

## 프로젝트 구조

```text
phantom-log/
├── index.html            # 메인 HTML 레이아웃
├── style.css             # 모듈화된 CSS Entry Point (@import)
├── css/
│   ├── tokens.css        # 디자인 토큰 (색상, 폰트, 여백 등)
│   ├── layout.css        # 공통 레이아웃 및 탭
│   ├── calendar.css      # 캘린더 및 To-Do 스타일
│   ├── feed.css          # 글 피드 스타일
│   ├── goals.css         # 목표 & 회고 스타일
│   └── modals.css        # 모달, 토스트, 버튼 스타일
└── js/
    ├── app.js            # 메인 애플리케이션 초기화 Entry Point
    └── modules/
        ├── backup.js     # JSON 데이터 백업/복원 (File System Access API)
        ├── calendar.js   # 캘린더 및 To-Do 로직
        ├── feed.js       # 글 피드 로직
        ├── goals.js      # 목표 & 회고 로직
        ├── navigation.js # 탭/서브탭 전환 로직
        ├── notification.js # 토스트 알림 로직
        ├── storage.js    # LocalStorage 상태 관리
        ├── theme.js      # 다크/라이트 테마 설정
        └── utils.js      # 날짜 계산 등 공통 유틸리티
```

## 실행 방법

별도의 빌드 과정 없이 웹 브라우저에서 직접 실행할 수 있습니다.

1. 프로젝트 저장소를 복사(Clone)하거나 다운로드합니다.
2. `index.html` 파일을 브라우저(Chrome, Edge 등)로 실행합니다.
   - Live Server 등의 로컬 웹 서버 환경에서 실행을 권장합니다.

## 데이터 백업 및 복원

- 데이터 백업 시 작성된 글과 첨부 이미지가 포함된 ZIP 파일(`.zip`) 형태로 저장됩니다.
- 다른 기기나 브라우저에서 데이터를 이전/복구하려면, 백업한 ZIP 파일을 다운로드한 뒤 `불러오기` 기능을 통해 데이터를 복원할 수 있습니다.
- 이미지 파일 크기 및 브라우저 성능 최적화를 위해 1년 단위로 나누어 백업하는 것을 권장합니다.