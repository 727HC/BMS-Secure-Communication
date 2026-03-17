const { execSync } = require("child_process");
const { runCommand } = require("./utils"); // 필수 패키지 검사 추가
// 필수 패키지 검사 함수
async function checkPrereqs() {
  try {
    // 1. ssh 설치
    await runCommand("bash ./env_sh/install_ssh.sh");
    console.log("✅ 실행 완료: bash install_ssh.sh");
    // 2. .env 파일 생성
    await runCommand("bash ./env_sh/save_unique_ids.sh");
    console.log("✅ 실행 완료: bash save_unique_ids.sh");

    // 3. Kubernetes 설치
    await runCommand("bash ./env_sh/install_k8s.sh");
    console.log("✅ 실행 완료: bash install_k8s.sh");

    // 4. 컨테이너 런타임 설치 (기본: containerd)
    await runCommand("bash ./env_sh/install_container_runtime.sh containerd");
    console.log("✅ 실행 완료: bash install_container_runtime.sh containerd");

    // 5. cgroup 설정 (systemd)
    await runCommand("bash ./env_sh/cgroup.sh $(hostname)");
    console.log("✅ 실행 완료: bash install_ssh.sh");

    // 6. 방화벽 포트 설정 (Control Plane or Worker 선택 가능)
    await runCommand('echo "control-plane" | bash ./env_sh/open_k8s_ports.sh');
    console.log("✅ 실행 완료: bash install_ssh.sh");

    // 7. 클러스터 초기화
    await runCommand("bash ./env_sh/create_cluster.sh");
    console.log("✅ 실행 완료: bash install_ssh.sh");

    // 8. Helm & Krew 설치
    await runCommand("bash ./env_sh/install_helm.sh");
    await runCommand("bash ./env_sh/install_krew.sh");
    console.log("✅ 실행 완료: bash install_ssh.sh");
    res.json({ status: "success", message: "Kubernetes 환경이 성공적으로 초기화되었습니다." });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
}

// 모듈 내보내기
module.exports = { checkPrereqs };