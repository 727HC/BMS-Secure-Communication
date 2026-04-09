package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// PassportContract provides functions for managing Battery Passport data on the ledger
type PassportContract struct {
	contractapi.Contract
}

// DocType constants
const (
	docTypePassport      = "batteryPassport"
	docTypeBMURecord     = "bmuRecord"
	docTypeBMUSnapshot   = "bmuSnapshot"
	docTypeRawMaterial   = "rawMaterial"
	docTypeVC            = "verifiableCredential"
	docTypeVerification  = "vcVerification"
	docTypeFCReset       = "fcReset"
	defaultPageSize int32 = 100
	maxPageSize     int32 = 500
)

// MSP identity constants
const (
	mspManufacturer   = "ManufacturerMSP"
	mspEVManufacturer = "EVManufacturerMSP"
	mspService        = "ServiceMSP"
	mspRegulator      = "RegulatorMSP"
)

// Credential type → authorized issuer MSPs
var credTypeIssuers = map[string][]string{
	"BATTERY_PASSPORT": {mspManufacturer},
	"BATTERY_HEALTH":   {mspService},
	"MAINTENANCE":      {mspService},
	"COMPLIANCE":       {mspRegulator},
	"RECYCLING":        {mspRegulator},
}

// Field → authorized corrector MSPs (RegulatorMSP can correct all fields)
var fieldCorrectors = map[string][]string{
	// Manufacturer fields
	"model":                  {mspManufacturer, mspRegulator},
	"serialNumber":           {mspManufacturer, mspRegulator},
	"manufacturerName":       {mspManufacturer, mspRegulator},
	"manufactureCountry":     {mspManufacturer, mspRegulator},
	"cellManufacturer":       {mspManufacturer, mspRegulator},
	"cellManufactureCountry": {mspManufacturer, mspRegulator},
	"manufactureDate":        {mspManufacturer, mspRegulator},
	"cellType":               {mspManufacturer, mspRegulator},
	"chemistry":              {mspManufacturer, mspRegulator},
	"voltageRange":           {mspManufacturer, mspRegulator},
	"temperatureRange":       {mspManufacturer, mspRegulator},
	"cellCount":              {mspManufacturer, mspRegulator},
	"weight":                 {mspManufacturer, mspRegulator},
	"totalEnergy":            {mspManufacturer, mspRegulator},
	"energyDensity":          {mspManufacturer, mspRegulator},
	"ratedCapacity":          {mspManufacturer, mspRegulator},
	"expectedLifespan":       {mspManufacturer, mspRegulator},
	"carbonFootprint":        {mspManufacturer, mspRegulator},
	// EV Manufacturer fields
	"vin":               {mspEVManufacturer, mspRegulator},
	"installDate":       {mspEVManufacturer, mspRegulator},
	"evManufacturer":    {mspEVManufacturer, mspRegulator},
	"evAssemblyCountry": {mspEVManufacturer, mspRegulator},
}

// RawMaterial represents a raw material used in battery manufacturing
type RawMaterial struct {
	DocType         string  `json:"docType"`
	MaterialID      string  `json:"materialId"`
	Name            string  `json:"name"`
	Origin          string  `json:"origin"`
	Supplier        string  `json:"supplier"`
	Quantity        float64 `json:"quantity"`
	Unit            string  `json:"unit"`
	CertificationID string  `json:"certificationId"`
	CreatedAt       string  `json:"createdAt"`
	CreatorMSP      string  `json:"creatorMsp"`
}

// MaintenanceLog represents a maintenance event
type MaintenanceLog struct {
	Date        string `json:"date"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Technician  string `json:"technician"`
	OrgMSP      string `json:"orgMsp"`
}

// AccidentLog represents an accident/incident record
type AccidentLog struct {
	Date        string `json:"date"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
	Reporter    string `json:"reporter"`
	OrgMSP      string `json:"orgMsp"`
}

// BatteryPassport - GBA 21 compliant battery passport
type BatteryPassport struct {
	DocType    string `json:"docType"`
	PassportID string `json:"passportId"`
	BatteryID  string `json:"batteryId"`
	DID        string `json:"did"`

	// GBA 21 fields (2-21)
	Model                  string `json:"model"`
	SerialNumber           string `json:"serialNumber"`
	EVManufacturer         string `json:"evManufacturer"`
	EVAssemblyCountry      string `json:"evAssemblyCountry"`
	EvBinderMSP            string `json:"evBinderMsp"`
	ManufacturerName       string `json:"manufacturerName"`
	ManufactureCountry     string `json:"manufactureCountry"`
	CellManufacturer       string `json:"cellManufacturer"`
	CellManufactureCountry string `json:"cellManufactureCountry"`
	ManufactureDate        string `json:"manufactureDate"`
	CellType               string `json:"cellType"`
	Chemistry              string `json:"chemistry"`
	CellCount              int    `json:"cellCount"`
	Weight                 float64 `json:"weight"`
	TotalEnergy            float64 `json:"totalEnergy"`
	EnergyDensity          float64 `json:"energyDensity"`
	RatedCapacity          float64 `json:"ratedCapacity"`
	ExpectedLifespan       int    `json:"expectedLifespan"`
	VoltageRange           string `json:"voltageRange"`
	TemperatureRange       string `json:"temperatureRange"`

	// EV binding
	VIN         string `json:"vin"`
	InstallDate string `json:"installDate"`

	// Raw materials & sustainability
	RawMaterials      []string           `json:"rawMaterials"`
	RecyclingRates    map[string]float64 `json:"recyclingRates"`
	ContainsHazardous bool               `json:"containsHazardous"`
	CarbonFootprint   float64            `json:"carbonFootprint"`

	// Real-time state (updated by BMU data)
	CurrentSOC           float64 `json:"currentSoc"`
	Temperature          uint16  `json:"currentTemperature"`
	StatusFlags          uint8   `json:"currentStatusFlags"`
	CurrentSOH           float64 `json:"currentSoh"`
	SOCE                 float64 `json:"soce"`
	RemainingLifeCycle   int     `json:"remainingLifeCycle"`
	TotalDischargeCycles int     `json:"totalDischargeCycles"`
	LastBMUDataID        string  `json:"lastBmuDataId"`

	// Status & logs
	Status           string           `json:"status"`
	RecycleAvailable bool             `json:"recycleAvailable"`
	MaintenanceLogs  []MaintenanceLog `json:"maintenanceLogs"`
	AccidentLogs     []AccidentLog    `json:"accidentLogs"`

	// Corrections
	CorrectionLogs []CorrectionLog `json:"correctionLogs"`

	// Audit
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
	CreatorMSP string `json:"creatorMsp"`
}

