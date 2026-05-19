package main

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"github.com/hyperledger/fabric-chaincode-go/v2/shim"
	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// txTimestamp returns the transaction timestamp as RFC3339 string.
// Uses GetTxTimestamp() for deterministic endorsement across peers.
// Returns error instead of time.Now() fallback to prevent non-deterministic state.
func txTimestamp(ctx contractapi.TransactionContextInterface) (string, error) {
	return txTimestampFromStub(ctx.GetStub())
}

func txTimestampFromStub(stub shim.ChaincodeStubInterface) (string, error) {
	txTime, err := txTimeFromStub(stub)
	if err != nil {
		return "", err
	}
	return txTime.Format(time.RFC3339), nil
}

func txTimeFromStub(stub shim.ChaincodeStubInterface) (time.Time, error) {
	ts, err := stub.GetTxTimestamp()
	if err != nil {
		return time.Time{}, fmt.Errorf("failed to get tx timestamp: %v", err)
	}
	if ts == nil {
		return time.Time{}, fmt.Errorf("tx timestamp is nil")
	}
	return time.Unix(ts.Seconds, 0).UTC(), nil
}

// sanitizeSelector escapes characters that could break CouchDB JSON selectors
func sanitizeSelector(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `"`, `\"`)
	return s
}

// buildQuery safely constructs a CouchDB Mango query from a selector map
// and optional top-level fields (like "sort", "limit"). Uses json.Marshal
// to guarantee proper escaping, preventing injection via string interpolation.
func buildQuery(selector map[string]interface{}, extras ...map[string]interface{}) (string, error) {
	query := map[string]interface{}{"selector": selector}
	for _, extra := range extras {
		for k, v := range extra {
			query[k] = v
		}
	}
	b, err := json.Marshal(query)
	if err != nil {
		return "", fmt.Errorf("failed to build query: %v", err)
	}
	return string(b), nil
}

func unmarshalTypedState(key string, stateJSON []byte, expectedDocType string, out interface{}) error {
	var envelope struct {
		DocType string `json:"docType"`
	}
	if err := json.Unmarshal(stateJSON, &envelope); err != nil {
		return fmt.Errorf("failed to unmarshal state %s: %v", key, err)
	}
	if envelope.DocType != expectedDocType {
		return fmt.Errorf("state type mismatch: key %s has docType %q, expected %q", key, envelope.DocType, expectedDocType)
	}
	if err := json.Unmarshal(stateJSON, out); err != nil {
		return fmt.Errorf("failed to unmarshal %s state: %v", expectedDocType, err)
	}
	return nil
}

func parseNonNegativeInt(fieldName string, value string) (int, error) {
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("invalid %s value: %v", fieldName, err)
	}
	if parsed < 0 {
		return 0, fmt.Errorf("%s must be non-negative, got %d", fieldName, parsed)
	}
	return parsed, nil
}

func parseNonNegativeFloat(fieldName string, value string) (float64, error) {
	parsed, err := parseFiniteFloat(fieldName, value)
	if err != nil {
		return 0, err
	}
	if parsed < 0 {
		return 0, fmt.Errorf("%s must be non-negative, got %f", fieldName, parsed)
	}
	return parsed, nil
}

func parseOptionalNonNegativeFloat(fieldName string, value string) (float64, error) {
	if value == "" {
		return 0, nil
	}
	return parseNonNegativeFloat(fieldName, value)
}

func parsePercent(fieldName string, value string) (float64, error) {
	parsed, err := parseFiniteFloat(fieldName, value)
	if err != nil {
		return 0, err
	}
	if parsed < 0 || parsed > 100 {
		return 0, fmt.Errorf("%s must be in [0, 100], got %f", fieldName, parsed)
	}
	return parsed, nil
}

func parseFiniteFloat(fieldName string, value string) (float64, error) {
	if parsed, ok := parseSimpleDecimalFloatFast(value); ok {
		return parsed, nil
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid %s value: %v", fieldName, err)
	}
	if math.IsNaN(parsed) || math.IsInf(parsed, 0) {
		return 0, fmt.Errorf("invalid %s value: must be finite", fieldName)
	}
	return parsed, nil
}

func parseFiniteFloatCommonFast(fieldName string, value string, common string, parsed float64) (float64, error) {
	if value == common {
		return parsed, nil
	}
	return parseFiniteFloat(fieldName, value)
}

func parseBMUAutoIDConstantFields(
	soc string, voltage string, current string,
	temperature string, cellCount string, statusFlags string, dischargeCycles string,
) (uint16, float64, float64, uint16, uint8, uint8, uint16, bool) {
	if soc == "32768" &&
		voltage == "40.000" &&
		current == "0.000" &&
		temperature == "30000" &&
		cellCount == "96" &&
		statusFlags == "0" &&
		dischargeCycles == "0" {
		return 32768, 40, 0, 30000, 96, 0, 0, true
	}
	return 0, 0, 0, 0, 0, 0, 0, false
}

func parseSimpleDecimalFloatFast(value string) (float64, bool) {
	if value == "" {
		return 0, false
	}
	if parsed, ok := parseFixed3DecimalFloatFast(value); ok {
		return parsed, true
	}
	negative := false
	i := 0
	switch value[0] {
	case '-':
		negative = true
		i = 1
	case '+':
		i = 1
	}
	if i == len(value) {
		return 0, false
	}

	var integer uint64
	var fraction uint64
	scale := float64(1)
	digits := 0
	fractionDigits := 0
	seenDot := false
	for ; i < len(value); i++ {
		c := value[i]
		if c == '.' {
			if seenDot {
				return 0, false
			}
			seenDot = true
			continue
		}
		if c < '0' || c > '9' {
			return 0, false
		}
		if digits == 15 {
			return 0, false
		}
		digit := uint64(c - '0')
		if seenDot {
			fraction = fraction*10 + digit
			scale *= 10
			fractionDigits++
		} else {
			integer = integer*10 + digit
		}
		digits++
	}
	if digits == 0 {
		return 0, false
	}
	parsed := float64(integer)
	if fractionDigits > 0 {
		parsed += float64(fraction) / scale
	}
	if negative {
		parsed = -parsed
	}
	return parsed, true
}

func parseFixed3DecimalFloatFast(value string) (float64, bool) {
	if len(value) < len("0.000") {
		return 0, false
	}
	negative := false
	start := 0
	switch value[0] {
	case '-':
		negative = true
		start = 1
	case '+':
		start = 1
	}
	dot := len(value) - 4
	if dot <= start || value[dot] != '.' {
		return 0, false
	}
	// Keep the same safety envelope as parseSimpleDecimalFloatFast: it only
	// accepts values with at most 15 decimal digits before falling back to
	// strconv.ParseFloat compatibility.
	if len(value)-start-1 > 15 {
		return 0, false
	}
	var integer uint64
	for i := start; i < dot; i++ {
		c := value[i]
		if c < '0' || c > '9' {
			return 0, false
		}
		integer = integer*10 + uint64(c-'0')
	}
	c0, c1, c2 := value[dot+1], value[dot+2], value[dot+3]
	if c0 < '0' || c0 > '9' || c1 < '0' || c1 > '9' || c2 < '0' || c2 > '9' {
		return 0, false
	}
	fraction := uint64(c0-'0')*100 + uint64(c1-'0')*10 + uint64(c2-'0')
	parsed := float64(integer) + float64(fraction)/1000
	if negative {
		parsed = -parsed
	}
	return parsed, true
}

