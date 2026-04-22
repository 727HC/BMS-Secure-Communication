---
title: "CouchDB JSON Injection 방지 패턴"
date: 2026-04-13
updated: 2026-04-13
tags: [chaincode, security, couchdb, pattern]
doc_type: reference
status: current
---
# CouchDB JSON Injection 방지 패턴

## 문제

Hyperledger Fabric 체인코드에서 CouchDB Rich Query를 `fmt.Sprintf`로 구성하면 JSON injection 가능:

```go
// 취약 코드
queryString := fmt.Sprintf(`{"selector":{"docType":"%s","did":"%s"}}`, docType, did)
```

`did`에 `"bad","$or":[{"docType":{"$gt":""}}]}` 삽입 시 selector 탈출 → RBAC 필터 우회.

## 해결

### 방법 1: sanitizeSelector (현재 적용)

```go
func sanitizeSelector(s string) string {
    s = strings.ReplaceAll(s, `\`, `\\`)
    s = strings.ReplaceAll(s, `"`, `\"`)
    return s
}

queryString := fmt.Sprintf(`{"selector":{"docType":"%s","did":"%s"}}`, docType, sanitizeSelector(did))
```

### 방법 2: json.Marshal (더 안전, 복잡한 쿼리용)

```go
selector := map[string]interface{}{
    "docType": docType,
    "did":     did,
}
selectorJSON, _ := json.Marshal(map[string]interface{}{"selector": selector})
```

## 적용 규칙

- 새 CouchDB 쿼리 추가 시 **반드시** sanitizeSelector 적용
- 사용자/외부 입력이 직접 들어가는 필드: passportId, did, holderDid, credType, recordId
- 내부 상수(docType, msp)는 적용 불필요하지만 방어적 적용 권장
- `fmt.Sprintf`로 JSON 응답 구성도 금지 → `json.Marshal` 사용

## 참고
- [[blockchain/chaincode-security-fixes|전체 수정 이력]]
