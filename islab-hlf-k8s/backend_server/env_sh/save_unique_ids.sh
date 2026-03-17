#!/bin/bash
# Script to check and save MAC addresses, product UUID, and IP addresses to a .env file

OUTPUT_FILE=".env"
echo "# Node Unique Identifiers" > $OUTPUT_FILE

# Get all network interfaces' MAC addresses and IP addresses
echo "Retrieving MAC addresses and IP addresses..."
for interface in $(ip link | awk -F: '/^[0-9]+: [^lo]/ {print $2}'); do
    MAC_ADDRESS=$(ip link show "$interface" | awk '/ether/ {print $2}')
    IP_ADDRESS=$(ip -4 addr show "$interface" | awk '/inet / {print $2}' | cut -d'/' -f1)

    echo "MAC_ADDRESS_$interface=$MAC_ADDRESS" >> $OUTPUT_FILE
    echo "IP_ADDRESS_$interface=$IP_ADDRESS" >> $OUTPUT_FILE

    echo "Saved MAC address for $interface: $MAC_ADDRESS"
    echo "Saved IP address for $interface: $IP_ADDRESS"
done

# Get product UUID
echo "Retrieving product UUID..."
PRODUCT_UUID=$(sudo cat /sys/class/dmi/id/product_uuid)
echo "PRODUCT_UUID=$PRODUCT_UUID" >> $OUTPUT_FILE
echo "Saved product UUID: $PRODUCT_UUID"

echo "All unique identifiers have been saved to $OUTPUT_FILE."