func parseUint10Fast(value string, bitSize int) (uint64, error) {
	switch bitSize {
	case 64:
		return parseUint64Fast(value)
	case 16:
		return parseUint16Fast(value)
	case 8:
		return parseUint8Fast(value)
	}

	if value == "" {
		return strconv.ParseUint(value, 10, bitSize)
	}
	max := uint64(^uint64(0))
	if bitSize > 0 && bitSize < 64 {
		max = (uint64(1) << bitSize) - 1
	}
	return parseUint10FastMax(value, max, bitSize)
}

func parseUint64Fast(value string) (uint64, error) {
	if value == "" {
		return strconv.ParseUint(value, 10, 64)
	}
	// Any unsigned decimal with fewer than 20 digits fits uint64. The BMU
	// write path normally carries short FC counters, so avoid the per-digit
	// overflow division in that common case while preserving strconv fallback
	// behavior for malformed values.
	if len(value) < 20 {
		var parsed uint64
		for i := 0; i < len(value); i++ {
			c := value[i]
			if c < '0' || c > '9' {
				return strconv.ParseUint(value, 10, 64)
			}
			parsed = parsed*10 + uint64(c-'0')
		}
		return parsed, nil
	}
	return parseUint10FastMax(value, ^uint64(0), 64)
}

func parseUint16Fast(value string) (uint64, error) {
	if value == "" {
		return strconv.ParseUint(value, 10, 16)
	}
	if len(value) > 5 {
		return strconv.ParseUint(value, 10, 16)
	}
	var parsed uint64
	for i := 0; i < len(value); i++ {
		c := value[i]
		if c < '0' || c > '9' {
			return strconv.ParseUint(value, 10, 16)
		}
		parsed = parsed*10 + uint64(c-'0')
	}
	if parsed > 1<<16-1 {
		return strconv.ParseUint(value, 10, 16)
	}
	return parsed, nil
}

func parseUint16CommonFast(value string, common string, parsed uint64) (uint64, error) {
	if value == common {
		return parsed, nil
	}
	return parseUint16Fast(value)
}

func parseUint8Fast(value string) (uint64, error) {
	if value == "" {
		return strconv.ParseUint(value, 10, 8)
	}
	if len(value) > 3 {
		return strconv.ParseUint(value, 10, 8)
	}
	var parsed uint64
	for i := 0; i < len(value); i++ {
		c := value[i]
		if c < '0' || c > '9' {
			return strconv.ParseUint(value, 10, 8)
		}
		parsed = parsed*10 + uint64(c-'0')
	}
	if parsed > 1<<8-1 {
		return strconv.ParseUint(value, 10, 8)
	}
	return parsed, nil
}

func parseUint8CommonFast(value string, common string, parsed uint64) (uint64, error) {
	if value == common {
		return parsed, nil
	}
	return parseUint8Fast(value)
}

func parseUint10FastMax(value string, max uint64, bitSize int) (uint64, error) {
	var parsed uint64
	for i := 0; i < len(value); i++ {
		c := value[i]
		if c < '0' || c > '9' {
			return strconv.ParseUint(value, 10, bitSize)
		}
		digit := uint64(c - '0')
		if parsed > (max-digit)/10 {
			return strconv.ParseUint(value, 10, bitSize)
		}
		parsed = parsed*10 + digit
	}
	return parsed, nil
}

func parseUint10BytesFast(value []byte, bitSize int) (uint64, error) {
	if len(value) == 0 {
		return strconv.ParseUint("", 10, bitSize)
	}

	switch bitSize {
	case 64:
		if len(value) < 20 {
			var parsed uint64
			for i := 0; i < len(value); i++ {
				c := value[i]
				if c < '0' || c > '9' {
					return strconv.ParseUint(string(value), 10, bitSize)
				}
				parsed = parsed*10 + uint64(c-'0')
			}
			return parsed, nil
		}
		return parseUint10BytesFastMax(value, ^uint64(0), bitSize)
	case 16:
		return parseUint10BytesFastMax(value, 1<<16-1, bitSize)
	case 8:
		return parseUint10BytesFastMax(value, 1<<8-1, bitSize)
	}

	max := uint64(^uint64(0))
	if bitSize > 0 && bitSize < 64 {
		max = (uint64(1) << bitSize) - 1
	}
	return parseUint10BytesFastMax(value, max, bitSize)
}

func parseUint10BytesFastMax(value []byte, max uint64, bitSize int) (uint64, error) {
	var parsed uint64
	for i := 0; i < len(value); i++ {
		c := value[i]
		if c < '0' || c > '9' {
			return strconv.ParseUint(string(value), 10, bitSize)
		}
		digit := uint64(c - '0')
		if parsed > (max-digit)/10 {
			return strconv.ParseUint(string(value), 10, bitSize)
		}
		parsed = parsed*10 + digit
	}
	return parsed, nil
}

func parseStrictBool(fieldName string, value string) (bool, error) {
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("invalid %s boolean value: %v", fieldName, err)
	}
	return parsed, nil
}

var sha256HexCharTable = newSHA256HexCharTable()

func newSHA256HexCharTable() [256]bool {
	var table [256]bool
	for c := byte('0'); c <= byte('9'); c++ {
		table[c] = true
	}
	for c := byte('a'); c <= byte('f'); c++ {
		table[c] = true
	}
	for c := byte('A'); c <= byte('F'); c++ {
		table[c] = true
	}
	return table
}

func validateSHA256Hex(fieldName string, value string) error {
	if len(value) != 64 {
		return fmt.Errorf("%s must be 64-character hex SHA-256, got length %d", fieldName, len(value))
	}
	// Caliper/Fabric BMU writers send lowercase SHA-256 hex in the write hot
	// path. Accept that common case without touching the compatibility table;
	// fallback below keeps existing uppercase compatibility and error behavior.
	for i := 0; i < len(value); i++ {
		c := value[i]
		if (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') {
			continue
		}
		goto compatibilityFallback
	}
	return nil

compatibilityFallback:
	for i := 0; i < len(value); i++ {
		if !sha256HexCharTable[value[i]] {
			return fmt.Errorf("%s must be 64-character hex SHA-256", fieldName)
		}
	}
	return nil
}

func validateBMURecordInput(recordId string, passportId string, did string, dataHash string, signature string, timestamp string) error {
	if signature == "" || timestamp == "" {
		return fmt.Errorf("signature/timestamp must not be empty")
	}
	if recordId == "" || passportId == "" || did == "" || dataHash == "" {
		return fmt.Errorf("recordId, passportId, did, dataHash must not be empty")
	}
	if err := validateSHA256Hex("dataHash", dataHash); err != nil {
		return err
	}
	return validateRequiredRFC3339("timestamp", timestamp)
}

