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
	docTypeRawMaterial   = "rawMaterial"
	docTypeVC            = "verifiableCredential"
	docTypeVerification  = "vcVerification"
	defaultPageSize int32 = 100
	maxPageSize     int32 = 500
)

// Credential type → authorized issuer MSPs
var credTypeIssuers = map[string][]string{
	"BATTERY_PASSPORT": {"ManufacturerMSP"},
	"BATTERY_HEALTH":   {"ServiceMSP"},
	"MAINTENANCE":      {"ServiceMSP"},
	"COMPLIANCE":       {"RegulatorMSP"},
	"RECYCLING":        {"RegulatorMSP"},
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
	Status          string  `json:"status,omitempty"`
	InvalidatedBy   string  `json:"invalidatedBy,omitempty"`
	InvalidatedAt   string  `json:"invalidatedAt,omitempty"`
	InvalidReason   string  `json:"invalidReason,omitempty"`
	CreatedAt       string  `json:"createdAt"`
	CreatorMSP      string  `json:"creatorMsp"`
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

// checkPassportAccess verifies the caller's MSP has permission to view the passport
func (c *PassportContract) checkPassportAccess(ctx contractapi.TransactionContextInterface, passport *BatteryPassport) error {
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return fmt.Errorf("failed to get client MSP: %v", err)
	}

	switch msp {
	case "RegulatorMSP":
		return nil // 규제기관: 전체 접근
	case "ManufacturerMSP":
		if passport.CreatorMSP == msp {
			return nil // 자기가 만든 배터리만
		}
	case "EVManufacturerMSP":
		if passport.VIN != "" {
			return nil // 차량에 바인딩된 배터리만
		}
	case "ServiceMSP":
		if passport.Status == "MAINTENANCE" || passport.Status == "ANALYSIS" {
			return nil // 정비 의뢰된 배터리
		}
		for _, log := range passport.MaintenanceLogs {
			if log.OrgMSP == msp {
				return nil // 과거 정비 이력이 있는 배터리
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
	case "RegulatorMSP":
		return fmt.Sprintf(`{"selector":{"docType":"%s"}}`, docTypePassport), nil
	case "ManufacturerMSP":
		return fmt.Sprintf(`{"selector":{"docType":"%s","creatorMsp":"%s"}}`, docTypePassport, msp), nil
	case "EVManufacturerMSP":
		return fmt.Sprintf(`{"selector":{"docType":"%s","vin":{"$gt":""}}}`, docTypePassport), nil
	case "ServiceMSP":
		return fmt.Sprintf(`{"selector":{"docType":"%s","status":{"$in":["MAINTENANCE","ANALYSIS"]}}}`, docTypePassport), nil
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

	if err := c.requireMSP(ctx, "ManufacturerMSP"); err != nil {
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

	if err := c.requireMSP(ctx, "ManufacturerMSP"); err != nil {
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

	if err := c.requireMSP(ctx, "ManufacturerMSP"); err != nil {
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

	// Parse numeric strings
	fcVal, err := strconv.ParseUint(fc, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid fc value: %v", err)
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

	// Update passport with latest BMU data
	var passport BatteryPassport
	err = json.Unmarshal(passportJSON, &passport)
	if err != nil {
		return fmt.Errorf("failed to unmarshal passport: %v", err)
	}

	passport.CurrentSOC = float64(uint16(socVal))
	passport.TotalDischargeCycles = int(dischargeCyclesVal)
	passport.LastBMUDataID = recordId
	passport.UpdatedAt = now

	updatedPassportJSON, err := json.Marshal(passport)
	if err != nil {
		return fmt.Errorf("failed to marshal updated passport: %v", err)
	}

	return ctx.GetStub().PutState(passportId, updatedPassportJSON)
}

// ============================================================
// 4. BindToVehicle (EVManufacturerMSP only)
// ============================================================

func (c *PassportContract) BindToVehicle(ctx contractapi.TransactionContextInterface,
	passportId string, vin string, installDate string,
	evManufacturer string, evAssemblyCountry string) error {

	if err := c.requireMSP(ctx, "EVManufacturerMSP"); err != nil {
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

	passport.VIN = vin
	passport.InstallDate = installDate
	passport.EVManufacturer = evManufacturer
	passport.EVAssemblyCountry = evAssemblyCountry
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

	if err := c.requireMSP(ctx, "EVManufacturerMSP"); err != nil {
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

	if err := c.requireMSP(ctx, "ServiceMSP"); err != nil {
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

	if err := c.requireMSP(ctx, "EVManufacturerMSP", "ServiceMSP"); err != nil {
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

	if err := c.requireMSP(ctx, "EVManufacturerMSP"); err != nil {
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

	if err := c.requireMSP(ctx, "ServiceMSP"); err != nil {
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

	if err := c.requireMSP(ctx, "ServiceMSP", "RegulatorMSP"); err != nil {
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

	if err := c.requireMSP(ctx, "RegulatorMSP"); err != nil {
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

	if err := c.requireMSP(ctx, "RegulatorMSP"); err != nil {
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

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s","passportId":"%s"}}`, docTypeBMURecord, passportId)

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

	if err := c.requireMSP(ctx, "ManufacturerMSP", "RegulatorMSP"); err != nil {
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
		return &passport, nil
	}

	return nil, fmt.Errorf("no passport found for DID %s", did)
}

// ============================================================
// 19. QueryRawMaterials (ManufacturerMSP, RegulatorMSP)
// ============================================================

func (c *PassportContract) QueryRawMaterials(ctx contractapi.TransactionContextInterface) ([]*RawMaterial, error) {

	if err := c.requireMSP(ctx, "ManufacturerMSP", "RegulatorMSP"); err != nil {
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
	if msp != vc.IssuerMSP && msp != "RegulatorMSP" {
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

	if err := c.requireMSP(ctx, "ManufacturerMSP", "RegulatorMSP"); err != nil {
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
	if msp == "RegulatorMSP" {
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

	if err := c.requireMSP(ctx, "RegulatorMSP"); err != nil {
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

	if err := c.requireMSP(ctx, "ManufacturerMSP", "RegulatorMSP"); err != nil {
		return err
	}

	if passportId == "" || fieldName == "" || newValue == "" || reason == "" {
		return fmt.Errorf("passportId, fieldName, newValue, reason must not be empty")
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
	case "ratedCapacity":
		originalValue = fmt.Sprintf("%f", passport.RatedCapacity)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid ratedCapacity value: %v", err)
		}
		passport.RatedCapacity = val
	case "carbonFootprint":
		originalValue = fmt.Sprintf("%f", passport.CarbonFootprint)
		val, err := strconv.ParseFloat(newValue, 64)
		if err != nil {
			return fmt.Errorf("invalid carbonFootprint value: %v", err)
		}
		passport.CarbonFootprint = val
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

	if err := c.requireMSP(ctx, "ManufacturerMSP", "RegulatorMSP"); err != nil {
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

	return ctx.GetStub().PutState(recordId, updatedJSON)
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