// BMURecord represents a BMU data record
type BMURecord struct {
	DocType         string  `json:"docType"`
	RecordID        string  `json:"recordId"`
	PassportID      string  `json:"passportId"`
	DID             string  `json:"did"`
	DataHash        string  `json:"dataHash"`
	Signature       string  `json:"signature"`
	FC              uint64  `json:"fc"`
	SOC             uint16  `json:"soc"`
	Voltage         float64 `json:"voltage"`
	Current         float64 `json:"current"`
	Temperature     uint16  `json:"temperature"`
	CellCount       uint8   `json:"cellCount"`
	StatusFlags     uint8   `json:"statusFlags"`
	DischargeCycles uint16  `json:"dischargeCycles"`
	Timestamp       string  `json:"timestamp"`
	Status          string  `json:"status,omitempty" metadata:",optional"`
	InvalidatedBy   string  `json:"invalidatedBy,omitempty" metadata:",optional"`
	InvalidatedAt   string  `json:"invalidatedAt,omitempty" metadata:",optional"`
	InvalidReason   string  `json:"invalidReason,omitempty" metadata:",optional"`
	CreatedAt       string  `json:"createdAt"`
	CreatorMSP      string  `json:"creatorMsp"`
}

// BMUSnapshot holds real-time BMU state separated from passport key to avoid MVCC conflicts
type BMUSnapshot struct {
	DocType              string  `json:"docType"`
	PassportID           string  `json:"passportId"`
	CurrentSOC           float64 `json:"currentSoc"`
	Temperature          uint16  `json:"temperature"`
	StatusFlags          uint8   `json:"statusFlags"`
	TotalDischargeCycles int     `json:"totalDischargeCycles"`
	LastBMUDataID        string  `json:"lastBmuDataId"`
	UpdatedAt            string  `json:"updatedAt"`
}

// CorrectionLog represents a data correction event
type CorrectionLog struct {
	Date          string `json:"date"`
	FieldName     string `json:"fieldName"`
	OriginalValue string `json:"originalValue"`
	NewValue      string `json:"newValue"`
	Reason        string `json:"reason"`
	CorrectedBy   string `json:"correctedBy"`
}

// VerifiableCredential represents a VC anchored on Fabric
type VerifiableCredential struct {
	DocType          string `json:"docType"`
	CredentialID     string `json:"credentialId"`
	PassportID       string `json:"passportId"`
	CredType         string `json:"credType"`
	IssuerDID        string `json:"issuerDid"`
	IssuerMSP        string `json:"issuerMsp"`
	HolderDID        string `json:"holderDid"`
	SchemaID         string `json:"schemaId"`
	CredDefID        string `json:"credDefId"`
	DataHash         string `json:"dataHash"`
	Status           string `json:"status"`
	IssuedAt         string `json:"issuedAt"`
	ExpiresAt        string `json:"expiresAt"`
	RevokedAt        string `json:"revokedAt"`
	RevocationReason string `json:"revocationReason"`
}

// CredentialVerification represents a verification event log
type CredentialVerification struct {
	DocType        string `json:"docType"`
	VerificationID string `json:"verificationId"`
	CredentialID   string `json:"credentialId"`
	VerifierDID    string `json:"verifierDid"`
	VerifierMSP    string `json:"verifierMsp"`
	Result         bool   `json:"result"`
	Timestamp      string `json:"timestamp"`
}

// PaginatedVCResult for VC queries
type PaginatedVCResult struct {
	Records  []*VerifiableCredential `json:"records"`
	Bookmark string                  `json:"bookmark"`
	Count    int                     `json:"count"`
}

// PaginatedPassportResult for passport queries
type PaginatedPassportResult struct {
	Records  []*BatteryPassport `json:"records"`
	Bookmark string             `json:"bookmark"`
	Count    int                `json:"count"`
}

