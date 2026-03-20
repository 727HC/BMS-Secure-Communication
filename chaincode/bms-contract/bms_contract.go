package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// BMSContract provides functions for managing BMS battery data on the ledger
type BMSContract struct {
	contractapi.Contract
}

// [G-04] docType 상수
const bmsDocType = "bmsData"

// [G-01] 기본 페이지 사이즈 상수
const defaultPageSize int32 = 100

// BMSData represents a battery data record on the blockchain
type BMSData struct {
	DocType   string `json:"docType"`
	DataHash  string `json:"dataHash"`
	DID       string `json:"did"`
	Signature string `json:"signature"`
	FC        uint64 `json:"fc"`
	SOC       uint16 `json:"soc"`
	Timestamp string `json:"timestamp"`
	CreatedAt string `json:"createdAt"`
	CreatorID string `json:"creatorId"`
}

// PaginatedResult wraps query results with pagination metadata
type PaginatedResult struct {
	Records  []*BMSData `json:"records"`
	Bookmark string     `json:"bookmark"`
	Count    int        `json:"count"`
}

// RecordBMSData stores battery data hash and signature on the ledger
func (c *BMSContract) RecordBMSData(ctx contractapi.TransactionContextInterface,
	id string, dataHash string, did string, signature string,
	fc string, soc string, timestamp string) error {

	// [G-03, BC-06] 필수 파라미터 빈 값 검증
	if id == "" || dataHash == "" || did == "" || timestamp == "" {
		return fmt.Errorf("id, dataHash, did, timestamp must not be empty")
	}

	// 중복 ID 체크
	existing, err := ctx.GetStub().GetState(id)
	if err != nil {
		return fmt.Errorf("failed to check existing record: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("record %s already exists", id)
	}

	// 호출자 MSP ID 기록
	clientID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	fcVal, err := strconv.ParseUint(fc, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid fc value: %v", err)
	}

	socVal, err := strconv.ParseUint(soc, 10, 16)
	if err != nil {
		return fmt.Errorf("invalid soc value: %v", err)
	}

	record := BMSData{
		DocType:   bmsDocType,
		DataHash:  dataHash,
		DID:       did,
		Signature: signature,
		FC:        fcVal,
		SOC:       uint16(socVal),
		Timestamp: timestamp,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		CreatorID: clientID,
	}

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal record: %v", err)
	}

	return ctx.GetStub().PutState(id, recordJSON)
}

// QueryBMSData returns a battery data record by ID
func (c *BMSContract) QueryBMSData(ctx contractapi.TransactionContextInterface,
	id string) (*BMSData, error) {

	recordJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("record %s does not exist", id)
	}

	var record BMSData
	err = json.Unmarshal(recordJSON, &record)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal record: %v", err)
	}

	return &record, nil
}

// QueryAllBMSData returns all battery data records (기본 defaultPageSize건)
func (c *BMSContract) QueryAllBMSData(ctx contractapi.TransactionContextInterface) (*PaginatedResult, error) {
	return c.QueryBMSDataWithPagination(ctx, defaultPageSize, "")
}

// QueryBMSDataWithPagination returns paginated battery data records with bookmark
func (c *BMSContract) QueryBMSDataWithPagination(ctx contractapi.TransactionContextInterface,
	pageSize int32, bookmark string) (*PaginatedResult, error) {

	// [G-02] BMS 키 접두사로 범위 한정
	resultsIterator, responseMetadata, err := ctx.GetStub().GetStateByRangeWithPagination("bms-", "bms-~", pageSize, bookmark)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []*BMSData
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var record BMSData
		err = json.Unmarshal(queryResponse.Value, &record)
		if err != nil {
			return nil, err
		}
		records = append(records, &record)
	}

	return &PaginatedResult{
		Records:  records,
		Bookmark: responseMetadata.GetBookmark(),
		Count:    int(responseMetadata.GetFetchedRecordsCount()),
	}, nil
}

// GetHistoryForKey returns the history of a battery data record
func (c *BMSContract) GetHistoryForKey(ctx contractapi.TransactionContextInterface,
	id string) ([]string, error) {

	historyIterator, err := ctx.GetStub().GetHistoryForKey(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get history: %v", err)
	}
	defer historyIterator.Close()

	// [G-05] 삭제된 키 처리
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

func main() {
	chaincode, err := contractapi.NewChaincode(&BMSContract{})
	if err != nil {
		fmt.Printf("Error creating BMS chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting BMS chaincode: %v\n", err)
	}
}
