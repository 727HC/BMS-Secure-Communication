#!/bin/bash

# Git 설치 확인 및 설치
if ! command -v git &> /dev/null; then
  echo "Git이 설치되어 있지 않습니다. Git을 설치합니다..."
  sudo apt-get update && sudo apt-get install -y git
fi

# Krew 설치 스크립트
echo "Krew를 설치하는 중입니다..."
(
  set -x; cd "$(mktemp -d)" &&
  OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/\(arm\)\(64\)\?.*/\1\2/' -e 's/aarch64$/arm64/')" &&
  KREW="krew-${OS}_${ARCH}" &&
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
  tar zxvf "${KREW}.tar.gz" &&
  ./"${KREW}" install krew
)

# 환경 변수 PATH에 Krew 바이너리 경로 추가
echo 'export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
echo 'export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 사용자에게 셸 재시작 안내
echo "Krew 설치가 완료되었습니다. 셸을 다시 시작하거나 'source ~/.bashrc'를 실행하여 PATH 설정을 적용하세요."

# 설치 확인
echo "kubectl krew 설치 확인 중..."
source ~/.bashrc
kubectl krew version && echo "Krew가 성공적으로 설치되었습니다." || echo "Krew 설치에 문제가 발생했습니다."