// PaginatedBMUResult for BMU record queries
type PaginatedBMUResult struct {
	Records  []*BMURecord `json:"records"`
	Bookmark string       `json:"bookmark"`
	Count    int          `json:"count"`
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

// ============================================================
// 1. RegisterRawMaterial (ManufacturerMSP only)
// ============================================================

func (c *PassportContract) RegisterRawMaterial(ctx contractapi.TransactionContextInterface,
	materialId string, name string, origin string, supplier string,
	quantity string, unit string, certificationId string) error {

	if err := c.requireMSP(ctx, mspManufacturer); err != nil {
		return err
	}

	if materialId == "" || name == "" || origin == "" {
		return fmt.Errorf("materialId, name, origin must not be empty")
	}

	existing, err := ctx.GetStub().GetState(materialId)
	if err != nil {
		return fmt.Errorf("failed to check existing raw material: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("raw material %s already exists", materialId)
	}

	quantityVal, err := strconv.ParseFloat(quantity, 64)
	if err != nil {
		return fmt.Errorf("invalid quantity value: %v", err)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	now := time.Now().UTC().Format(time.RFC3339)

	material := RawMaterial{
		DocType:         docTypeRawMaterial,
		MaterialID:      materialId,
		Name:            name,
		Origin:          origin,
		Supplier:        supplier,
		Quantity:        quantityVal,
		Unit:            unit,
		CertificationID: certificationId,
		CreatedAt:       now,
		CreatorMSP:      msp,
	}

	materialJSON, err := json.Marshal(material)
	if err != nil {
		return fmt.Errorf("failed to marshal raw material: %v", err)
	}

	return ctx.GetStub().PutState(materialId, materialJSON)
}

// ============================================================
// 2. CreateBatteryPassport (ManufacturerMSP only)
// ============================================================

func (c *PassportContract) CreateBatteryPassport(ctx contractapi.TransactionContextInterface,
	passportId string, batteryId string, did string,
	model string, serialNumber string,
	manufacturerName string, manufactureCountry string,
	cellManufacturer string, cellManufactureCountry string,
	manufactureDate string, cellType string, chemistry string,
	cellCount string, weight string, totalEnergy string,
	energyDensity string, ratedCapacity string, expectedLifespan string,
	voltageRange string, temperatureRange string,
	carbonFootprint string) error {

	if err := c.requireMSP(ctx, mspManufacturer); err != nil {
		return err
	}

	if passportId == "" || batteryId == "" || did == "" {
		return fmt.Errorf("passportId, batteryId, did must not be empty")
	}

	existing, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to check existing passport: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("passport %s already exists", passportId)
	}

	cellCountVal, err := strconv.Atoi(cellCount)
	if err != nil {
		return fmt.Errorf("invalid cellCount value: %v", err)
	}

	weightVal, err := strconv.ParseFloat(weight, 64)
	if err != nil {
		return fmt.Errorf("invalid weight value: %v", err)
	}

	totalEnergyVal, err := strconv.ParseFloat(totalEnergy, 64)
	if err != nil {
		return fmt.Errorf("invalid totalEnergy value: %v", err)
	}

	energyDensityVal, err := strconv.ParseFloat(energyDensity, 64)
	if err != nil {
		return fmt.Errorf("invalid energyDensity value: %v", err)
	}

	ratedCapacityVal, err := strconv.ParseFloat(ratedCapacity, 64)
	if err != nil {
		return fmt.Errorf("invalid ratedCapacity value: %v", err)
	}

	expectedLifespanVal, err := strconv.Atoi(expectedLifespan)
	if err != nil {
		return fmt.Errorf("invalid expectedLifespan value: %v", err)
	}

	carbonFootprintVal, err := strconv.ParseFloat(carbonFootprint, 64)
	if err != nil {
		carbonFootprintVal = 0 // optional — 미입력 시 0
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	now := time.Now().UTC().Format(time.RFC3339)

	passport := BatteryPassport{
		DocType:                docTypePassport,
		PassportID:             passportId,
		BatteryID:              batteryId,
		DID:                    did,
		Model:                  model,
		SerialNumber:           serialNumber,
		ManufacturerName:       manufacturerName,
		ManufactureCountry:     manufactureCountry,
		CellManufacturer:       cellManufacturer,
		CellManufactureCountry: cellManufactureCountry,
		ManufactureDate:        manufactureDate,
		CellType:               cellType,
		Chemistry:              chemistry,
		CellCount:              cellCountVal,
		Weight:                 weightVal,
		TotalEnergy:            totalEnergyVal,
		EnergyDensity:          energyDensityVal,
		RatedCapacity:          ratedCapacityVal,
		ExpectedLifespan:       expectedLifespanVal,
		VoltageRange:           voltageRange,
		TemperatureRange:       temperatureRange,
		CarbonFootprint:        carbonFootprintVal,
		RawMaterials:           []string{},
		RecyclingRates:         map[string]float64{},
		CurrentSOH:             100,
		Status:                 "MANUFACTURED",
		MaintenanceLogs:        []MaintenanceLog{},
		AccidentLogs:           []AccidentLog{},
		CorrectionLogs:         []CorrectionLog{},
		CreatedAt:              now,
		UpdatedAt:              now,
		CreatorMSP:             msp,
	}

	passportJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, passportJSON)
}

// ============================================================
// 3. RecordBMUData (ManufacturerMSP only)
// ============================================================

func (c *PassportContract) RecordBMUData(ctx contractapi.TransactionContextInterface,
	recordId string, passportId string, did string,
	dataHash string, signature string,
	fc string, soc string, voltage string, current string,
	temperature string, cellCount string, statusFlags string,
	dischargeCycles string, timestamp string) error {

	// BMU 데이터 수집: 배터리 제조사(제조/테스트) + EV 제조사(차량 운행 중) 허용
	if err := c.requireMSP(ctx, mspManufacturer, mspEVManufacturer); err != nil {
		return err
	}

	if recordId == "" || passportId == "" || did == "" || dataHash == "" || timestamp == "" {
		return fmt.Errorf("recordId, passportId, did, dataHash, timestamp must not be empty")
	}

	// Check duplicate recordId
	existingRecord, err := ctx.GetStub().GetState(recordId)
	if err != nil {
		return fmt.Errorf("failed to check existing record: %v", err)
	}
	if existingRecord != nil {
		return fmt.Errorf("BMU record %s already exists", recordId)
	}

	// Check passport exists
	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	// Parse fc and check monotonic increase per DID
	fcVal, err := strconv.ParseUint(fc, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid fc value: %v", err)
	}

	// FC monotonic increase check — reject replay/stale BMU data
	// Uses dedicated state key instead of CouchDB rich query for performance
	lastFcKey, err := ctx.GetStub().CreateCompositeKey("lastFc", []string{did})
	if err != nil {
		return fmt.Errorf("failed to create lastFc composite key: %v", err)
	}
	lastFcBytes, err := ctx.GetStub().GetState(lastFcKey)
	if err != nil {
		return fmt.Errorf("failed to read lastFc for DID %s: %v", did, err)
	}
	if lastFcBytes != nil {
		lastFcVal, err := strconv.ParseUint(string(lastFcBytes), 10, 64)
		if err != nil {
			return fmt.Errorf("failed to parse lastFc value: %v", err)
		}
		if fcVal <= lastFcVal {
			return fmt.Errorf("fc %d must be greater than last valid fc %d for DID %s", fcVal, lastFcVal, did)
		}
	}

	socVal, err := strconv.ParseUint(soc, 10, 16)
	if err != nil {
		return fmt.Errorf("invalid soc value: %v", err)
	}

	voltageVal, err := strconv.ParseFloat(voltage, 64)
	if err != nil {
		return fmt.Errorf("invalid voltage value: %v", err)
	}

	currentVal, err := strconv.ParseFloat(current, 64)
	if err != nil {
		return fmt.Errorf("invalid current value: %v", err)
	}

	temperatureVal, err := strconv.ParseUint(temperature, 10, 16)
	if err != nil {
		return fmt.Errorf("invalid temperature value: %v", err)
	}

	cellCountVal, err := strconv.ParseUint(cellCount, 10, 8)
	if err != nil {
		return fmt.Errorf("invalid cellCount value: %v", err)
	}

	statusFlagsVal, err := strconv.ParseUint(statusFlags, 10, 8)
	if err != nil {
		return fmt.Errorf("invalid statusFlags value: %v", err)
	}

	dischargeCyclesVal, err := strconv.ParseUint(dischargeCycles, 10, 16)
	if err != nil {
		return fmt.Errorf("invalid dischargeCycles value: %v", err)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	now := time.Now().UTC().Format(time.RFC3339)

	record := BMURecord{
		DocType:         docTypeBMURecord,
		RecordID:        recordId,
		PassportID:      passportId,
		DID:             did,
		DataHash:        dataHash,
		Signature:       signature,
		FC:              fcVal,
		SOC:             uint16(socVal),
		Voltage:         voltageVal,
		Current:         currentVal,
		Temperature:     uint16(temperatureVal),
		CellCount:       uint8(cellCountVal),
		StatusFlags:     uint8(statusFlagsVal),
		DischargeCycles: uint16(dischargeCyclesVal),
		Timestamp:       timestamp,
		Status:          "VALID",
		CreatedAt:       now,
		CreatorMSP:      msp,
	}

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal BMU record: %v", err)
	}

	err = ctx.GetStub().PutState(recordId, recordJSON)
	if err != nil {
		return fmt.Errorf("failed to store BMU record: %v", err)
	}

	// Update lastFc state key for this DID
	if err := ctx.GetStub().PutState(lastFcKey, []byte(strconv.FormatUint(fcVal, 10))); err != nil {
		return fmt.Errorf("failed to update lastFc: %v", err)
	}

	// Update BMU snapshot (separate key to avoid MVCC conflicts on passport key)
	snapshotKey, err := ctx.GetStub().CreateCompositeKey("snapshot", []string{passportId})
	if err != nil {
		return fmt.Errorf("failed to create snapshot key: %v", err)
	}
	snapshot := BMUSnapshot{
		DocType:              docTypeBMUSnapshot,
		PassportID:           passportId,
		CurrentSOC:           float64(uint16(socVal)),
		Temperature:          uint16(temperatureVal),
		StatusFlags:          uint8(statusFlagsVal),
		TotalDischargeCycles: int(dischargeCyclesVal),
		LastBMUDataID:        recordId,
		UpdatedAt:            now,
	}
	snapshotJSON, err := json.Marshal(snapshot)
	if err != nil {
		return fmt.Errorf("failed to marshal snapshot: %v", err)
	}

	return ctx.GetStub().PutState(snapshotKey, snapshotJSON)
}

// ============================================================
// 4. BindToVehicle (EVManufacturerMSP only)
// ============================================================

func (c *PassportContract) BindToVehicle(ctx contractapi.TransactionContextInterface,
	passportId string, vin string, installDate string,
	evManufacturer string, evAssemblyCountry string) error {

	if err := c.requireMSP(ctx, mspEVManufacturer); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if passport.Status != "MANUFACTURED" && passport.Status != "ACTIVE" {
		return fmt.Errorf("passport status must be MANUFACTURED or ACTIVE, current: %s", passport.Status)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	passport.VIN = vin
	passport.InstallDate = installDate
	passport.EVManufacturer = evManufacturer
	passport.EVAssemblyCountry = evAssemblyCountry
	passport.EvBinderMSP = msp
	passport.Status = "ACTIVE"
	passport.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 5. RequestMaintenance (EVManufacturerMSP only)
// ============================================================

func (c *PassportContract) RequestMaintenance(ctx contractapi.TransactionContextInterface,
	passportId string, maintenanceType string, description string) error {

	if err := c.requireMSP(ctx, mspEVManufacturer); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if passport.Status != "ACTIVE" {
		return fmt.Errorf("passport status must be ACTIVE for maintenance request, current: %s", passport.Status)
	}

	passport.Status = "MAINTENANCE"
	passport.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 6. AddMaintenanceLog (ServiceMSP only)
// ============================================================

func (c *PassportContract) AddMaintenanceLog(ctx contractapi.TransactionContextInterface,
	passportId string, maintenanceType string, description string, technician string) error {

	if err := c.requireMSP(ctx, mspService); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	log := MaintenanceLog{
		Date:        time.Now().UTC().Format(time.RFC3339),
		Type:        maintenanceType,
		Description: description,
		Technician:  technician,
		OrgMSP:      msp,
	}

	passport.MaintenanceLogs = append(passport.MaintenanceLogs, log)
	passport.Status = "ACTIVE"
	passport.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 7. AddAccidentLog (EVManufacturerMSP or ServiceMSP)
// ============================================================

func (c *PassportContract) AddAccidentLog(ctx contractapi.TransactionContextInterface,
	passportId string, severity string, description string, reporter string) error {

	if err := c.requireMSP(ctx, mspEVManufacturer, mspService); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	accidentLog := AccidentLog{
		Date:        time.Now().UTC().Format(time.RFC3339),
		Severity:    severity,
		Description: description,
		Reporter:    reporter,
		OrgMSP:      msp,
	}

	passport.AccidentLogs = append(passport.AccidentLogs, accidentLog)
	passport.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 8. RequestAnalysis (EVManufacturerMSP only)
// ============================================================

func (c *PassportContract) RequestAnalysis(ctx contractapi.TransactionContextInterface,
	passportId string) error {

	if err := c.requireMSP(ctx, mspEVManufacturer); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	passport.Status = "ANALYSIS"
	passport.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 9. SubmitAnalysisResult (ServiceMSP only)
// ============================================================

func (c *PassportContract) SubmitAnalysisResult(ctx contractapi.TransactionContextInterface,
	passportId string, soh string, soce string,
	remainingLifeCycle string, recycleAvailable string) error {

	if err := c.requireMSP(ctx, mspService); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	sohVal, err := strconv.ParseFloat(soh, 64)
	if err != nil {
		return fmt.Errorf("invalid soh value: %v", err)
	}

	soceVal, err := strconv.ParseFloat(soce, 64)
	if err != nil {
		return fmt.Errorf("invalid soce value: %v", err)
	}

	remainingLifeCycleVal, err := strconv.Atoi(remainingLifeCycle)
	if err != nil {
		return fmt.Errorf("invalid remainingLifeCycle value: %v", err)
	}

	recycleAvailableVal := strings.ToLower(recycleAvailable) == "true"

	passport.CurrentSOH = sohVal
	passport.SOCE = soceVal
	passport.RemainingLifeCycle = remainingLifeCycleVal
	passport.RecycleAvailable = recycleAvailableVal
	passport.Status = "ACTIVE"
	passport.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 10. SetRecycleAvailability (ServiceMSP or RegulatorMSP)
// ============================================================

func (c *PassportContract) SetRecycleAvailability(ctx contractapi.TransactionContextInterface,
	passportId string, available string) error {

	if err := c.requireMSP(ctx, mspService, mspRegulator); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	passport.RecycleAvailable = strings.ToLower(available) == "true"
	passport.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 11. ExtractMaterials (RegulatorMSP only)
// ============================================================

func (c *PassportContract) ExtractMaterials(ctx contractapi.TransactionContextInterface,
	passportId string, recyclingRatesJSON string) error {

	if err := c.requireMSP(ctx, mspRegulator); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	var recyclingRates map[string]float64
	err = json.Unmarshal([]byte(recyclingRatesJSON), &recyclingRates)
	if err != nil {
		return fmt.Errorf("failed to unmarshal recycling rates: %v", err)
	}

	passport.RecyclingRates = recyclingRates
	passport.Status = "RECYCLING"
	passport.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 12. DisposeBattery (RegulatorMSP only)
// ============================================================

func (c *PassportContract) DisposeBattery(ctx contractapi.TransactionContextInterface,
	passportId string) error {

	if err := c.requireMSP(ctx, mspRegulator); err != nil {
		return err
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	passport.Status = "DISPOSED"
	passport.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 13. QueryPassport (RBAC filtered)
// ============================================================

func (c *PassportContract) QueryPassport(ctx contractapi.TransactionContextInterface,
	passportId string) (*BatteryPassport, error) {

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if err := c.checkPassportAccess(ctx, &passport); err != nil {
		return nil, err
	}

	normalizePassport(&passport)
	c.mergeSnapshot(ctx, &passport)
	return &passport, nil
}

// ============================================================
// 14. QueryAllPassports (all orgs)
// ============================================================

func (c *PassportContract) QueryAllPassports(ctx contractapi.TransactionContextInterface) (*PaginatedPassportResult, error) {
	return c.QueryPassportsWithPagination(ctx, defaultPageSize, "")
}

// ============================================================
// 15. QueryPassportsWithPagination (RBAC filtered)
// ============================================================

func (c *PassportContract) QueryPassportsWithPagination(ctx contractapi.TransactionContextInterface,
	pageSize int32, bookmark string) (*PaginatedPassportResult, error) {

	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}

	queryString, err := c.buildPassportQuery(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %v", err)
	}

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, pageSize, bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query passports: %v", err)
	}
	defer resultsIterator.Close()

	var records []*BatteryPassport
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var passport BatteryPassport
		err = json.Unmarshal(queryResponse.Value, &passport)
		if err != nil {
			return nil, err
		}
		normalizePassport(&passport)
		c.mergeSnapshot(ctx, &passport)
		records = append(records, &passport)
	}

	return &PaginatedPassportResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 16. GetPassportHistory (RBAC filtered)
// ============================================================

func (c *PassportContract) GetPassportHistory(ctx contractapi.TransactionContextInterface,
	passportId string) ([]string, error) {

	// Access check: read current passport to verify permission
	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}
	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
	}
	if err := c.checkPassportAccess(ctx, &passport); err != nil {
		return nil, err
	}

	historyIterator, err := ctx.GetStub().GetHistoryForKey(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to get history: %v", err)
	}
	defer historyIterator.Close()

	var history []string
	for historyIterator.HasNext() {
		modification, err := historyIterator.Next()
		if err != nil {
			return nil, err
		}
		if modification.IsDelete {
			history = append(history, `{"deleted":true}`)
		} else {
			var p BatteryPassport
			if err := json.Unmarshal(modification.Value, &p); err == nil {
				normalizePassport(&p)
				normalized, _ := json.Marshal(p)
				history = append(history, string(normalized))
			} else {
				history = append(history, string(modification.Value))
			}
		}
	}

	return history, nil
}

// ============================================================
// 17. QueryBMURecordsByPassport (RBAC filtered)
// ============================================================

func (c *PassportContract) QueryBMURecordsByPassport(ctx contractapi.TransactionContextInterface,
	passportId string, pageSize int32, bookmark string) (*PaginatedBMUResult, error) {

	// Access check: verify caller can access the parent passport
	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}
	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
	}
	if err := c.checkPassportAccess(ctx, &passport); err != nil {
		return nil, err
	}

	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","passportId":"%s"},"sort":[{"timestamp":"desc"}]}`, docTypeBMURecord, passportId)

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, pageSize, bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query BMU records: %v", err)
	}
	defer resultsIterator.Close()

	var records []*BMURecord
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var record BMURecord
		err = json.Unmarshal(queryResponse.Value, &record)
		if err != nil {
			return nil, err
		}
		records = append(records, &record)
	}

	return &PaginatedBMUResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 18. QueryBatteryByDID (ManufacturerMSP, RegulatorMSP)
// ============================================================

func (c *PassportContract) QueryBatteryByDID(ctx contractapi.TransactionContextInterface,
	did string) (*BatteryPassport, error) {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return nil, err
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","did":"%s"}}`, docTypePassport, did)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query battery by DID: %v", err)
	}
	defer resultsIterator.Close()

	if resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var passport BatteryPassport
		err = json.Unmarshal(queryResponse.Value, &passport)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
		}
		normalizePassport(&passport)
		c.mergeSnapshot(ctx, &passport)
		return &passport, nil
	}

	return nil, fmt.Errorf("no passport found for DID %s", did)
}

// ============================================================
// 19. QueryRawMaterials (ManufacturerMSP, RegulatorMSP)
// ============================================================

func (c *PassportContract) QueryRawMaterials(ctx contractapi.TransactionContextInterface) ([]*RawMaterial, error) {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return nil, err
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s"}}`, docTypeRawMaterial)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("failed to query raw materials: %v", err)
	}
	defer resultsIterator.Close()

	var materials []*RawMaterial
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var material RawMaterial
		err = json.Unmarshal(queryResponse.Value, &material)
		if err != nil {
			return nil, err
		}
		materials = append(materials, &material)
	}

	return materials, nil
}