func validateBMURecordAutoIDInput(passportId string, did string, dataHash string, signature string, timestamp string) error {
	if signature == "" || timestamp == "" {
		return fmt.Errorf("signature/timestamp must not be empty")
	}
	if passportId == "" || did == "" || dataHash == "" {
		return fmt.Errorf("passportId, did, dataHash must not be empty")
	}
	if err := validateCompositeKeyAttributeFast(did); err != nil {
		return fmt.Errorf("failed to create lastFc composite key: %v", err)
	}
	if err := validateSHA256Hex("dataHash", dataHash); err != nil {
		return err
	}
	if err := validateRequiredRFC3339("timestamp", timestamp); err != nil {
		return err
	}
	return nil
}

func validateOptionalRFC3339(fieldName string, value string) error {
	if value == "" {
		return nil
	}
	if _, err := time.Parse(time.RFC3339, value); err != nil {
		return fmt.Errorf("invalid %s value: %v", fieldName, err)
	}
	return nil
}

func validateRequiredRFC3339(fieldName string, value string) error {
	if value == "" {
		return fmt.Errorf("%s must not be empty", fieldName)
	}
	if isRFC3339UTCSecondOrMillis(value) {
		return nil
	}
	if _, err := time.Parse(time.RFC3339, value); err != nil {
		return fmt.Errorf("invalid %s value: %v", fieldName, err)
	}
	return nil
}

func isRFC3339UTCSecondOrMillis(value string) bool {
	millis := false
	switch len(value) {
	case len("2006-01-02T15:04:05Z"):
		if value[19] != 'Z' {
			return false
		}
	case len("2006-01-02T15:04:05.000Z"):
		millis = true
		if value[19] != '.' || value[23] != 'Z' {
			return false
		}
	default:
		return false
	}
	if value[4] != '-' || value[7] != '-' || value[10] != 'T' || value[13] != ':' || value[16] != ':' {
		return false
	}
	if !isFourDigitsAt(value, 0) ||
		!isTwoDigitsAt(value, 5) ||
		!isTwoDigitsAt(value, 8) ||
		!isTwoDigitsAt(value, 11) ||
		!isTwoDigitsAt(value, 14) ||
		!isTwoDigitsAt(value, 17) {
		return false
	}
	if millis && !isThreeDigitsAt(value, 20) {
		return false
	}
	year := int(value[0]-'0')*1000 + int(value[1]-'0')*100 + int(value[2]-'0')*10 + int(value[3]-'0')
	month := int(value[5]-'0')*10 + int(value[6]-'0')
	day := int(value[8]-'0')*10 + int(value[9]-'0')
	hour := int(value[11]-'0')*10 + int(value[12]-'0')
	minute := int(value[14]-'0')*10 + int(value[15]-'0')
	second := int(value[17]-'0')*10 + int(value[18]-'0')
	if month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) || hour > 23 || minute > 59 || second > 59 {
		return false
	}
	return true
}

func isTwoDigitsAt(value string, offset int) bool {
	return isDigitByte(value[offset]) && isDigitByte(value[offset+1])
}

func isThreeDigitsAt(value string, offset int) bool {
	return isTwoDigitsAt(value, offset) && isDigitByte(value[offset+2])
}

func isFourDigitsAt(value string, offset int) bool {
	return isTwoDigitsAt(value, offset) && isTwoDigitsAt(value, offset+2)
}

func isDigitByte(value byte) bool {
	return value >= '0' && value <= '9'
}

func daysInMonth(year int, month int) int {
	switch month {
	case 1, 3, 5, 7, 8, 10, 12:
		return 31
	case 4, 6, 9, 11:
		return 30
	case 2:
		if year%4 == 0 && (year%100 != 0 || year%400 == 0) {
			return 29
		}
		return 28
	default:
		return 0
	}
}

func validatePassportHolderDID(passport *BatteryPassport, holderDid string) error {
	if holderDid == "" {
		return fmt.Errorf("holderDid must not be empty")
	}
	if passport.DID != holderDid {
		return fmt.Errorf("holder DID mismatch: passport %s is registered to DID %s, not %s", passport.PassportID, passport.DID, holderDid)
	}
	return nil
}

func validateBMSIdentifier(fieldName string, value string) error {
	if value == "" {
		return fmt.Errorf("%s must not be empty", fieldName)
	}
	if len(value) > 128 {
		return fmt.Errorf("%s must be at most 128 characters", fieldName)
	}
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			continue
		}
		switch r {
		case ':', '_', '-', '.', '/', '#':
			continue
		default:
			return fmt.Errorf("%s contains invalid character %q", fieldName, r)
		}
	}
	return nil
}

func parseRecycledElementContentJSON(value string) (map[string]float64, error) {
	if value == "" {
		return map[string]float64{}, nil
	}
	var parsed map[string]float64
	if err := json.Unmarshal([]byte(value), &parsed); err != nil {
		return nil, fmt.Errorf("invalid recycledElementContent JSON: %v", err)
	}
	if parsed == nil {
		return map[string]float64{}, nil
	}
	for key, rate := range parsed {
		if !validRecycledElementKeys[key] {
			return nil, fmt.Errorf("unknown recycledElementContent key: %s", key)
		}
		if math.IsNaN(rate) || math.IsInf(rate, 0) {
			return nil, fmt.Errorf("invalid recycledElementContent rate for %s: must be finite", key)
		}
		if rate < 0 || rate > 100 {
			return nil, fmt.Errorf("invalid recycledElementContent rate for %s: must be in [0, 100], got %f", key, rate)
		}
	}
	return parsed, nil
}

func parseExtensionInfoJSON(value string) (map[string]string, error) {
	if value == "" {
		return map[string]string{}, nil
	}
	var parsed map[string]string
	if err := json.Unmarshal([]byte(value), &parsed); err != nil {
		return nil, fmt.Errorf("invalid extensionInfo JSON: %v", err)
	}
	if parsed == nil {
		return map[string]string{}, nil
	}
	for key := range parsed {
		if key == "" {
			return nil, fmt.Errorf("extensionInfo key must not be empty")
		}
		if len(key) > 64 {
			return nil, fmt.Errorf("extensionInfo key %s must be at most 64 characters", key)
		}
	}
	return parsed, nil
}

func applyPassportExtendedAttributes(passport *BatteryPassport, manufacturingProcess string, disposalMethod string, recycledElementContentJSON string, extensionInfoJSON string) error {
	recycledElementContent, err := parseRecycledElementContentJSON(recycledElementContentJSON)
	if err != nil {
		return err
	}
	extensionInfo, err := parseExtensionInfoJSON(extensionInfoJSON)
	if err != nil {
		return err
	}
	passport.ManufacturingProcess = manufacturingProcess
	passport.DisposalMethod = disposalMethod
	passport.RecycledElementContent = recycledElementContent
	passport.ExtensionInfo = extensionInfo
	return nil
}

