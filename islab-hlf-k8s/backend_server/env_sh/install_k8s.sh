#!/bin/bash

# Update the package index
sudo apt-get update

# Install necessary packages
sudo apt-get install -y apt-transport-https ca-certificates curl gpg

# Create the directory for keyrings if it does not exist
sudo mkdir -p -m 755 /etc/apt/keyrings

# Download the public signing key for the Kubernetes package repository
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

# Add the Kubernetes apt repository
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

# Update the package index with the new repository
sudo apt-get update

# Install kubelet, kubeadm, and kubectl
sudo apt-get install -y kubelet kubeadm kubectl

# Hold the versions to prevent them from being automatically updated
sudo apt-mark hold kubelet kubeadm kubectl

# (Optional) Enable and start the kubelet service
sudo systemctl enable --now kubelet

echo "Kubernetes components have been installed and kubelet service is enabled."