// ============================================================
// 19-1. LinkRawMaterials — 여권에 원자재 연결
// ============================================================

func (c *PassportContract) LinkRawMaterials(ctx contractapi.TransactionContextInterface,
	passportId string, materialIds string) error {

	if err := c.requireMSP(ctx, mspManufacturer); err != nil {
		return err
	}

	if passportId == "" || materialIds == "" {
		return fmt.Errorf("passportId, materialIds must not be empty")
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	// 기존 원자재 중복 체크용 set
	existing := make(map[string]bool)
	for _, id := range passport.RawMaterials {
		existing[id] = true
	}

	ids := strings.Split(materialIds, ",")
	var added []string
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		// 원자재가 실제 존재하는지 확인
		matJSON, err := ctx.GetStub().GetState(id)
		if err != nil {
			return fmt.Errorf("failed to check material %s: %v", id, err)
		}
		if matJSON == nil {
			return fmt.Errorf("raw material %s does not exist", id)
		}
		if !existing[id] {
			passport.RawMaterials = append(passport.RawMaterials, id)
			existing[id] = true
			added = append(added, id)
		}
	}

	if len(added) == 0 {
		return fmt.Errorf("no new materials to link (all already linked or empty)")
	}

	passport.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 20. IssueCredential — Anchor VC on Fabric
// ============================================================

func (c *PassportContract) IssueCredential(ctx contractapi.TransactionContextInterface,
	credentialId string, passportId string, credType string,
	issuerDid string, holderDid string,
	schemaId string, credDefId string,
	dataHash string, expiresAt string) error {

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	allowedIssuers, ok := credTypeIssuers[credType]
	if !ok {
		return fmt.Errorf("invalid credential type: %s (allowed: BATTERY_PASSPORT, BATTERY_HEALTH, MAINTENANCE, COMPLIANCE, RECYCLING)", credType)
	}
	authorized := false
	for _, allowed := range allowedIssuers {
		if msp == allowed {
			authorized = true
			break
		}
	}
	if !authorized {
		return fmt.Errorf("MSP %s is not authorized to issue %s credentials", msp, credType)
	}

	if credentialId == "" || passportId == "" || holderDid == "" || dataHash == "" {
		return fmt.Errorf("credentialId, passportId, holderDid, dataHash must not be empty")
	}

	existing, err := ctx.GetStub().GetState(credentialId)
	if err != nil {
		return fmt.Errorf("failed to check existing credential: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("credential %s already exists", credentialId)
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	now := time.Now().UTC().Format(time.RFC3339)

	vc := VerifiableCredential{
		DocType:      docTypeVC,
		CredentialID: credentialId,
		PassportID:   passportId,
		CredType:     credType,
		IssuerDID:    issuerDid,
		IssuerMSP:    msp,
		HolderDID:    holderDid,
		SchemaID:     schemaId,
		CredDefID:    credDefId,
		DataHash:     dataHash,
		Status:       "ACTIVE",
		IssuedAt:     now,
		ExpiresAt:    expiresAt,
	}

	vcJSON, err := json.Marshal(vc)
	if err != nil {
		return fmt.Errorf("failed to marshal credential: %v", err)
	}

	return ctx.GetStub().PutState(credentialId, vcJSON)
}

// ============================================================
// 21. RevokeCredential — Revoke a VC
// ============================================================

func (c *PassportContract) RevokeCredential(ctx contractapi.TransactionContextInterface,
	credentialId string, reason string) error {

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	vcJSON, err := ctx.GetStub().GetState(credentialId)
	if err != nil {
		return fmt.Errorf("failed to read credential: %v", err)
	}
	if vcJSON == nil {
		return fmt.Errorf("credential %s does not exist", credentialId)
	}

	var vc VerifiableCredential
	if err := json.Unmarshal(vcJSON, &vc); err != nil {
		return fmt.Errorf("failed to unmarshal credential: %v", err)
	}

	if vc.Status == "REVOKED" {
		return fmt.Errorf("credential %s is already revoked", credentialId)
	}

	// Only the original issuer or RegulatorMSP can revoke
	if msp != vc.IssuerMSP && msp != mspRegulator {
		return fmt.Errorf("access denied: only issuer (%s) or RegulatorMSP can revoke", vc.IssuerMSP)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	vc.Status = "REVOKED"
	vc.RevokedAt = now
	vc.RevocationReason = reason

	updatedJSON, err := json.Marshal(vc)
	if err != nil {
		return fmt.Errorf("failed to marshal credential: %v", err)
	}

	return ctx.GetStub().PutState(credentialId, updatedJSON)
}

// ============================================================
// 22. QueryCredential (all orgs)
// ============================================================

func (c *PassportContract) QueryCredential(ctx contractapi.TransactionContextInterface,
	credentialId string) (*VerifiableCredential, error) {

	vcJSON, err := ctx.GetStub().GetState(credentialId)
	if err != nil {
		return nil, fmt.Errorf("failed to read credential: %v", err)
	}
	if vcJSON == nil {
		return nil, fmt.Errorf("credential %s does not exist", credentialId)
	}

	var vc VerifiableCredential
	if err := json.Unmarshal(vcJSON, &vc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal credential: %v", err)
	}

	return &vc, nil
}

// ============================================================
// 23. QueryCredentialsByPassport (RBAC filtered)
// ============================================================

func (c *PassportContract) QueryCredentialsByPassport(ctx contractapi.TransactionContextInterface,
	passportId string, pageSizeStr string, bookmark string) (*PaginatedVCResult, error) {

	// Access check on parent passport
	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}
	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
	}
	if err := c.checkPassportAccess(ctx, &passport); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","passportId":"%s"}}`, docTypeVC, passportId)

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %v", err)
	}
	defer resultsIterator.Close()

	var records []*VerifiableCredential
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := json.Unmarshal(queryResponse.Value, &vc); err != nil {
			return nil, err
		}
		records = append(records, &vc)
	}

	return &PaginatedVCResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 24. QueryCredentialsByHolder (ManufacturerMSP, RegulatorMSP)
// ============================================================

func (c *PassportContract) QueryCredentialsByHolder(ctx contractapi.TransactionContextInterface,
	holderDid string, pageSizeStr string, bookmark string) (*PaginatedVCResult, error) {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","holderDid":"%s"}}`, docTypeVC, holderDid)

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %v", err)
	}
	defer resultsIterator.Close()

	var records []*VerifiableCredential
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := json.Unmarshal(queryResponse.Value, &vc); err != nil {
			return nil, err
		}
		records = append(records, &vc)
	}

	return &PaginatedVCResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 25. QueryCredentialsByType (all orgs, filtered by MSP)
