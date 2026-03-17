#!/bin/bash

echo "Resetting Kubernetes cluster with kubeadm..."

# kubeadm을 사용하여 클러스터 초기화
sudo kubeadm reset -f

# CNI 설정 제거
echo "Removing CNI configuration..."
sudo rm -rf /etc/cni/net.d

# iptables 규칙 초기화 (22번 포트 제외)
echo "Resetting iptables rules except for port 22..."
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -F
sudo iptables -t nat -F
sudo iptables -t mangle -F
sudo iptables -X

# IPVS 테이블 초기화 (필요한 경우)
echo "Clearing IPVS tables..."
sudo ipvsadm --clear

# kubeconfig 파일 제거
echo "Removing kubeconfig files..."
rm -rf $HOME/.kube/config

echo "Kubernetes cluster has been successfully reset and cleaned."