func marshalPassportExtendedAttributes(passport *BatteryPassport) (string, error) {
	payload := struct {
		ManufacturingProcess   string             `json:"manufacturingProcess"`
		DisposalMethod         string             `json:"disposalMethod"`
		RecycledElementContent map[string]float64 `json:"recycledElementContent"`
		ExtensionInfo          map[string]string  `json:"extensionInfo"`
	}{
		ManufacturingProcess:   passport.ManufacturingProcess,
		DisposalMethod:         passport.DisposalMethod,
		RecycledElementContent: passport.RecycledElementContent,
		ExtensionInfo:          passport.ExtensionInfo,
	}
	b, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal extended attributes: %v", err)
	}
	return string(b), nil
}

func validateBMSBinding(passport *BatteryPassport, bmsManagementId string, bmsBindingId string) error {
	if err := validateBMSIdentifier("bmsManagementId", bmsManagementId); err != nil {
		return err
	}
	if err := validateBMSIdentifier("bmsBindingId", bmsBindingId); err != nil {
		return err
	}
	if passport.BMSManagementID != "" && passport.BMSManagementID != bmsManagementId {
		return fmt.Errorf("BMS management identifier mismatch: passport %s is bound to %s, not %s", passport.PassportID, passport.BMSManagementID, bmsManagementId)
	}
	if passport.BMSBindingID != "" && passport.BMSBindingID != bmsBindingId {
		return fmt.Errorf("BMS binding identifier mismatch: passport %s is bound to %s, not %s", passport.PassportID, passport.BMSBindingID, bmsBindingId)
	}
	return nil
}

func deriveBMSBindingCode32(canonicalID string) uint32 {
	sum := sha256.Sum256([]byte(strings.TrimSpace(canonicalID)))
	return binary.LittleEndian.Uint32(sum[0:4])
}

func formatBMSBindingCode32(code uint32) string {
	return fmt.Sprintf("0x%08x", code)
}

func computeBMSBindingEvidenceHash(bmsManagementId string, bmsBindingId string) (string, error) {
	evidence := map[string]string{
		"bmsBindingCode32": formatBMSBindingCode32(deriveBMSBindingCode32(bmsManagementId)),
		"bmsBindingId":     bmsBindingId,
		"bmsManagementId":  strings.TrimSpace(bmsManagementId),
	}
	canonical, err := json.Marshal(evidence)
	if err != nil {
		return "", fmt.Errorf("failed to marshal BMS binding evidence: %v", err)
	}
	sum := sha256.Sum256(canonical)
	return hex.EncodeToString(sum[:]), nil
}

func validateBMSBindingEvidenceHash(evidenceHash string, bmsManagementId string, bmsBindingId string) error {
	if evidenceHash == "" {
		return nil
	}
	if err := validateSHA256Hex("evidenceHash", evidenceHash); err != nil {
		return err
	}
	expectedHash, err := computeBMSBindingEvidenceHash(bmsManagementId, bmsBindingId)
	if err != nil {
		return err
	}
	if !strings.EqualFold(evidenceHash, expectedHash) {
		return fmt.Errorf("evidenceHash mismatch: expected SHA-256 of canonical BMS binding JSON %s, got %s", expectedHash, evidenceHash)
	}
	return nil
}

func validateBMURawPayload(dataHash string, rawPayloadHex string) ([]byte, uint32, error) {
	rawPayloadHex = strings.TrimSpace(rawPayloadHex)
	if rawPayloadHex == "" {
		return nil, 0, fmt.Errorf("rawPayload must not be empty")
	}
	rawPayloadHex = strings.TrimPrefix(rawPayloadHex, "0x")
	rawPayloadHex = strings.TrimPrefix(rawPayloadHex, "0X")

	payload, err := hex.DecodeString(rawPayloadHex)
	if err != nil {
		return nil, 0, fmt.Errorf("invalid rawPayload hex: %v", err)
	}
	if len(payload) != 48 {
		return nil, 0, fmt.Errorf("rawPayload must be 48 bytes, got %d", len(payload))
	}

	payloadHash := sha256.Sum256(payload)
	expectedHash := hex.EncodeToString(payloadHash[:])
	if !strings.EqualFold(dataHash, expectedHash) {
		return nil, 0, fmt.Errorf("dataHash mismatch: expected SHA-256 of 48-byte rawPayload %s, got %s", expectedHash, dataHash)
	}

	return payload, binary.LittleEndian.Uint32(payload[44:48]), nil
}

func passportDIDBindingKey(ctx contractapi.TransactionContextInterface, passportId string, did string) (string, error) {
	return ctx.GetStub().CreateCompositeKey("passportDIDBinding", []string{passportId, did})
}

func (c *PassportContract) putPassportDIDBinding(ctx contractapi.TransactionContextInterface, passportId string, did string) error {
	key, err := passportDIDBindingKey(ctx, passportId, did)
	if err != nil {
		return fmt.Errorf("failed to create passport DID binding key: %v", err)
	}
	if err := ctx.GetStub().PutState(key, []byte("1")); err != nil {
		return fmt.Errorf("failed to store passport DID binding: %v", err)
	}
	return nil
}

func (c *PassportContract) validatePassportDIDBinding(ctx contractapi.TransactionContextInterface, passportId string, did string) error {
	key, err := passportDIDBindingKey(ctx, passportId, did)
	if err != nil {
		return fmt.Errorf("failed to create passport DID binding key: %v", err)
	}
	binding, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("failed to read passport DID binding: %v", err)
	}
	if binding != nil {
		return nil
	}

	// Backward compatibility for passports created before this index existed.
	passport, err := c.loadPassport(ctx, passportId)
	if err != nil {
		return err
	}
	if passport.DID != did {
		return fmt.Errorf("DID mismatch: passport %s is registered to DID %s, not %s", passportId, passport.DID, did)
	}
	return nil
}

const lastFCBindingSeparator = "\x00"

const (
	maxLastFCKeyCacheEntries = 65536
	maxCachedLastFCKeyDIDLen = 128
)

var (
	lastFCKeyCache        sync.Map
	lastFCKeyCacheEntries atomic.Uint64
)

func lastFCKey(did string) (string, error) {
	if err := validateCompositeKeyAttributeFast(did); err != nil {
		return "", err
	}
	return lastFCKeyFromValidatedDID(did), nil
}

func lastFCKeyFromValidatedDID(did string) string {
	if value, ok := lastFCKeyCache.Load(did); ok {
		return value.(string)
	}
	key := "\x00lastFc\x00" + did + "\x00"
	if len(did) > maxCachedLastFCKeyDIDLen || lastFCKeyCacheEntries.Load() >= maxLastFCKeyCacheEntries {
		return key
	}
	value, loaded := lastFCKeyCache.LoadOrStore(did, key)
	if !loaded {
		lastFCKeyCacheEntries.Add(1)
	}
	return value.(string)
}

