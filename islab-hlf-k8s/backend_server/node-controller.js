const express = require('express');
const { exec } = require('child_process');

const router = express.Router();

// 노드 클러스터 가입
router.post('/join', (req, res) => {
    const { token, discovery_token_ca_cert_hash, master_ip, inventory_file } = req.body;

    if (!token || !discovery_token_ca_cert_hash || !master_ip || !inventory_file) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const command = `ansible-playbook -i ${inventory_file} join-cluster.yaml --extra-vars "master_ip=${master_ip} token=${token} discovery_token_ca_cert_hash=${discovery_token_ca_cert_hash}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ success: false, error: stderr });
        }
        res.json({ success: true, output: stdout });
    });
});

module.exports = router;
