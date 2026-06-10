const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { sendPromptToAntigravityChat } = require('./gui-bridge');

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.join(__dirname, '..');
const ANTIGRAVITY_COMMAND = process.env.ANTIGRAVITY_COMMAND || 'antigravity-ide';

// Ensure directories exist
function ensureDirs() {
  const reportsDir = path.join(PROJECT_ROOT, 'telegram-agent', 'reports');
  const logsDir = path.join(PROJECT_ROOT, 'telegram-agent', 'logs');

  [reportsDir, logsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  return { reportsDir, logsDir };
}

// Poll for report file to be written by the Agent
function waitForReport(reportPath, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (fs.existsSync(reportPath)) {
        clearInterval(interval);
        // Wait a moment for file write completion
        setTimeout(() => {
          try {
            const content = fs.readFileSync(reportPath, 'utf8');
            resolve(content);
          } catch (err) {
            reject(err);
          }
        }, 500);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timeout: Antigravity không phản hồi sau ${timeoutMs / 1000} giây. Không tìm thấy file report tại ${reportPath}`));
      }
    }, 5000); // poll every 5 seconds
  });
}

function runAntigravityPrompt({ taskId, mode, prompt }) {
  if (process.env.USE_ANTIGRAVITY_GUI_BRIDGE === 'true') {
    return sendPromptToAntigravityChat(prompt);
  }
  return new Promise((resolve, reject) => {
    const logDir = path.join(PROJECT_ROOT, 'telegram-agent', 'logs');
    fs.mkdirSync(logDir, { recursive: true });

    const logPath = path.join(logDir, `${taskId}-${mode}.log`);

    let stdout = '';
    let stderr = '';

    // If command is 'antigravity-ide', use absolute path to ensure shell: false execution is reliable
    let cmd = ANTIGRAVITY_COMMAND;
    if (cmd === 'antigravity-ide') {
      const fullPath = '/Users/dangkhoa/.antigravity-ide/antigravity-ide/bin/antigravity-ide';
      if (fs.existsSync(fullPath)) {
        cmd = fullPath;
      }
    }

    const child = spawn(cmd, ['-'], {
      cwd: PROJECT_ROOT,
      shell: false,
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Timeout: Antigravity không phản hồi sau 120 giây. Log: ${logPath}`));
    }, 120000);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      const logContent = `
=== TASK ${taskId} | MODE ${mode} ===
Command: ${ANTIGRAVITY_COMMAND} -
Exit code: ${code}

=== PROMPT ===
${prompt}

=== STDOUT ===
${stdout}

=== STDERR ===
${stderr}
`;

      fs.writeFileSync(logPath, logContent, 'utf8');

      if (code !== 0) {
        reject(new Error(`Antigravity lỗi. Exit code: ${code}. ${stderr}`));
        return;
      }

      resolve({
        stdout,
        stderr,
        logPath,
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Execute Plan Mode
async function executePlan(taskId, taskContent) {
  ensureDirs();
  const prompt = `Bạn là Antigravity agent đang làm việc trong project hiện tại.

Hãy đọc AGENT_RULES.md trước.

CHẾ ĐỘ: PLAN ONLY
Không sửa code.
Không chạy lệnh thay đổi file.
Không chạy deploy.
Không git push.
Không xóa file.

TASK ID: ${taskId}

YÊU CẦU TỪ TELEGRAM:
${taskContent}

Hãy phân tích project và trả về:
1. Mục tiêu
2. Các file cần kiểm tra
3. Kế hoạch thực hiện
4. Rủi ro
5. Cách xác thực
6. Có cần user approve trước khi chạy không

Chỉ trả về kế hoạch, chưa thực hiện.
Ghi kết quả plan vào telegram-agent/reports/${taskId}-plan.md`;

  const reportPath = path.join(PROJECT_ROOT, 'telegram-agent', 'reports', `${taskId}-plan.md`);

  const runPromise = runAntigravityPrompt({ taskId, mode: 'plan', prompt });
  const reportPromise = waitForReport(reportPath, 120000);

  return await Promise.race([
    runPromise.then(() => reportPromise),
    reportPromise
  ]);
}

// Execute Run Mode
async function executeRun(taskId, taskContent) {
  ensureDirs();
  const prompt = `Bạn là Antigravity agent đang làm việc trong project hiện tại.

Hãy đọc AGENT_RULES.md trước.

CHẾ ĐỘ: RUN APPROVED TASK
Task này đã được user approve.

TASK ID: ${taskId}

YÊU CẦU:
${taskContent}

YÊU CẦU THỰC THI:
1. Chỉ phân tích và báo cáo.
2. Không sửa giao diện.
3. Không đổi chức năng.
4. Không deploy.
5. Không git push.
6. Tạo báo cáo kết quả.

Trả về:
- File đã kiểm tra
- Vấn đề tìm thấy
- Mức độ ảnh hưởng
- Đề xuất xử lý
- Bước tiếp theo
Ghi báo cáo vào telegram-agent/reports/${taskId}-run.md`;

  const reportPath = path.join(PROJECT_ROOT, 'telegram-agent', 'reports', `${taskId}-run.md`);

  const runPromise = runAntigravityPrompt({ taskId, mode: 'run', prompt });
  const reportPromise = waitForReport(reportPath, 120000);

  return await Promise.race([
    runPromise.then(() => reportPromise),
    reportPromise
  ]);
}

module.exports = {
  runAntigravityPrompt,
  executePlan,
  executeRun
};