// ============================================================

func (c *PassportContract) QueryCredentialsByType(ctx contractapi.TransactionContextInterface,
	credType string, pageSizeStr string, bookmark string) (*PaginatedVCResult, error) {

	if _, ok := credTypeIssuers[credType]; !ok {
		return nil, fmt.Errorf("invalid credential type: %s", credType)
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get client MSP: %v", err)
	}

	var queryString string
	if msp == mspRegulator {
		queryString = fmt.Sprintf(`{"selector":{"docType":"%s","credType":"%s"}}`, docTypeVC, credType)
	} else {
		queryString = fmt.Sprintf(`{"selector":{"docType":"%s","credType":"%s","issuerMsp":"%s"}}`, docTypeVC, credType, msp)
	}

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query credentials: %v", err)
	}
	defer resultsIterator.Close()

	var records []*VerifiableCredential
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := json.Unmarshal(queryResponse.Value, &vc); err != nil {
			return nil, err
		}
		records = append(records, &vc)
	}

	return &PaginatedVCResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 26. VerifyCredentialStatus (all orgs)
// ============================================================

func (c *PassportContract) VerifyCredentialStatus(ctx contractapi.TransactionContextInterface,
	credentialId string) (string, error) {

	vcJSON, err := ctx.GetStub().GetState(credentialId)
	if err != nil {
		return "", fmt.Errorf("failed to read credential: %v", err)
	}
	if vcJSON == nil {
		return "", fmt.Errorf("credential %s does not exist", credentialId)
	}

	var vc VerifiableCredential
	if err := json.Unmarshal(vcJSON, &vc); err != nil {
		return "", fmt.Errorf("failed to unmarshal credential: %v", err)
	}

	if vc.Status == "REVOKED" {
		result := fmt.Sprintf(`{"valid":false,"reason":"revoked","revokedAt":"%s","revocationReason":"%s"}`, vc.RevokedAt, vc.RevocationReason)
		return result, nil
	}

	if vc.ExpiresAt != "" {
		expiresAt, err := time.Parse(time.RFC3339, vc.ExpiresAt)
		if err == nil && time.Now().UTC().After(expiresAt) {
			return `{"valid":false,"reason":"expired"}`, nil
		}
	}

	return fmt.Sprintf(`{"valid":true,"credType":"%s","issuedAt":"%s","issuerMsp":"%s"}`, vc.CredType, vc.IssuedAt, vc.IssuerMSP), nil
}