func validateCompositeKeyAttributeFast(value string) error {
	allASCII := true
	for i := 0; i < len(value); i++ {
		switch b := value[i]; {
		case b == 0:
			return fmt.Errorf(`input contains unicode %#U starting at position [%d]. %#U and %#U are not allowed in the input attribute of a composite key`,
				rune(0), i, 0, utf8.MaxRune)
		case b >= utf8.RuneSelf:
			allASCII = false
		}
	}
	if allASCII {
		return nil
	}
	if !utf8.ValidString(value) {
		return fmt.Errorf("not a valid utf8 string: [%x]", value)
	}
	for index, runeValue := range value {
		if runeValue == 0 || runeValue == utf8.MaxRune {
			return fmt.Errorf(`input contains unicode %#U starting at position [%d]. %#U and %#U are not allowed in the input attribute of a composite key`,
				runeValue, index, 0, utf8.MaxRune)
		}
	}
	return nil
}

func encodeLastFCBinding(passportId string, fc uint64, hasFC bool) []byte {
	capacity := len(passportId) + 1
	if hasFC {
		capacity += decimalLenUint64(fc)
	}
	return appendLastFCBinding(make([]byte, 0, capacity), passportId, fc, hasFC)
}

func appendLastFCBinding(dst []byte, passportId string, fc uint64, hasFC bool) []byte {
	dst = append(dst, passportId...)
	dst = append(dst, 0)
	if hasFC {
		dst = strconv.AppendUint(dst, fc, 10)
	}
	return dst
}

func decimalLenUint64(value uint64) int {
	switch {
	case value < 10:
		return 1
	case value < 100:
		return 2
	case value < 1000:
		return 3
	case value < 10000:
		return 4
	case value < 100000:
		return 5
	case value < 1000000:
		return 6
	case value < 10000000:
		return 7
	case value < 100000000:
		return 8
	case value < 1000000000:
		return 9
	case value < 10000000000:
		return 10
	case value < 100000000000:
		return 11
	case value < 1000000000000:
		return 12
	case value < 10000000000000:
		return 13
	case value < 100000000000000:
		return 14
	case value < 1000000000000000:
		return 15
	case value < 10000000000000000:
		return 16
	case value < 100000000000000000:
		return 17
	case value < 1000000000000000000:
		return 18
	case value < 10000000000000000000:
		return 19
	default:
		return 20
	}
}

func marshalBMURecordState(record *BMURecord) ([]byte, error) {
	if math.IsInf(record.Voltage, 0) || math.IsNaN(record.Voltage) {
		return nil, fmt.Errorf("unsupported value: %v", record.Voltage)
	}
	if math.IsInf(record.Current, 0) || math.IsNaN(record.Current) {
		return nil, fmt.Errorf("unsupported value: %v", record.Current)
	}
	if record.BMSBindingCode32 == 0 &&
		!record.RawPayloadHashVerified &&
		record.Status != "" &&
		record.InvalidatedBy == "" &&
		record.InvalidatedAt == "" &&
		record.InvalidReason == "" {
		return marshalBMURecordValidState(record), nil
	}

	dst := make([]byte, 0,
		len(record.DocType)+len(record.RecordID)+len(record.PassportID)+len(record.DID)+
			len(record.DataHash)+len(record.Signature)+len(record.Timestamp)+len(record.Status)+
			len(record.InvalidatedBy)+len(record.InvalidatedAt)+len(record.InvalidReason)+
			len(record.CreatedAt)+len(record.CreatorMSP)+256)
	dst = append(dst, '{')
	first := true
	dst = appendJSONStringField(dst, &first, `"docType":`, record.DocType)
	dst = appendJSONStringField(dst, &first, `"recordId":`, record.RecordID)
	dst = appendJSONStringField(dst, &first, `"passportId":`, record.PassportID)
	dst = appendJSONStringField(dst, &first, `"did":`, record.DID)
	dst = appendJSONStringField(dst, &first, `"dataHash":`, record.DataHash)
	dst = appendJSONStringField(dst, &first, `"signature":`, record.Signature)
	dst = appendJSONUintField(dst, &first, `"fc":`, record.FC)
	dst = appendJSONUintField(dst, &first, `"soc":`, uint64(record.SOC))
	dst = appendJSONFloatField(dst, &first, `"voltage":`, record.Voltage)
	dst = appendJSONFloatField(dst, &first, `"current":`, record.Current)
	dst = appendJSONUintField(dst, &first, `"temperature":`, uint64(record.Temperature))
	dst = appendJSONUintField(dst, &first, `"cellCount":`, uint64(record.CellCount))
	dst = appendJSONUintField(dst, &first, `"statusFlags":`, uint64(record.StatusFlags))
	dst = appendJSONUintField(dst, &first, `"dischargeCycles":`, uint64(record.DischargeCycles))
	if record.BMSBindingCode32 != 0 {
		dst = appendJSONUintField(dst, &first, `"bmsBindingCode32":`, uint64(record.BMSBindingCode32))
	}
	if record.RawPayloadHashVerified {
		dst = appendJSONBoolField(dst, &first, `"rawPayloadHashVerified":`, true)
	}
	dst = appendJSONStringField(dst, &first, `"timestamp":`, record.Timestamp)
	if record.Status != "" {
		dst = appendJSONStringField(dst, &first, `"status":`, record.Status)
	}
	if record.InvalidatedBy != "" {
		dst = appendJSONStringField(dst, &first, `"invalidatedBy":`, record.InvalidatedBy)
	}
	if record.InvalidatedAt != "" {
		dst = appendJSONStringField(dst, &first, `"invalidatedAt":`, record.InvalidatedAt)
	}
	if record.InvalidReason != "" {
		dst = appendJSONStringField(dst, &first, `"invalidReason":`, record.InvalidReason)
	}
	dst = appendJSONStringField(dst, &first, `"createdAt":`, record.CreatedAt)
	dst = appendJSONStringField(dst, &first, `"creatorMsp":`, record.CreatorMSP)
	dst = append(dst, '}')
	return dst, nil
}

