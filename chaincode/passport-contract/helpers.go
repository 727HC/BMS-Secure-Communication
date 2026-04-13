package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// txTimestamp returns the transaction timestamp as RFC3339 string.
// Uses GetTxTimestamp() instead of time.Now() for deterministic endorsement across peers.
func txTimestamp(ctx contractapi.TransactionContextInterface) string {
	ts, err := ctx.GetStub().GetTxTimestamp()
	if err != nil || ts == nil {
		return time.Now().UTC().Format(time.RFC3339)
	}
	return time.Unix(ts.Seconds, int64(ts.Nanos)).UTC().Format(time.RFC3339)
}

// sanitizeSelector escapes characters that could break CouchDB JSON selectors
func sanitizeSelector(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `"`, `\"`)
	return s
}

// ============================================================
// RBAC Helpers
// ============================================================

func (c *PassportContract) getClientMSP(ctx contractapi.TransactionContextInterface) (string, error) {
	return ctx.GetClientIdentity().GetMSPID()
}

func (c *PassportContract) requireMSP(ctx contractapi.TransactionContextInterface, allowedMSPs ...string) error {
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}
	for _, allowed := range allowedMSPs {
		if msp == allowed {
			return nil
		}
	}
	return fmt.Errorf("access denied: MSP %s not in allowed list %v", msp, allowedMSPs)
}

// normalizePassport ensures nil slices/maps are initialized (for legacy data compatibility)
func normalizePassport(p *BatteryPassport) {
	if p.RawMaterials == nil {
		p.RawMaterials = []string{}
	}
	if p.RecyclingRates == nil {
		p.RecyclingRates = map[string]float64{}
	}
	if p.MaintenanceLogs == nil {
		p.MaintenanceLogs = []MaintenanceLog{}
	}
	if p.AccidentLogs == nil {
		p.AccidentLogs = []AccidentLog{}
	}
	if p.CorrectionLogs == nil {
		p.CorrectionLogs = []CorrectionLog{}
	}
	if p.RecycledElementContent == nil {
		p.RecycledElementContent = map[string]float64{}
	}
	if p.ExtensionInfo == nil {
		p.ExtensionInfo = map[string]string{}
	}
	if p.RegulatoryEvidenceIds == nil {
		p.RegulatoryEvidenceIds = []string{}
	}
	if p.PhysicalVerification == nil {
		p.PhysicalVerification = &PhysicalVerification{Signals: map[string]bool{}}
	}
}

// mergeSnapshot overlays real-time BMU data from the separate snapshot key onto the passport.
// If no snapshot exists (legacy data), the passport's embedded values are preserved.
func (c *PassportContract) mergeSnapshot(ctx contractapi.TransactionContextInterface, passport *BatteryPassport) {
	snapshotKey, err := ctx.GetStub().CreateCompositeKey("snapshot", []string{passport.PassportID})
	if err != nil {
		return
	}
	snapshotJSON, err := ctx.GetStub().GetState(snapshotKey)
	if err != nil || snapshotJSON == nil {
		return
	}
	var snap BMUSnapshot
	if json.Unmarshal(snapshotJSON, &snap) == nil {
		passport.CurrentSOC = snap.CurrentSOC
		passport.Temperature = snap.Temperature
		passport.StatusFlags = snap.StatusFlags
		passport.TotalDischargeCycles = snap.TotalDischargeCycles
		passport.LastBMUDataID = snap.LastBMUDataID
		if snap.UpdatedAt > passport.UpdatedAt {
			passport.UpdatedAt = snap.UpdatedAt
		}
	}
}

// checkPassportAccess verifies the caller's MSP has permission to view the passport
func (c *PassportContract) checkPassportAccess(ctx contractapi.TransactionContextInterface, passport *BatteryPassport) error {
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	switch msp {
	case mspRegulator:
		return nil // 규제기관: 전체 접근
	case mspManufacturer:
		if passport.CreatorMSP == msp {
			return nil // 자기가 만든 배터리만
		}
	case mspEVManufacturer:
		if passport.VIN != "" && passport.EvBinderMSP == msp {
			return nil // 자기 조직이 바인딩한 배터리
		}
		if passport.Status == "MANUFACTURED" {
			return nil // 미바인딩 여권 조회 허용 (바인딩 대상 탐색용)
		}
	case mspService:
		if passport.Status == "MAINTENANCE" || passport.Status == "ANALYSIS" {
			return nil // 현재 정비/분석 의뢰된 배터리
		}
		// 사후 조회: 과거 정비 이력이 있으면 접근 허용
		for _, log := range passport.MaintenanceLogs {
			if log.OrgMSP == mspService {
				return nil
			}
		}
	}

	return fmt.Errorf("access denied: MSP %s cannot access passport %s", msp, passport.PassportID)
}

// checkCredentialAccess verifies caller can access a credential via its parent passport
func (c *PassportContract) checkCredentialAccess(ctx contractapi.TransactionContextInterface, vc *VerifiableCredential) error {
	passportJSON, err := ctx.GetStub().GetState(vc.PassportID)
	if err != nil {
		return fmt.Errorf("failed to read passport for credential access check: %v", err)
	}
	if passportJSON == nil {
		// passport 삭제된 경우 — 발급자 MSP 또는 규제기관만 허용
		msp, err := c.getClientMSP(ctx)
		if err != nil {
			return fmt.Errorf("failed to get client MSP: %v", err)
		}
		if msp == mspRegulator || msp == vc.IssuerMSP {
			return nil
		}
		return fmt.Errorf("access denied: credential %s has no accessible passport", vc.CredentialID)
	}
	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}
	return c.checkPassportAccess(ctx, &passport)
}

// buildPassportQuery returns a CouchDB selector filtered by caller's MSP
func (c *PassportContract) buildPassportQuery(ctx contractapi.TransactionContextInterface) (string, error) {
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get client MSP: %v", err)
	}

	switch msp {
	case mspRegulator:
		return fmt.Sprintf(`{"selector":{"docType":"%s"}}`, docTypePassport), nil
	case mspManufacturer:
		return fmt.Sprintf(`{"selector":{"docType":"%s","creatorMsp":"%s"}}`, docTypePassport, msp), nil
	case mspEVManufacturer:
		// 본인 바인딩 여권 + 미바인딩(MANUFACTURED) 여권도 조회 가능
		return fmt.Sprintf(`{"selector":{"docType":"%s","$or":[{"vin":{"$gt":""},"evBinderMsp":"%s"},{"status":"MANUFACTURED"}]}}`, docTypePassport, msp), nil
	case mspService:
		// 현재 정비/분석 진행 중 + 과거 정비 이력이 있는 여권도 조회 허용
		return fmt.Sprintf(`{"selector":{"docType":"%s","$or":[{"status":{"$in":["MAINTENANCE","ANALYSIS"]}},{"maintenanceLogs":{"$elemMatch":{"orgMsp":"%s"}}}]}}`, docTypePassport, mspService), nil
	default:
		return "", fmt.Errorf("unknown MSP: %s", msp)
	}
}