// ============================================================
// 27. LogCredentialVerification (all orgs)
// ============================================================

func (c *PassportContract) LogCredentialVerification(ctx contractapi.TransactionContextInterface,
	verificationId string, credentialId string, verifierDid string, resultStr string) error {

	if verificationId == "" || credentialId == "" {
		return fmt.Errorf("verificationId and credentialId must not be empty")
	}

	// Check credential exists
	vcJSON, err := ctx.GetStub().GetState(credentialId)
	if err != nil {
		return fmt.Errorf("failed to read credential: %v", err)
	}
	if vcJSON == nil {
		return fmt.Errorf("credential %s does not exist", credentialId)
	}

	// Check duplicate
	existing, err := ctx.GetStub().GetState(verificationId)
	if err != nil {
		return fmt.Errorf("failed to check existing verification: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("verification %s already exists", verificationId)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	result := strings.ToLower(resultStr) == "true"
	now := time.Now().UTC().Format(time.RFC3339)

	verification := CredentialVerification{
		DocType:        docTypeVerification,
		VerificationID: verificationId,
		CredentialID:   credentialId,
		VerifierDID:    verifierDid,
		VerifierMSP:    msp,
		Result:         result,
		Timestamp:      now,
	}

	verJSON, err := json.Marshal(verification)
	if err != nil {
		return fmt.Errorf("failed to marshal verification: %v", err)
	}

	return ctx.GetStub().PutState(verificationId, verJSON)
}

// ============================================================
// 28. GetCredentialHistory
// ============================================================

func (c *PassportContract) GetCredentialHistory(ctx contractapi.TransactionContextInterface,
	credentialId string) ([]string, error) {

	historyIterator, err := ctx.GetStub().GetHistoryForKey(credentialId)
	if err != nil {
		return nil, fmt.Errorf("failed to get credential history: %v", err)
	}
	defer historyIterator.Close()

	var history []string
	for historyIterator.HasNext() {
		modification, err := historyIterator.Next()
		if err != nil {
			return nil, err
		}
		if modification.IsDelete {
			history = append(history, `{"deleted":true}`)
		} else {
			history = append(history, string(modification.Value))
		}
	}

	return history, nil
}

// ============================================================
// 29. QueryRevokedCredentials (RegulatorMSP only)
// ============================================================

func (c *PassportContract) QueryRevokedCredentials(ctx contractapi.TransactionContextInterface,
	pageSizeStr string, bookmark string) (*PaginatedVCResult, error) {

	if err := c.requireMSP(ctx, mspRegulator); err != nil {
		return nil, err
	}

	pageSize, err := strconv.ParseInt(pageSizeStr, 10, 32)
	if err != nil || pageSize <= 0 {
		pageSize = int64(defaultPageSize)
	}
	if int32(pageSize) > maxPageSize {
		pageSize = int64(maxPageSize)
	}

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","status":"REVOKED"}}`, docTypeVC)

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(queryString, int32(pageSize), bookmark)
	if err != nil {
		return nil, fmt.Errorf("failed to query revoked credentials: %v", err)
	}
	defer resultsIterator.Close()

	var records []*VerifiableCredential
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var vc VerifiableCredential
		if err := json.Unmarshal(queryResponse.Value, &vc); err != nil {
			return nil, err
		}
		records = append(records, &vc)
	}

	return &PaginatedVCResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 30. CorrectPassportData — 배터리여권 필드 정정 (감사 기록 포함)
// ============================================================

func (c *PassportContract) CorrectPassportData(ctx contractapi.TransactionContextInterface,
	passportId string, fieldName string, newValue string, reason string) error {

	if passportId == "" || fieldName == "" || newValue == "" || reason == "" {
		return fmt.Errorf("passportId, fieldName, newValue, reason must not be empty")
	}

	// 필드별 권한 확인
	allowedMSPs, fieldExists := fieldCorrectors[fieldName]
	if !fieldExists {
		return fmt.Errorf("field '%s' is not correctable", fieldName)
	}
	if err := c.requireMSP(ctx, allowedMSPs...); err != nil {
		return fmt.Errorf("MSP not authorized to correct field '%s': %v", fieldName, err)
	}

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	// 정정 가능한 필드 목록 및 원래 값 추출
	var originalValue string
	switch fieldName {
	// Manufacturer fields
	case "model":
		originalValue = passport.Model
		passport.Model = newValue
	case "serialNumber":
		originalValue = passport.SerialNumber
		passport.SerialNumber = newValue
	case "manufacturerName":
		originalValue = passport.ManufacturerName
		passport.ManufacturerName = newValue
	case "manufactureCountry":
		originalValue = passport.ManufactureCountry
		passport.ManufactureCountry = newValue
	case "cellManufacturer":
		originalValue = passport.CellManufacturer
		passport.CellManufacturer = newValue
	case "cellManufactureCountry":
		originalValue = passport.CellManufactureCountry
		passport.CellManufactureCountry = newValue
	case "manufactureDate":
		originalValue = passport.ManufactureDate
		passport.ManufactureDate = newValue
	case "cellType":
		originalValue = passport.CellType
		passport.CellType = newValue
	case "chemistry":
		originalValue = passport.Chemistry
		passport.Chemistry = newValue
	case "voltageRange":
		originalValue = passport.VoltageRange
		passport.VoltageRange = newValue
	case "temperatureRange":
		originalValue = passport.TemperatureRange
		passport.TemperatureRange = newValue
	case "cellCount":
		originalValue = strconv.Itoa(passport.CellCount)
		val, err := strconv.Atoi(newValue)
		if err != nil {
			return fmt.Errorf("invalid cellCount value: %v", err)
		}
		passport.CellCount = val
	case "weight":
		originalValue = fmt.Sprintf("%f", passport.Weight)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid weight value: %v", err)
		}
		passport.Weight = val
	case "totalEnergy":
		originalValue = fmt.Sprintf("%f", passport.TotalEnergy)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid totalEnergy value: %v", err)
		}
		passport.TotalEnergy = val
	case "energyDensity":
		originalValue = fmt.Sprintf("%f", passport.EnergyDensity)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid energyDensity value: %v", err)
		}
		passport.EnergyDensity = val
	case "ratedCapacity":
		originalValue = fmt.Sprintf("%f", passport.RatedCapacity)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid ratedCapacity value: %v", err)
		}
		passport.RatedCapacity = val
	case "expectedLifespan":
		originalValue = strconv.Itoa(passport.ExpectedLifespan)
		val, err := strconv.Atoi(newValue)
		if err != nil {
			return fmt.Errorf("invalid expectedLifespan value: %v", err)
		}
		passport.ExpectedLifespan = val
	case "carbonFootprint":
		originalValue = fmt.Sprintf("%f", passport.CarbonFootprint)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid carbonFootprint value: %v", err)
		}
		passport.CarbonFootprint = val
	// EV Manufacturer fields
	case "vin":
		originalValue = passport.VIN
		passport.VIN = newValue
	case "installDate":
		originalValue = passport.InstallDate
		passport.InstallDate = newValue
	case "evManufacturer":
		originalValue = passport.EVManufacturer
		passport.EVManufacturer = newValue
	case "evAssemblyCountry":
		originalValue = passport.EVAssemblyCountry
		passport.EVAssemblyCountry = newValue
	default:
		return fmt.Errorf("field '%s' is not correctable", fieldName)
	}

	now := time.Now().UTC().Format(time.RFC3339)

	correction := CorrectionLog{
		Date:          now,
		FieldName:     fieldName,
		OriginalValue: originalValue,
		NewValue:      newValue,
		Reason:        reason,
		CorrectedBy:   msp,
	}

	passport.CorrectionLogs = append(passport.CorrectionLogs, correction)
	passport.UpdatedAt = now

	updatedJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedJSON)
}

