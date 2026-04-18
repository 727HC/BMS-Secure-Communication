---
title: "UI 레퍼런스"
date: 2026-04-06
tags: [design, reference, ui]
doc_type: reference
---
# UI 레퍼런스

## 현재 활성 레퍼런스

### EV Data Interface (Envato)
- **파일**: `C:\Users\heechan\Desktop\electric-vehicle-data-interface-hero-section-2023-12-27-18-17-19-utc`
- **스타일**: 라이트 그레이 배경, 원형 게이지, 2×2 카드 그리드
- **폰트**: SF Pro Display + IBM Plex Sans
- **핵심 특징**: 계기판 느낌, 데이터 밀도 높음, 깔끔한 라인 차트
- **적용 범위**: 대시보드 레이아웃 참고 (완전 복제 X, 느낌 참고)
- **교훈**: 레퍼런스를 "느낌만 참고"하면 결과가 달라짐. 구체적 요소(카드 내부 구조, 차트 유형)를 명시해야 함

## 디자인 방향

### 확정된 원칙
1. **가독성 최우선** — 본문 14px 이상, 충분한 명암비
2. **데이터 밀도** — 빈 카드 금지, 내용이 카드를 채워야 함
3. **블루 톤 통일** — 대문(#1769e0, #00a8ff)과 내부 페이지 색감 일치
4. **사이드바 네비게이션** — 좌측 64px 아이콘 사이드바
5. **Pretendard 한글** — 한글 텍스트는 Pretendard Variable

### 시도했으나 실패한 방향
- Dark 테마 (Industrial Precision Dark) → 전환 완료 후 Light로 재전환
- Editorial Monumentalism (#1a1814 + #c8ff00) → generic AI 패턴
- 다크 배경 카드 (Ovation 스타일) → 가독성 최악
- 무리한 SVG 차트 (데이터 없는 차트는 빈 느낌)