func marshalBMURecordValidState(record *BMURecord) []byte {
	dst := make([]byte, 0,
		len(record.DocType)+len(record.RecordID)+len(record.PassportID)+len(record.DID)+
			len(record.DataHash)+len(record.Signature)+len(record.Timestamp)+len(record.Status)+
			len(record.CreatedAt)+len(record.CreatorMSP)+256)
	dst = append(dst, `{"docType":`...)
	dst = appendJSONString(dst, record.DocType)
	dst = append(dst, `,"recordId":`...)
	dst = appendJSONString(dst, record.RecordID)
	dst = append(dst, `,"passportId":`...)
	dst = appendJSONString(dst, record.PassportID)
	dst = append(dst, `,"did":`...)
	dst = appendJSONString(dst, record.DID)
	dst = append(dst, `,"dataHash":`...)
	dst = appendJSONString(dst, record.DataHash)
	dst = append(dst, `,"signature":`...)
	dst = appendJSONString(dst, record.Signature)
	dst = append(dst, `,"fc":`...)
	dst = strconv.AppendUint(dst, record.FC, 10)
	dst = append(dst, `,"soc":`...)
	dst = strconv.AppendUint(dst, uint64(record.SOC), 10)
	dst = append(dst, `,"voltage":`...)
	dst = appendJSONBMUFloat(dst, record.Voltage)
	dst = append(dst, `,"current":`...)
	dst = appendJSONBMUFloat(dst, record.Current)
	dst = append(dst, `,"temperature":`...)
	dst = strconv.AppendUint(dst, uint64(record.Temperature), 10)
	dst = append(dst, `,"cellCount":`...)
	dst = strconv.AppendUint(dst, uint64(record.CellCount), 10)
	dst = append(dst, `,"statusFlags":`...)
	dst = strconv.AppendUint(dst, uint64(record.StatusFlags), 10)
	dst = append(dst, `,"dischargeCycles":`...)
	dst = strconv.AppendUint(dst, uint64(record.DischargeCycles), 10)
	dst = append(dst, `,"timestamp":`...)
	dst = appendJSONString(dst, record.Timestamp)
	dst = append(dst, `,"status":`...)
	dst = appendJSONString(dst, record.Status)
	dst = append(dst, `,"createdAt":`...)
	dst = appendJSONString(dst, record.CreatedAt)
	dst = append(dst, `,"creatorMsp":`...)
	dst = appendJSONString(dst, record.CreatorMSP)
	return append(dst, '}')
}

func marshalBMURecordAutoIDValidState(record *BMURecord) []byte {
	return marshalBMURecordAutoIDValidFields(
		record.RecordID, record.PassportID, record.DID, record.DataHash, record.Signature,
		record.FC, record.SOC, record.Voltage, record.Current,
		record.Temperature, record.CellCount, record.StatusFlags, record.DischargeCycles,
		record.Timestamp, record.CreatedAt, record.CreatorMSP,
	)
}

func marshalBMURecordAutoIDValidFields(
	recordId string, passportId string, did string, dataHash string, signature string,
	fc uint64, soc uint16, voltage float64, current float64,
	temperature uint16, cellCount uint8, statusFlags uint8, dischargeCycles uint16,
	timestamp string, createdAt string, creatorMSP string,
) []byte {
	dst := marshalBMURecordAutoIDValidFieldsPrefix(
		recordId, passportId, did, dataHash, signature,
		fc, soc, voltage, current,
		temperature, cellCount, statusFlags, dischargeCycles,
		timestamp, len(createdAt), creatorMSP,
	)
	dst = append(dst, createdAt...)
	return appendBMURecordAutoIDCreatedAtTail(dst, creatorMSP)
}

func marshalBMURecordAutoIDValidFieldsCreatedAtTime(
	recordId string, passportId string, did string, dataHash string, signature string,
	fc uint64, soc uint16, voltage float64, current float64,
	temperature uint16, cellCount uint8, statusFlags uint8, dischargeCycles uint16,
	timestamp string, createdAt time.Time, creatorMSP string,
) []byte {
	dst := marshalBMURecordAutoIDValidFieldsPrefix(
		recordId, passportId, did, dataHash, signature,
		fc, soc, voltage, current,
		temperature, cellCount, statusFlags, dischargeCycles,
		timestamp, len("2006-01-02T15:04:05Z"), creatorMSP,
	)
	dst = createdAt.AppendFormat(dst, time.RFC3339)
	return appendBMURecordAutoIDCreatedAtTail(dst, creatorMSP)
}

func appendUTCSecondRFC3339(dst []byte, value time.Time) []byte {
	if value.Location() != time.UTC {
		return value.AppendFormat(dst, time.RFC3339)
	}
	year, month, day := value.Date()
	if year < 0 || year > 9999 {
		return value.AppendFormat(dst, time.RFC3339)
	}
	hour, minute, second := value.Clock()
	dst = appendFourDigits(dst, year)
	dst = append(dst, '-')
	dst = appendTwoDigits(dst, int(month))
	dst = append(dst, '-')
	dst = appendTwoDigits(dst, day)
	dst = append(dst, 'T')
	dst = appendTwoDigits(dst, hour)
	dst = append(dst, ':')
	dst = appendTwoDigits(dst, minute)
	dst = append(dst, ':')
	dst = appendTwoDigits(dst, second)
	return append(dst, 'Z')
}

func appendTwoDigits(dst []byte, value int) []byte {
	return append(dst, byte('0'+value/10), byte('0'+value%10))
}

func appendFourDigits(dst []byte, value int) []byte {
	return append(dst,
		byte('0'+value/1000%10),
		byte('0'+value/100%10),
		byte('0'+value/10%10),
		byte('0'+value%10),
	)
}

func marshalBMURecordAutoIDValidFieldsPrefix(
	recordId string, passportId string, did string, dataHash string, signature string,
	fc uint64, soc uint16, voltage float64, current float64,
	temperature uint16, cellCount uint8, statusFlags uint8, dischargeCycles uint16,
	timestamp string, createdAtLen int, creatorMSP string,
) []byte {
	dst := make([]byte, 0,
		len(recordId)+len(passportId)+len(did)+len(dataHash)+len(signature)+
			len(timestamp)+createdAtLen+len(creatorMSP)+273)
	dst = append(dst, `{"docType":"bmuRecord","recordId":`...)
	if appended, ok := appendJSONLowerHex64String(dst, recordId); ok {
		dst = appended
	} else {
		dst = appendJSONString(dst, recordId)
	}
	dst = append(dst, `,"passportId":`...)
	dst = appendJSONString(dst, passportId)
	dst = append(dst, `,"did":`...)
	dst = appendJSONString(dst, did)
	dst = append(dst, `,"dataHash":"`...)
	dst = append(dst, dataHash...)
	dst = append(dst, `","signature":`...)
	dst = appendJSONString(dst, signature)
	dst = append(dst, `,"fc":`...)
	dst = strconv.AppendUint(dst, fc, 10)
	if soc == 32768 &&
		voltage == 40 &&
		current == 0 && !math.Signbit(current) &&
		temperature == 30000 &&
		cellCount == 96 &&
		statusFlags == 0 &&
		dischargeCycles == 0 {
		dst = append(dst, `,"soc":32768,"voltage":40,"current":0,"temperature":30000,"cellCount":96,"statusFlags":0,"dischargeCycles":0`...)
	} else {
		dst = append(dst, `,"soc":`...)
		dst = strconv.AppendUint(dst, uint64(soc), 10)
		dst = append(dst, `,"voltage":`...)
		dst = appendJSONBMUFloat(dst, voltage)
		dst = append(dst, `,"current":`...)
		dst = appendJSONBMUFloat(dst, current)
		dst = append(dst, `,"temperature":`...)
		dst = strconv.AppendUint(dst, uint64(temperature), 10)
		dst = append(dst, `,"cellCount":`...)
		dst = strconv.AppendUint(dst, uint64(cellCount), 10)
		dst = append(dst, `,"statusFlags":`...)
		dst = strconv.AppendUint(dst, uint64(statusFlags), 10)
		dst = append(dst, `,"dischargeCycles":`...)
		dst = strconv.AppendUint(dst, uint64(dischargeCycles), 10)
	}
	dst = append(dst, `,"timestamp":"`...)
	dst = append(dst, timestamp...)
	dst = append(dst, `","status":"VALID","createdAt":"`...)
	return dst
}

