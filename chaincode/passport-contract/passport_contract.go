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
	docTypePassport  = "batteryPassport"
	docTypeBMURecord = "bmuRecord"
	docTypeRawMaterial = "rawMaterial"
	defaultPageSize  int32 = 100
)

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
	CreatedAt       string  `json:"createdAt"`
	CreatorMSP      string  `json:"creatorMsp"`
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
	voltageRange string, temperatureRange string) error {

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
		RawMaterials:           []string{},
		RecyclingRates:         map[string]float64{},
		CurrentSOH:             100,
		Status:                 "MANUFACTURED",
		MaintenanceLogs:        []MaintenanceLog{},
		AccidentLogs:           []AccidentLog{},
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
// 13. QueryPassport (all orgs)
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

	return &passport, nil
}

// ============================================================
// 14. QueryAllPassports (all orgs)
// ============================================================

func (c *PassportContract) QueryAllPassports(ctx contractapi.TransactionContextInterface) (*PaginatedPassportResult, error) {
	return c.QueryPassportsWithPagination(ctx, defaultPageSize, "")
}

// ============================================================
// 15. QueryPassportsWithPagination (all orgs)
// ============================================================

func (c *PassportContract) QueryPassportsWithPagination(ctx contractapi.TransactionContextInterface,
	pageSize int32, bookmark string) (*PaginatedPassportResult, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"%s"}}`, docTypePassport)

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
		records = append(records, &passport)
	}

	return &PaginatedPassportResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// ============================================================
// 16. GetPassportHistory (all orgs)
// ============================================================

func (c *PassportContract) GetPassportHistory(ctx contractapi.TransactionContextInterface,
	passportId string) ([]string, error) {

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
			history = append(history, string(modification.Value))
		}
	}

	return history, nil
}

// ============================================================
// 17. QueryBMURecordsByPassport (all orgs)
// ============================================================

func (c *PassportContract) QueryBMURecordsByPassport(ctx contractapi.TransactionContextInterface,
	passportId string, pageSize int32, bookmark string) (*PaginatedBMUResult, error) {

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
// 18. QueryBatteryByDID (all orgs)
// ============================================================

func (c *PassportContract) QueryBatteryByDID(ctx contractapi.TransactionContextInterface,
	did string) (*BatteryPassport, error) {

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
		return &passport, nil
	}

	return nil, fmt.Errorf("no passport found for DID %s", did)
}

// ============================================================
// 19. QueryRawMaterials (all orgs)
// ============================================================

func (c *PassportContract) QueryRawMaterials(ctx contractapi.TransactionContextInterface) ([]*RawMaterial, error) {

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
