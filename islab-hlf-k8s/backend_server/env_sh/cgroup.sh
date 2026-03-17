#!/bin/bash

# cgroup 드라이버를 systemd로 설정하는 스크립트
# 필요한 경우 sudo 권한으로 실행하세요.

# 노드 이름
NODE_NAME=$1

if [ -z "$NODE_NAME" ]; then
    echo "노드 이름을 지정해야 합니다. 예: ./configure_cgroup_driver.sh <node-name>"
    exit 1
fi

# Step 1: kubelet ConfigMap 수정
echo "Modifying kubelet ConfigMap to use systemd cgroup driver..."
kubectl edit cm kubelet-config -n kube-system << EOF
cgroupDriver: systemd
EOF

# Step 2: 각 노드에서 cgroup 드라이버 업데이트
echo "Draining node $NODE_NAME..."
kubectl drain "$NODE_NAME" --ignore-daemonsets

# kubelet 중지
echo "Stopping kubelet on node $NODE_NAME..."
sudo systemctl stop kubelet

# 컨테이너 런타임 중지 (containerd 사용)
echo "Stopping container runtime..."
sudo systemctl stop containerd

# kubelet의 cgroup 드라이버를 systemd로 설정
echo "Setting cgroup driver to systemd in /var/lib/kubelet/config.yaml..."
sudo sed -i 's/cgroupDriver: .*/cgroupDriver: systemd/' /var/lib/kubelet/config.yaml

# 컨테이너 런타임 재시작
echo "Starting container runtime..."
sudo systemctl start containerd

# kubelet 재시작
echo "Starting kubelet on node $NODE_NAME..."
sudo systemctl start kubelet

# 노드 차단 해제
echo "Uncordoning node $NODE_NAME..."
kubectl uncordon "$NODE_NAME"

echo "cgroup driver configuration completed for node $NODE_NAME."
