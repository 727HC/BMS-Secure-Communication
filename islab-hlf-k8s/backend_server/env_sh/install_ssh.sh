#!/bin/bash

 # SSH 서버 설치 및 설정 스크립트 

echo "Updating package list..." 
sudo apt update 
echo "Installing OpenSSH Server..." 
sudo apt install -y openssh-server 
echo "Starting and enabling SSH service..." 
sudo systemctl start ssh sudo systemctl enable ssh 

# 기본 포트를 열기 
echo "Allowing SSH through the firewall..." 
sudo ufw allow ssh
 # 사용자에게 맞춤 포트 입력 여부 확인 
read -p "Do you want to set a custom SSH port? (y/n): " custom_port 

if [ "$custom_port" == "y" ]; then 
	read -p "Enter the custom port number: " port_number 
	echo "Setting SSH to use port $port_number..." 
	# SSH 설정 파일에서 포트 번호 변경 
	sudo sed -i "s/^#Port 22/Port $port_number/" /etc/ssh/sshd_config 
	# 방화벽에서 커스텀 포트 열기 
	sudo ufw allow "$port_number/tcp" 
	# SSH 서비스 재시작 
	sudo systemctl restart ssh 
fi 

echo "SSH server installation and configuration is complete."
