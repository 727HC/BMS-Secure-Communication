#!/bin/bash

# 컨테이너 런타임 설치 스크립트
# 필요한 경우 sudo 권한으로 실행하세요.

# 설치할 런타임 설정
RUNTIME=$1

# 기본 설정: containerd 설치
install_containerd() {
    echo "Installing containerd..."
    sudo apt update
    sudo apt install -y containerd

    # containerd 설정 파일 생성 및 구성
    sudo mkdir -p /etc/containerd
    sudo containerd config default | sudo tee /etc/containerd/config.toml

    # containerd 서비스 재시작
    sudo systemctl restart containerd
    sudo systemctl enable containerd
    echo "containerd installed and configured at unix:///var/run/containerd/containerd.sock"
}

# cri-o 설치 함수 (필요한 경우 추가 설치 방법 구현)
install_crio() {
    echo "cri-o installation is not included in this script. Please refer to cri-o official documentation for installation steps."
}

# Docker + cri-dockerd 설치 함수
install_docker_cri() {
    echo "Installing Docker and cri-dockerd..."
    sudo apt update
    sudo apt install -y docker.io

    # cri-dockerd 설치
    sudo apt install -y golang-go
    git clone https://github.com/Mirantis/cri-dockerd.git
    cd cri-dockerd
    mkdir bin
    go build -o bin/cri-dockerd
    sudo cp bin/cri-dockerd /usr/local/bin/
    sudo cri-dockerd &

    # Docker 서비스 시작 및 활성화
    sudo systemctl restart docker
    sudo systemctl enable docker
    echo "Docker and cri-dockerd installed and configured at unix:///var/run/cri-dockerd.sock"
}

# 런타임 설치 결정
case "$RUNTIME" in
    containerd)
        install_containerd
        ;;
    crio)
        install_crio
        ;;
    docker)
        install_docker_cri
        ;;
    *)
        echo "사용할 컨테이너 런타임을 지정하세요: containerd, crio, 또는 docker"
        exit 1
        ;;
esac
