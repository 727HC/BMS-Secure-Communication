#!/bin/bash

# Helm 설치 스크립트

# 최신 Helm 설치 스크립트 다운로드
echo "Helm 설치 스크립트를 다운로드 중입니다..."
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3

# 스크립트에 실행 권한 부여
chmod 700 get_helm.sh

# Helm 설치 스크립트 실행
echo "Helm 설치를 진행합니다..."
./get_helm.sh

# 설치 확인
if helm version > /dev/null 2>&1; then
    echo "Helm이 성공적으로 설치되었습니다."
    helm version
else
    echo "Helm 설치에 실패했습니다."
fi

# 설치 완료 후 안정적인 저장소 추가 (선택 사항)
echo "안정적인 저장소를 추가 중입니다..."
helm repo add stable https://charts.helm.sh/stable

echo "설치 및 설정이 완료되었습니다."
