#!/bin/bash
# Script to open Kubernetes ports for control plane or worker nodes

echo "Enter the node type (control-plane or worker):"
read NODE_TYPE

sudo ufw enable

check_port() {
    local PORT=$1
    sudo ufw status | grep -w "$PORT" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Port $PORT is open."
    else
        echo "Port $PORT is NOT open."
    fi
}

if [ "$NODE_TYPE" == "control-plane" ]; then
    echo "Opening ports for Kubernetes Control Plane..."

    # Kubernetes API server
    sudo ufw allow 6443/tcp
    check_port 6443

    # etcd server client API
    sudo ufw allow 2379:2380/tcp
    check_port 2379
    check_port 2380

    # Kubelet API for control plane
    sudo ufw allow 10250/tcp
    check_port 10250

    # kube-scheduler
    sudo ufw allow 10259/tcp
    check_port 10259

    # kube-controller-manager
    sudo ufw allow 10257/tcp
    check_port 10257

    echo "All required ports for the control plane are now open."

elif [ "$NODE_TYPE" == "worker" ]; then
    echo "Opening ports for Kubernetes Worker Node..."

    # Kubelet API for worker node
    sudo ufw allow 10250/tcp
    check_port 10250

    # NodePort services
    sudo ufw allow 30000:32767/tcp
    check_port 30000
    check_port 32767

    echo "All required ports for the worker node are now open."

else
    echo "Invalid input. Please enter 'control-plane' or 'worker'."
    exit 1
fi