// ============================================================
// 31. InvalidateBMURecord — BMU 데이터 무효화 (원본 보존)
// ============================================================

func (c *PassportContract) InvalidateBMURecord(ctx contractapi.TransactionContextInterface,
	recordId string, reason string) error {

	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return err
	}

	if recordId == "" || reason == "" {
		return fmt.Errorf("recordId and reason must not be empty")
	}

	recordJSON, err := ctx.GetStub().GetState(recordId)
	if err != nil {
		return fmt.Errorf("failed to read BMU record: %v", err)
	}
	if recordJSON == nil {
		return fmt.Errorf("BMU record %s does not exist", recordId)
	}

	var record BMURecord
	if err := json.Unmarshal(recordJSON, &record); err != nil {
		return fmt.Errorf("failed to unmarshal BMU record: %v", err)
	}

	if record.Status == "INVALIDATED" {
		return fmt.Errorf("BMU record %s is already invalidated", recordId)
	}

	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	record.Status = "INVALIDATED"
	record.InvalidatedBy = msp
	record.InvalidatedAt = now
	record.InvalidReason = reason

	updatedJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal BMU record: %v", err)
	}

	if err := ctx.GetStub().PutState(recordId, updatedJSON); err != nil {
		return fmt.Errorf("failed to store invalidated record: %v", err)
	}

	// lastFc 동기화 — 무효화된 레코드의 FC가 lastFc와 같으면 재계산
	lastFcKey, _ := ctx.GetStub().CreateCompositeKey("lastFc", []string{record.DID})
	lastFcBytes, _ := ctx.GetStub().GetState(lastFcKey)
	if lastFcBytes != nil {
		currentLastFc, _ := strconv.ParseUint(string(lastFcBytes), 10, 64)
		if currentLastFc == record.FC {
			// 다음 최신 유효 FC를 rich query로 조회 (희귀 연산이므로 허용)
			fcReQuery := fmt.Sprintf(`{"selector":{"docType":"%s","did":"%s","status":"VALID"},"sort":[{"fc":"desc"}],"limit":1}`, docTypeBMURecord, record.DID)
			fcReIter, err := ctx.GetStub().GetQueryResult(fcReQuery)
			if err == nil {
				defer fcReIter.Close()
				if fcReIter.HasNext() {
					entry, _ := fcReIter.Next()
					var latestValid BMURecord
					if json.Unmarshal(entry.Value, &latestValid) == nil {
						ctx.GetStub().PutState(lastFcKey, []byte(strconv.FormatUint(latestValid.FC, 10)))
					}
				} else {
					ctx.GetStub().DelState(lastFcKey)
				}
			}
		}
	}

	// BMU snapshot 재계산 — 무효화된 레코드가 snapshot의 lastBmuDataId였으면 최근 유효 레코드로 갱신
	if record.PassportID != "" {
		snapshotKey, _ := ctx.GetStub().CreateCompositeKey("snapshot", []string{record.PassportID})
		snapshotJSON, err := ctx.GetStub().GetState(snapshotKey)
		if err == nil && snapshotJSON != nil {
			var snap BMUSnapshot
			if json.Unmarshal(snapshotJSON, &snap) == nil && snap.LastBMUDataID == recordId {
				reQuery := fmt.Sprintf(`{"selector":{"docType":"%s","passportId":"%s","status":"VALID"},"sort":[{"fc":"desc"}],"limit":1}`, docTypeBMURecord, record.PassportID)
				reIter, err := ctx.GetStub().GetQueryResult(reQuery)
				if err == nil {
					defer reIter.Close()
					if reIter.HasNext() {
						entry, _ := reIter.Next()
						var latestValid BMURecord
						if json.Unmarshal(entry.Value, &latestValid) == nil {
							snap.CurrentSOC = float64(latestValid.SOC)
							snap.TotalDischargeCycles = int(latestValid.DischargeCycles)
							snap.LastBMUDataID = latestValid.RecordID
						}
					} else {
						snap.CurrentSOC = 0
						snap.TotalDischargeCycles = 0
						snap.LastBMUDataID = ""
					}
					snap.UpdatedAt = now
					if sJSON, err := json.Marshal(snap); err == nil {
						ctx.GetStub().PutState(snapshotKey, sJSON)
					}
				}
			}
		}
	}

	return nil
}

