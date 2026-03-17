#!/bin/bash

# 클러스터 생성 스크립트

# .env에서 IP 가져오기
#!/bin/bash

# .env 파일에서 IP_ADDRESS_ens160 가져오기
if [ -f .env ]; then
    # .env 파일에서 IP_ADDRESS_ens160 값을 읽어와 환경 변수로 설정
    export $(grep -E '^IP_ADDRESS_ens160=' .env | xargs)
    
    # IP_ADDRESS_ens160 값이 존재하는지 확인하고 CONTROL_PLANE_IP에 저장
    if [ -z "$IP_ADDRESS_ens160" ]; then
        echo "IP_ADDRESS_ens160 값이 .env 파일에 정의되지 않았습니다."
        exit 1
    else
        CONTROL_PLANE_IP="$IP_ADDRESS_ens160"
        echo "CONTROL_PLANE_IP 값은 $CONTROL_PLANE_IP 입니다."
    fi
else
    echo ".env 파일이 존재하지 않습니다."
    exit 1
fi

# Step 1: 필요한 컨테이너 런타임과 kubeadm, kubelet 설치 확인
echo "Checking prerequisites..."
if ! command -v kubeadm &> /dev/null || ! command -v kubelet &> /dev/null || ! command -v kubectl &> /dev/null; then
    echo "kubeadm, kubelet, kubectl 또는 컨테이너 런타임이 설치되지 않았습니다."
    echo "Kubernetes 설치 지침을 따라 필수 구성 요소를 설치하세요."
    exit 1
fi

# Step 2: 클러스터 초기화
echo "Initializing Kubernetes control plane..."
kubeadm init \
    --apiserver-advertise-address="$CONTROL_PLANE_IP" \
    --pod-network-cidr="$POD_NETWORK_CIDR" \
    --control-plane-endpoint="$CONTROL_PLANE_IP" \
    --kubernetes-version "$(kubeadm version -o short)"

# Step 3: kubeconfig 설정
echo "Configuring kubectl for non-root user..."
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Step 4: Pod 네트워크 설치
echo "Deploying Pod network..."
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml

# Step 5: 클러스터 조인 명령 저장
JOIN_CMD=$(kubeadm token create --print-join-command)
echo "Cluster join command for worker nodes: $JOIN_CMD"

echo "Kubernetes cluster initialization complete."
echo "You can now join worker nodes to this cluster using the provided join command."