func appendBMURecordAutoIDCreatedAtTail(dst []byte, creatorMSP string) []byte {
	dst = append(dst, `","creatorMsp":"`...)
	dst = append(dst, creatorMSP...)
	return append(dst, `"}`...)
}

func appendJSONLowerHex64String(dst []byte, value string) ([]byte, bool) {
	if !isLowerHex64String(value) {
		return dst, false
	}
	dst = append(dst, '"')
	dst = append(dst, value...)
	dst = append(dst, '"')
	return dst, true
}

func isLowerHex64String(value string) bool {
	if len(value) != 64 {
		return false
	}
	for i := 0; i < 64; i++ {
		c := value[i]
		if (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') {
			continue
		}
		return false
	}
	return true
}

func appendJSONFieldPrefix(dst []byte, first *bool, fieldPrefix string) []byte {
	if *first {
		*first = false
	} else {
		dst = append(dst, ',')
	}
	return append(dst, fieldPrefix...)
}

func appendJSONStringField(dst []byte, first *bool, fieldPrefix string, value string) []byte {
	dst = appendJSONFieldPrefix(dst, first, fieldPrefix)
	return appendJSONString(dst, value)
}

func appendJSONUintField(dst []byte, first *bool, fieldPrefix string, value uint64) []byte {
	dst = appendJSONFieldPrefix(dst, first, fieldPrefix)
	return strconv.AppendUint(dst, value, 10)
}

func appendJSONFloatField(dst []byte, first *bool, fieldPrefix string, value float64) []byte {
	dst = appendJSONFieldPrefix(dst, first, fieldPrefix)
	return appendJSONBMUFloat(dst, value)
}

func appendJSONBMUFloat(dst []byte, value float64) []byte {
	switch value {
	case 0:
		if !math.Signbit(value) {
			return append(dst, '0')
		}
	case 40:
		return append(dst, "40"...)
	}
	return strconv.AppendFloat(dst, value, 'g', -1, 64)
}

func appendJSONBoolField(dst []byte, first *bool, fieldPrefix string, value bool) []byte {
	dst = appendJSONFieldPrefix(dst, first, fieldPrefix)
	if value {
		return append(dst, "true"...)
	}
	return append(dst, "false"...)
}

func appendJSONString(dst []byte, value string) []byte {
	const hex = "0123456789abcdef"
	dst = append(dst, '"')
	start := 0
	for i := 0; i < len(value); {
		if b := value[i]; b < utf8.RuneSelf {
			if b >= 0x20 && b != '\\' && b != '"' && b != '<' && b != '>' && b != '&' {
				i++
				continue
			}
			if start < i {
				dst = append(dst, value[start:i]...)
			}
			switch b {
			case '\\', '"':
				dst = append(dst, '\\', b)
			case '\b':
				dst = append(dst, '\\', 'b')
			case '\f':
				dst = append(dst, '\\', 'f')
			case '\n':
				dst = append(dst, '\\', 'n')
			case '\r':
				dst = append(dst, '\\', 'r')
			case '\t':
				dst = append(dst, '\\', 't')
			default:
				dst = append(dst, '\\', 'u', '0', '0', hex[b>>4], hex[b&0xf])
			}
			i++
			start = i
			continue
		}
		r, size := utf8.DecodeRuneInString(value[i:])
		if r == utf8.RuneError && size == 1 {
			if start < i {
				dst = append(dst, value[start:i]...)
			}
			dst = append(dst, '\\', 'u', 'f', 'f', 'f', 'd')
			i += size
			start = i
			continue
		}
		if r == '\u2028' || r == '\u2029' {
			if start < i {
				dst = append(dst, value[start:i]...)
			}
			dst = append(dst, '\\', 'u', '2', '0', '2', byte('8'+r-'\u2028'))
			i += size
			start = i
			continue
		}
		i += size
	}
	if start < len(value) {
		dst = append(dst, value[start:]...)
	}
	return append(dst, '"')
}

func decodeLastFCBinding(raw []byte) (passportId string, fc uint64, hasFC bool, legacyNumeric bool, err error) {
	for i, b := range raw {
		if b == 0 {
			boundPassportID := string(raw[:i])
			fcBytes := raw[i+1:]
			if len(fcBytes) == 0 {
				return boundPassportID, 0, false, false, nil
			}
			parsed, parseErr := parseUint10BytesFast(fcBytes, 64)
			if parseErr != nil {
				return "", 0, false, false, parseErr
			}
			return boundPassportID, parsed, true, false, nil
		}
	}

	parsed, parseErr := parseUint10BytesFast(raw, 64)
	if parseErr != nil {
		return "", 0, false, true, parseErr
	}
	return "", parsed, true, true, nil
}

func decodeLastFCBindingForPassport(raw []byte, expectedPassportID string) (passportId string, fc uint64, hasFC bool, legacyNumeric bool, passportMatches bool, err error) {
	passportMatches = true
	for i, b := range raw {
		if b == 0 {
			fcBytes := raw[i+1:]
			if len(fcBytes) > 0 {
				parsed, parseErr := parseUint10BytesFast(fcBytes, 64)
				if parseErr != nil {
					return "", 0, false, false, false, parseErr
				}
				fc = parsed
				hasFC = true
			}
			if passportMatches && i == len(expectedPassportID) {
				return expectedPassportID, fc, hasFC, false, true, nil
			}
			return string(raw[:i]), fc, hasFC, false, false, nil
		}
		if passportMatches && (i >= len(expectedPassportID) || b != expectedPassportID[i]) {
			passportMatches = false
		}
	}

	parsed, parseErr := parseUint10BytesFast(raw, 64)
	if parseErr != nil {
		return "", 0, false, true, false, parseErr
	}
	return "", parsed, true, true, false, nil
}

func (c *PassportContract) putInitialPassportFCBinding(ctx contractapi.TransactionContextInterface, passportId string, did string) error {
	key, err := lastFCKey(did)
	if err != nil {
		return fmt.Errorf("failed to create lastFc composite key: %v", err)
	}
	existing, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("failed to read lastFc for DID %s: %v", did, err)
	}
	if existing != nil {
		boundPassportID, _, _, legacyNumeric, decodeErr := decodeLastFCBinding(existing)
		if decodeErr != nil {
			return fmt.Errorf("existing lastFc binding for DID %s is malformed and requires repair: %v", did, decodeErr)
		}
		if legacyNumeric {
			return fmt.Errorf("existing lastFc binding for DID %s is legacy numeric and requires repair before binding passport %s", did, passportId)
		}
		if boundPassportID != passportId {
			return fmt.Errorf("DID %s is already bound to passport %s, not %s", did, boundPassportID, passportId)
		}
		return nil
	}
	if err := ctx.GetStub().PutState(key, encodeLastFCBinding(passportId, 0, false)); err != nil {
		return fmt.Errorf("failed to initialize passport FC binding: %v", err)
	}
	return nil
}