// ============================================================
// 32. QueryCorrectionHistory — 배터리여권 정정 이력 조회
// ============================================================

func (c *PassportContract) QueryCorrectionHistory(ctx contractapi.TransactionContextInterface,
	passportId string) ([]CorrectionLog, error) {

	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}

	var passport BatteryPassport
	if err := json.Unmarshal(passportJSON, &passport); err != nil {
		return nil, fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	if err := c.checkPassportAccess(ctx, &passport); err != nil {
		return nil, err
	}

	return passport.CorrectionLogs, nil
}

// ============================================================
// main
// ============================================================

// ============================================================
// ResetFCForDID — FC 재동기화 (장비 재부팅/교체/DID 재프로비저닝)
// ============================================================

// FCResetLog records a freshness counter reset event for audit trail
type FCResetLog struct {
	DocType   string `json:"docType"`
	LogID     string `json:"logId"`
	DID       string `json:"did"`
	Reason    string `json:"reason"`
	PreviousFC uint64 `json:"previousFc"`
	ResetBy   string `json:"resetBy"`
	ResetAt   string `json:"resetAt"`
}

func (c *PassportContract) ResetFCForDID(ctx contractapi.TransactionContextInterface,
	did string, reason string) error {

	// ManufacturerMSP + RegulatorMSP만 허용 (보안 민감 작업)
	if err := c.requireMSP(ctx, mspManufacturer, mspRegulator); err != nil {
		return err
	}

	if did == "" || reason == "" {
		return fmt.Errorf("did and reason must not be empty")
	}

	// 현재 lastFc 값 조회 (감사 로그용)
	lastFcKey, err := ctx.GetStub().CreateCompositeKey("lastFc", []string{did})
	if err != nil {
		return fmt.Errorf("failed to create lastFc composite key: %v", err)
	}

	var previousFC uint64
	lastFcBytes, err := ctx.GetStub().GetState(lastFcKey)
	if err != nil {
		return fmt.Errorf("failed to read lastFc for DID %s: %v", did, err)
	}
	if lastFcBytes != nil {
		previousFC, _ = strconv.ParseUint(string(lastFcBytes), 10, 64)
	}

	// lastFc 키 삭제 — 다음 BMU 데이터부터 새 FC 시퀀스 시작
	if err := ctx.GetStub().DelState(lastFcKey); err != nil {
		return fmt.Errorf("failed to delete lastFc for DID %s: %v", did, err)
	}

	// 감사 로그 기록
	msp, _ := c.getClientMSP(ctx)
	now := time.Now().UTC().Format(time.RFC3339)
	logID := fmt.Sprintf("FCRESET-%s-%s", did, now)

	resetLog := FCResetLog{
		DocType:    docTypeFCReset,
		LogID:      logID,
		DID:        did,
		Reason:     reason,
		PreviousFC: previousFC,
		ResetBy:    msp,
		ResetAt:    now,
	}

	logJSON, err := json.Marshal(resetLog)
	if err != nil {
		return fmt.Errorf("failed to marshal FC reset log: %v", err)
	}

	if err := ctx.GetStub().PutState(logID, logJSON); err != nil {
		return fmt.Errorf("failed to store FC reset log: %v", err)
	}

	return nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&PassportContract{})
	if err != nil {
		fmt.Printf("Error creating passport chaincode: %v\n", err)
		return
	}
	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting passport chaincode: %v\n", err)
	}
}
