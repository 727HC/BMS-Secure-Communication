#!/usr/bin/env bash

function one_line_pem {
    echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\\n",$0;}' $1`"
}

function json_ccp {
    local PP=$(one_line_pem $5)
    local CP=$(one_line_pem $6)
    sed -e "s/\${ORG}/$1/" \
        -e "s/\${MSPID}/$2/" \
        -e "s/\${P0PORT}/$3/" \
        -e "s/\${CAPORT}/$4/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        organizations/ccp-template.json
}

function yaml_ccp {
    local PP=$(one_line_pem $5)
    local CP=$(one_line_pem $6)
    sed -e "s/\${ORG}/$1/" \
        -e "s/\${MSPID}/$2/" \
        -e "s/\${P0PORT}/$3/" \
        -e "s/\${CAPORT}/$4/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        organizations/ccp-template.yaml | sed -e $'s/\\\\n/\\\n          /g'
}

## Manufacturer
ORG=manufacturer
MSPID=ManufacturerMSP
P0PORT=7051
CAPORT=7054
PEERPEM=organizations/peerOrganizations/manufacturer.battery.com/tlsca/tlsca.manufacturer.battery.com-cert.pem
CAPEM=organizations/peerOrganizations/manufacturer.battery.com/ca/ca.manufacturer.battery.com-cert.pem

echo "$(json_ccp $ORG $MSPID $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/manufacturer.battery.com/connection-manufacturer.json
echo "$(yaml_ccp $ORG $MSPID $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/manufacturer.battery.com/connection-manufacturer.yaml

## EVManufacturer
ORG=evmanufacturer
MSPID=EVManufacturerMSP
P0PORT=9051
CAPORT=8054
PEERPEM=organizations/peerOrganizations/evmanufacturer.battery.com/tlsca/tlsca.evmanufacturer.battery.com-cert.pem
CAPEM=organizations/peerOrganizations/evmanufacturer.battery.com/ca/ca.evmanufacturer.battery.com-cert.pem

echo "$(json_ccp $ORG $MSPID $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/evmanufacturer.battery.com/connection-evmanufacturer.json
echo "$(yaml_ccp $ORG $MSPID $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/evmanufacturer.battery.com/connection-evmanufacturer.yaml

## Service
ORG=service
MSPID=ServiceMSP
P0PORT=11051
CAPORT=9054
PEERPEM=organizations/peerOrganizations/service.battery.com/tlsca/tlsca.service.battery.com-cert.pem
CAPEM=organizations/peerOrganizations/service.battery.com/ca/ca.service.battery.com-cert.pem

echo "$(json_ccp $ORG $MSPID $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/service.battery.com/connection-service.json
echo "$(yaml_ccp $ORG $MSPID $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/service.battery.com/connection-service.yaml

## Regulator
ORG=regulator
MSPID=RegulatorMSP
P0PORT=13051
CAPORT=10054
PEERPEM=organizations/peerOrganizations/regulator.battery.com/tlsca/tlsca.regulator.battery.com-cert.pem
CAPEM=organizations/peerOrganizations/regulator.battery.com/ca/ca.regulator.battery.com-cert.pem

echo "$(json_ccp $ORG $MSPID $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/regulator.battery.com/connection-regulator.json
echo "$(yaml_ccp $ORG $MSPID $P0PORT $CAPORT $PEERPEM $CAPEM)" > organizations/peerOrganizations/regulator.battery.com/connection-regulator.yaml
