---
title: "디자인 토큰"
date: 2026-04-06
tags: [design, tokens, ui]
doc_type: reference
status: current
---
# 디자인 토큰

## 색상

### Primary
| 이름 | Hex | 용도 |
|------|-----|------|
| Primary Blue | `#1769e0` | 주 액센트, 버튼, 링크 |
| Secondary Blue | `#00a8ff` | 보조 액센트, 호버 |
| Blue Tint | `#e1f3ff` | 배경 틴트 |

### Status
| 상태 | Hex | 용도 |
|------|-----|------|
| Active/Success | `#10b981` | 운행중, 성공 |
| Manufactured | `#3b82f6` | 제조완료 |
| Maintenance | `#f59e0b` | 정비중, 경고 |
| Analysis | `#8b5cf6` | 분석중 |
| Recycling | `#06b6d4` | 재활용 |
| Disposed | `#94a3b8` | 폐기, 비활성 |
| Error | `#ef4444` | 오류, 위험 |

### Neutral
| 이름 | Hex | 용도 |
|------|-----|------|
| Text Primary | `#0f172a` | 본문 제목 |
| Text Secondary | `#64748b` | 보조 텍스트 |
| Text Muted | `#94a3b8` | 힌트, 캡션 |
| Background | `#f5f6f8` | 페이지 배경 |
| Surface | `#ffffff` | 카드, 패널 |
| Border | `rgba(0,0,0,0.06)` | 구분선 |

## 폰트

| 용도 | Font Family | 비고 |
|------|-------------|------|
| Display | Outfit | 제목, 헤딩 |
| Body | Pretendard Variable | 본문, 한글 최적화 |
| Mono | JetBrains Mono | 숫자, 코드, ID |

## 크기 규칙

| 요소 | 최소 크기 | 권장 |
|------|-----------|------|
| 본문 텍스트 | 14px | 14-16px |
| 라벨/캡션 | 12px | 12-13px |
| 카드 제목 | 16px | 16-18px |
| 페이지 제목 | 24px | 24-28px |
| KPI 숫자 | 28px | 32-36px |

## 카드 스타일

```css
background: #ffffff;
border-radius: 16px;
padding: 20px 24px;
box-shadow: 0 1px 3px rgba(0,0,0,0.05);
```

## 금지 사항 (Anti-patterns)

- 다크 배경 카드에 작은 흰 텍스트 (가독성 최악)
- 10px 이하 텍스트
- 빈 공간이 많은 차트/게이지
- 글래스모피즘, 노이즈 텍스처, AI 글로우 효과
- KPI 카드 4개 + 좌측 사이드바 + 상단바 + 카드 반복 패턴
