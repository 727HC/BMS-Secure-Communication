const { exec } = require("child_process");

// 명령어 실행 함수 (비동기)
const runCommand = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ ERROR: ${cmd} 실행 중 오류 발생`);
        console.error(stderr || error.message);
        reject(stderr || error.message);
      } else {
        console.log(`✅ 실행 완료: ${cmd}`);
        resolve(stdout.trim());
      }
    });
  });
};

module.exports = { runCommand };