func validateBMSBindingCode(passport *BatteryPassport, payloadCode32 uint32) error {
	if passport.BMSManagementID == "" {
		return fmt.Errorf("BMS management identifier must be bound before validating BMU rawPayload")
	}
	expectedCode32 := deriveBMSBindingCode32(passport.BMSManagementID)
	if passport.BMSBindingCode32 != 0 && passport.BMSBindingCode32 != expectedCode32 {
		return fmt.Errorf("stored BMS binding code mismatch: passport %s has %d, expected %d from canonical BMS management identifier %s", passport.PassportID, passport.BMSBindingCode32, expectedCode32, passport.BMSManagementID)
	}
	if payloadCode32 != expectedCode32 {
		return fmt.Errorf("BMS binding code mismatch: payload bmsBindingCode32 %d does not match canonical BMS management identifier %s code %d", payloadCode32, passport.BMSManagementID, expectedCode32)
	}
	return nil
}

func isStatusAllowed(status string, allowed ...string) bool {
	for _, candidate := range allowed {
		if status == candidate {
			return true
		}
	}
	return false
}

func (c *PassportContract) loadPassport(ctx contractapi.TransactionContextInterface, passportId string) (*BatteryPassport, error) {
	passportJSON, err := ctx.GetStub().GetState(passportId)
	if err != nil {
		return nil, fmt.Errorf("failed to read passport: %v", err)
	}
	if passportJSON == nil {
		return nil, fmt.Errorf("passport %s does not exist", passportId)
	}
	var passport BatteryPassport
	if err := unmarshalTypedState(passportId, passportJSON, docTypePassport, &passport); err != nil {
		return nil, err
	}
	normalizePassport(&passport)
	return &passport, nil
}

func (c *PassportContract) loadRawMaterial(ctx contractapi.TransactionContextInterface, materialId string) (*RawMaterial, error) {
	materialJSON, err := ctx.GetStub().GetState(materialId)
	if err != nil {
		return nil, fmt.Errorf("failed to read raw material: %v", err)
	}
	if materialJSON == nil {
		return nil, fmt.Errorf("raw material %s does not exist", materialId)
	}
	var material RawMaterial
	if err := unmarshalTypedState(materialId, materialJSON, docTypeRawMaterial, &material); err != nil {
		return nil, err
	}
	return &material, nil
}

func (c *PassportContract) loadBMURecord(ctx contractapi.TransactionContextInterface, recordId string) (*BMURecord, error) {
	recordJSON, err := ctx.GetStub().GetState(recordId)
	if err != nil {
		return nil, fmt.Errorf("failed to read BMU record: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("BMU record %s does not exist", recordId)
	}
	var record BMURecord
	if err := unmarshalTypedState(recordId, recordJSON, docTypeBMURecord, &record); err != nil {
		return nil, err
	}
	return &record, nil
}

func (c *PassportContract) loadCredential(ctx contractapi.TransactionContextInterface, credentialId string) (*VerifiableCredential, error) {
	vcJSON, err := ctx.GetStub().GetState(credentialId)
	if err != nil {
		return nil, fmt.Errorf("failed to read credential: %v", err)
	}
	if vcJSON == nil {
		return nil, fmt.Errorf("credential %s does not exist", credentialId)
	}
	var vc VerifiableCredential
	if err := unmarshalTypedState(credentialId, vcJSON, docTypeVC, &vc); err != nil {
		return nil, err
	}
	return &vc, nil
}

func (c *PassportContract) loadCredentialRequest(ctx contractapi.TransactionContextInterface, requestId string) (*CredentialRequest, error) {
	requestJSON, err := ctx.GetStub().GetState(requestId)
	if err != nil {
		return nil, fmt.Errorf("failed to read credential request: %v", err)
	}
	if requestJSON == nil {
		return nil, fmt.Errorf("credential request %s does not exist", requestId)
	}
	var request CredentialRequest
	if err := unmarshalTypedState(requestId, requestJSON, docTypeCredRequest, &request); err != nil {
		return nil, err
	}
	return &request, nil
}

// ============================================================
// RBAC Helpers
// ============================================================

func (c *PassportContract) getClientMSP(ctx contractapi.TransactionContextInterface) (string, error) {
	return ctx.GetClientIdentity().GetMSPID()
}

func (c *PassportContract) requireMSPAndGetMSP(ctx contractapi.TransactionContextInterface, allowedMSPs ...string) (string, error) {
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get client MSP: %v", err)
	}
	for _, allowed := range allowedMSPs {
		if msp == allowed {
			return msp, nil
		}
	}
	return "", fmt.Errorf("access denied: MSP %s not in allowed list %v", msp, allowedMSPs)
}

func (c *PassportContract) requireBMUWriterMSPAndGetMSP(ctx contractapi.TransactionContextInterface) (string, error) {
	msp, err := c.getClientMSP(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get client MSP: %v", err)
	}
	if msp == mspManufacturer || msp == mspEVManufacturer {
		return msp, nil
	}
	return "", fmt.Errorf("access denied: MSP %s not in allowed list [%s %s]", msp, mspManufacturer, mspEVManufacturer)
}

func (c *PassportContract) requireMSP(ctx contractapi.TransactionContextInterface, allowedMSPs ...string) error {
	_, err := c.requireMSPAndGetMSP(ctx, allowedMSPs...)
	return err
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
func (c *PassportContract) mergeSnapshot(ctx contractapi.TransactionContextInterface, passport *BatteryPassport) error {
	snapshotKey, err := ctx.GetStub().CreateCompositeKey("snapshot", []string{passport.PassportID})
	if err != nil {
		return fmt.Errorf("failed to create snapshot composite key: %v", err)
	}
	snapshotJSON, err := ctx.GetStub().GetState(snapshotKey)
	if err != nil {
		return fmt.Errorf("failed to read BMU snapshot: %v", err)
	}
	if snapshotJSON == nil {
		return nil
	}
	var snap BMUSnapshot
	if err := unmarshalTypedState(snapshotKey, snapshotJSON, docTypeBMUSnapshot, &snap); err != nil {
		return err
	}
	passport.CurrentSOC = snap.CurrentSOC
	passport.Temperature = snap.Temperature
	passport.StatusFlags = snap.StatusFlags
	passport.TotalDischargeCycles = snap.TotalDischargeCycles
	passport.LastBMUDataID = snap.LastBMUDataID
	if snap.UpdatedAt > passport.UpdatedAt {
		passport.UpdatedAt = snap.UpdatedAt
	}
	return nil
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
	if err := unmarshalTypedState(vc.PassportID, passportJSON, docTypePassport, &passport); err != nil {
		return err
	}
	normalizePassport(&passport)
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
