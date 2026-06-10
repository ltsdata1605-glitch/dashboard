/**
 * Telegram Agent Bot
 * Runs independently to poll commands, manage task queues, and invoke the Antigravity Agent.
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');
const net = require('net');
const TelegramBot = require('node-telegram-bot-api');
const { isSafeInput } = require('./safety');
const runner = require('./antigravity-runner');

// Load environment variables
const botDir = __dirname;
const projectRootDir = path.join(botDir, '..');

// Try bot's local .env first, fallback to root .env/env.local
require('dotenv').config({ path: path.join(botDir, '.env') });
if (!process.env.TELEGRAM_BOT_TOKEN) {
  require('dotenv').config({ path: path.join(projectRootDir, '.env.local') });
}
if (!process.env.TELEGRAM_BOT_TOKEN) {
  require('dotenv').config({ path: path.join(projectRootDir, '.env') });
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedUser = process.env.TELEGRAM_ALLOWED_USER_ID;
const projectRoot = process.env.PROJECT_ROOT || projectRootDir;
const defaultCommand = process.env.ANTIGRAVITY_COMMAND || 'npm run lint';

// Read config options
const AUTO_PLAN_ON_TASK = process.env.AUTO_PLAN_ON_TASK !== 'false'; // Default to true
const AUTO_APPROVE = process.env.AUTO_APPROVE === 'true'; // Default to false
const AUTO_RUN_AFTER_APPROVE = process.env.AUTO_RUN_AFTER_APPROVE !== 'false'; // Default to true


if (!token) {
  console.error('[ERR] TELEGRAM_BOT_TOKEN is missing in environment variables. Check .env configurations.');
  process.exit(1);
}

// Initialize Telegram Bot (using long polling)
const bot = new TelegramBot(token, { polling: true });

// Define paths
const queueDir = path.join(projectRoot, 'telegram-agent', 'queue');
const logsDir = path.join(projectRoot, 'telegram-agent', 'logs');
const tasksDir = path.join(projectRoot, 'tasks');
const stateDir = path.join(projectRoot, 'telegram-agent', 'state');

const queueFile = path.join(queueDir, 'tasks.json');
const inboxFile = path.join(tasksDir, 'inbox.md');
const approvedFile = path.join(tasksDir, 'approved.md');
const reportsFile = path.join(tasksDir, 'reports.md');
const stateFile = path.join(stateDir, 'user-state.json');
const localServerFile = path.join(stateDir, 'local-server.json');

// Ensure directories exist
[queueDir, logsDir, tasksDir, stateDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize queue file if not exists
if (!fs.existsSync(queueFile)) {
  fs.writeFileSync(queueFile, JSON.stringify([], null, 2), 'utf8');
}

// Initialize state file if not exists
if (!fs.existsSync(stateFile)) {
  fs.writeFileSync(stateFile, JSON.stringify({}, null, 2), 'utf8');
}


// Track active processes
let activeProcess = null;
let activeTaskId = null;
let activeDevServerProcess = null;
let activeDevServerTaskId = null;

const LOCALHOST_KEYWORDS = [
  'chạy localhost',
  'chạy local',
  'start project',
  'mở dự án',
  'run dev',
  'npm run dev',
  'chạy dự án'
];

function getTaskType(content) {
  const normalized = content.toLowerCase();
  const isLocalhost = LOCALHOST_KEYWORDS.some(kw => normalized.includes(kw));
  return isLocalhost ? 'RUN_LOCALHOST' : 'CODE_UPGRADE';
}

function generateLocalhostPlan(projectRoot, task) {
  let packageManager = 'npm';
  if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (fs.existsSync(path.join(projectRoot, 'bun.lockb'))) {
    packageManager = 'bun';
  }

  let scripts = {};
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      scripts = pkg.scripts || {};
    } catch (e) {
      console.error(e);
    }
  }

  let selectedScript = 'dev';
  if (scripts.dev) {
    selectedScript = 'dev';
  } else if (scripts.start) {
    selectedScript = 'start';
  } else if (scripts.serve) {
    selectedScript = 'serve';
  } else if (scripts.preview) {
    selectedScript = 'preview';
  }

  let runCommand = '';
  if (packageManager === 'npm') {
    runCommand = `npm run ${selectedScript}`;
    if (selectedScript === 'dev' || selectedScript === 'start') {
      runCommand += ' -- --host 127.0.0.1';
    }
  } else if (packageManager === 'pnpm') {
    runCommand = `pnpm ${selectedScript}`;
    if (selectedScript === 'dev' || selectedScript === 'start') {
      runCommand += ' --host 127.0.0.1';
    }
  } else if (packageManager === 'yarn') {
    runCommand = `yarn ${selectedScript}`;
    if (selectedScript === 'dev' || selectedScript === 'start') {
      runCommand += ' --host 127.0.0.1';
    }
  } else if (packageManager === 'bun') {
    runCommand = `bun run ${selectedScript}`;
    if (selectedScript === 'dev' || selectedScript === 'start') {
      runCommand += ' --host 127.0.0.1';
    }
  } else {
    runCommand = `${packageManager} run ${selectedScript}`;
    if (selectedScript === 'dev' || selectedScript === 'start') {
      runCommand += ' -- --host 127.0.0.1';
    }
  }
  const port = 5173; // Default for Vite

  const planText = `📋 <b>Kế hoạch khởi chạy Localhost cho ${task.id}:</b>\n\n` +
    `• <b>Trình quản lý gói</b>: <code>${packageManager}</code>\n` +
    `• <b>Script được chọn</b>: <code>${selectedScript}</code>\n` +
    `• <b>Lệnh thực thi</b>: <code>${runCommand}</code>\n` +
    `• <b>Cổng kết nối dự kiến</b>: <code>${port}</code>\n\n` +
    `<b>Các bước thực hiện khi chạy:</b>\n` +
    `1. Khởi chạy tiến trình nền với lệnh: <code>${runCommand}</code>\n` +
    `2. Lắng nghe và kiểm tra kết nối tới cổng <code>${port}</code>\n` +
    `3. Báo cáo URL localhost khi kết nối thành công.`;

  return { planText, runCommand, port, packageManager };
}

console.log(`[SYS] Telegram Bot is starting...`);
console.log(`[SYS] Allowed User ID: ${allowedUser || 'Not configured (Access denied to everyone!)'}`);
console.log(`[SYS] Project Root: ${projectRoot}`);

// Telegraf-like Context Wrapper
function getContext(msg) {
  return {
    message: msg,
    from: msg.from,
    chat: msg.chat,
    reply: (text, options) => bot.sendMessage(msg.chat.id, text, options)
  };
}

// Authenticate user ID
function isAllowedUser(ctx) {
  const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID;
  return String(ctx.from.id) === String(allowedUserId);
}

// Custom wrapper to register commands like Telegraf
bot.command = (cmdName, handler) => {
  const regex = new RegExp(`^\\/${cmdName}(?:\\s+(.+))?$`, 'i');
  bot.onText(regex, (msg) => {
    const ctx = getContext(msg);
    handler(ctx);
  });
};

// Setup bot menu commands
async function setupBotCommands(botInstance) {
  try {
    await botInstance.setMyCommands([
      { command: "start", description: "Trang chủ" },
      { command: "task", description: "Tạo task" },
      { command: "current", description: "Task hiện tại" },
      { command: "list", description: "Danh sách task" },
      { command: "detail", description: "Chi tiết task" },
      { command: "plan", description: "Lập lại plan" },
      { command: "approve", description: "Duyệt task" },
      { command: "run", description: "Chạy task" },
      { command: "rerun", description: "Chạy lại task" },
      { command: "reject", description: "Từ chối task" },
      { command: "report", description: "Báo cáo" },
      { command: "status", description: "Trạng thái" },
      { command: "local", description: "Xem localhost port" },
      { command: "stop", description: "Dừng localhost/task" },
      { command: "help", description: "Hướng dẫn" }
    ]);
    console.log("✅ Telegram bot menu commands đã được thiết lập.");
  } catch (error) {
    console.error("❌ Lỗi khi thiết lập menu bot:", error);
  }
}

setupBotCommands(bot);


// Helper: Escape HTML special characters
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Helper: Get user state
function getUserState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading user state:', e);
  }
  return {};
}

// Helper: Save user state
function saveUserState(state) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving user state:', e);
  }
}

// Helper: Get currentTaskId for user
async function getCurrentTaskId(userId) {
  const state = getUserState();
  return state[userId]?.currentTaskId || null;
}

// Helper: Set currentTaskId for user
async function setCurrentTaskId(userId, taskId) {
  const state = getUserState();
  if (!state[userId]) {
    state[userId] = {};
  }
  state[userId].currentTaskId = taskId;
  state[userId].updatedAt = new Date().toISOString();
  saveUserState(state);
}

// Helper: Get Task ID from command arguments or fallback to user state
async function getTaskIdFromCommandOrCurrent(ctx, commandName) {
  const text = ctx.message.text || "";
  const parts = text.trim().split(/\s+/);
  const inputTaskId = parts[1];

  if (inputTaskId) {
    const formattedId = inputTaskId.toUpperCase();
    const task = await getTaskById(formattedId);
    if (!task) {
      await ctx.reply(`❌ Không tìm thấy task với ID \`${inputTaskId}\`.`);
      return null;
    }
    await setCurrentTaskId(ctx.from.id, formattedId);
    return formattedId;
  }

  const currentTaskId = await getCurrentTaskId(ctx.from.id);

  if (!currentTaskId) {
    await ctx.reply(
      "❌ Chưa có task nào đang chọn.\n\n" +
      "Bạn có thể:\n" +
      "• Tạo task mới bằng /task\n" +
      "• Xem danh sách bằng /list\n" +
      "• Chọn task bằng /select TASK-12345"
    );
    return null;
  }

  return currentTaskId;
}

// Helper: Read queue
function getQueue() {
  try {
    const data = fs.readFileSync(queueFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading queue:', e);
    return [];
  }
}

// Helper: Save queue
function saveQueue(tasks) {
  try {
    fs.writeFileSync(queueFile, JSON.stringify(tasks, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving queue:', e);
  }
}

// Helper: Append markdown section
function appendMarkdown(filePath, title, content) {
  try {
    const divider = '\n---\n\n';
    const exists = fs.existsSync(filePath);
    const dateStr = new Date().toLocaleString('vi-VN');
    const header = `# ${title} (${dateStr})\n\n`;
    
    fs.appendFileSync(filePath, (exists ? divider : '') + header + content + '\n', 'utf8');
  } catch (e) {
    console.error(`Error appending to markdown file: ${filePath}`, e);
  }
}

// Check local port status (e.g. check if Vite server is up)
function checkPort(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(1500);
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}



// Helper: Task DB functions
async function createTask(content) {
  const tasks = getQueue();
  const taskId = `TASK-${Date.now().toString().slice(-6)}`;
  const type = getTaskType(content);
  
  const newTask = {
    id: taskId,
    description: content,
    content: content,
    status: 'pending',
    type: type,
    run_command: null,
    port: null,
    created_at: new Date().toISOString(),
    plan_file: null,
    executed_at: null,
    completed_at: null
  };
  
  tasks.push(newTask);
  saveQueue(tasks);
  
  // Log into tasks/inbox.md
  const markdownContent = `## [${taskId}] ${content}\n` +
    `- **Trạng thái**: Pending\n` +
    `- **Loại task**: ${type}\n` +
    `- **Ngày tạo**: ${new Date().toLocaleString('vi-VN')}\n` +
    `- **Chi tiết yêu cầu**: ${content}\n`;
  appendMarkdown(inboxFile, `Task Inbox: ${taskId}`, markdownContent);
  
  return newTask;
}

async function getTaskById(taskId) {
  const tasks = getQueue();
  return tasks.find(t => t.id === taskId);
}

async function updateTaskStatus(taskId, status) {
  const tasks = getQueue();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.status = status;
    saveQueue(tasks);
  }
}

async function saveTaskPlan(taskId, plan) {
  const planFileName = `plan-${taskId}.md`;
  const planFilePath = path.join(tasksDir, planFileName);
  
  const tasks = getQueue();
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.plan_file = planFilePath;
    saveQueue(tasks);
  }
  
  fs.writeFileSync(planFilePath, plan, 'utf8');
  appendMarkdown(inboxFile, `Task Planning: ${taskId}`, `Task \`${taskId}\` đã chuyển sang trạng thái Planned. Đã tạo bản thảo kế hoạch tại \`tasks/${planFileName}\`.`);
}

async function runAntigravityPlan(task) {
  const descEscaped = escapeHTML(task.description || task.content);
  return `📋 <b>Kế hoạch cho ${task.id}:</b>\n${descEscaped}\n\n` +
    `<b>Mục tiêu:</b>\n` +
    `Nâng cấp ứng dụng theo yêu cầu: "${descEscaped}"\n\n` +
    `<b>Thay đổi đề xuất:</b>\n` +
    `• Phân tích các file liên quan trong project\n` +
    `• Sửa đổi mã nguồn an toàn theo chỉ dẫn của AGENT_RULES.md\n` +
    `• Thực hiện kiểm thử và chạy kiểm tra lint\n\n` +
    `<b>Kế hoạch xác thực:</b>\n` +
    `• Chạy lệnh kiểm tra biên dịch: npm run lint\n`;
}

// Shared Core function for task planning
async function createPlanForTask(taskId) {
  const task = await getTaskById(taskId);

  if (!task) {
    throw new Error("Không tìm thấy task.");
  }

  if (task.type === 'RUN_LOCALHOST') {
    const { planText, runCommand, port, packageManager } = generateLocalhostPlan(projectRoot, task);
    
    // Save run command, port, and package manager to queue
    const tasks = getQueue();
    const t = tasks.find(item => item.id === taskId);
    if (t) {
      t.run_command = runCommand;
      t.port = port;
      t.package_manager = packageManager;
      saveQueue(tasks);
    }
    
    await updateTaskStatus(taskId, "planned");
    await saveTaskPlan(taskId, planText);
    return planText;
  }

  // Call the runner to write bridge plan prompt, start IDE, and wait for report
  const plan = await runner.executePlan(task.id, task.description || task.content);

  await updateTaskStatus(taskId, "planned");
  await saveTaskPlan(taskId, plan);

  return plan;
}



// Shared Core function for executing approved tasks
async function runApprovedTask(taskId, ctx) {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error(`Không tìm thấy task: ${taskId}`);
  }

  if (task.status !== 'approved') {
    throw new Error(`Task ${taskId} chưa được phê duyệt. Trạng thái hiện tại: ${task.status.toUpperCase()}`);
  }

  if (activeProcess) {
    throw new Error(`Đang có một task khác đang chạy (${activeTaskId}). Vui lòng chờ.`);
  }

  await updateTaskStatus(taskId, "running");
  activeTaskId = taskId;
  activeProcess = { pid: 'localhost-dev-server' };

  try {
    if (task.type === 'RUN_LOCALHOST') {
      const runCommand = task.run_command || `npm run dev -- --host 127.0.0.1`;
      const port = task.port || 5173;
      const packageManager = task.package_manager || 'npm';

      // Check if port is busy. If so, find a free port.
      let targetPort = port;
      while (await checkPort(targetPort, '127.0.0.1')) {
        console.log(`Port ${targetPort} is already in use, trying next port...`);
        targetPort++;
      }

      let finalCommand = runCommand;
      if (packageManager === 'npm') {
        if (finalCommand.includes(' -- ')) {
          finalCommand += ` --port ${targetPort}`;
        } else {
          finalCommand += ` -- --port ${targetPort}`;
        }
      } else {
        finalCommand += ` --port ${targetPort}`;
      }

      await ctx.reply(`🚀 <b>Bắt đầu khởi chạy server Localhost...</b>\n\n` +
        `• Lệnh chạy: <code>${finalCommand}</code>\n` +
        `• Đang chạy lệnh ngầm...`, { parse_mode: 'HTML' });

      // Kill existing server process in memory if any
      if (activeDevServerProcess) {
        if (activeDevServerProcess.pid && typeof activeDevServerProcess.pid === 'number') {
          try {
            process.kill(-activeDevServerProcess.pid, 'SIGKILL');
          } catch (e) {
            try {
              process.kill(activeDevServerProcess.pid, 'SIGKILL');
            } catch (err) {}
          }
        }
        activeDevServerProcess = null;
        activeDevServerTaskId = null;
      }

      // Also kill process from old local-server.json if exists
      if (fs.existsSync(localServerFile)) {
        try {
          const oldState = JSON.parse(fs.readFileSync(localServerFile, 'utf8'));
          if (oldState && oldState.pid) {
            try {
              process.kill(-oldState.pid, 'SIGKILL');
            } catch (e) {
              try {
                process.kill(oldState.pid, 'SIGKILL');
              } catch (err) {}
            }
          }
        } catch (e) {}
      }

      // Spawn the dev server process in background
      const child = spawn(finalCommand, [], {
        cwd: projectRoot,
        shell: true,
        detached: true
      });

      activeDevServerProcess = child;
      activeDevServerTaskId = taskId;

      let stdoutBuffer = '';
      let stderrBuffer = '';

      child.stdout.on('data', (data) => {
        stdoutBuffer += data.toString();
        console.log(`[DEV SERVER STDOUT] ${data.toString().trim()}`);
      });

      child.stderr.on('data', (data) => {
        stderrBuffer += data.toString();
        console.error(`[DEV SERVER STDERR] ${data.toString().trim()}`);
      });

      // Track child process exit
      let hasExited = false;
      let exitCode = null;
      child.on('close', (code) => {
        hasExited = true;
        exitCode = code;
        console.log(`[DEV SERVER EXITED] Code: ${code}`);
        if (activeDevServerProcess === child) {
          activeDevServerProcess = null;
          activeDevServerTaskId = null;
        }
        try {
          if (fs.existsSync(localServerFile)) {
            const data = JSON.parse(fs.readFileSync(localServerFile, 'utf8'));
            if (data && data.pid === child.pid) {
              fs.unlinkSync(localServerFile);
            }
          }
        } catch (e) {}
      });

      // Wait 3 seconds initially
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Poll the port to verify it started successfully up to 10 seconds total (7 additional seconds)
      const startTime = Date.now();
      const timeoutMs = 7000;
      let detectedPort = targetPort;
      let isUp = false;

      while (Date.now() - startTime < timeoutMs) {
        if (hasExited) {
          break;
        }

        // Search stdout for any port match
        const urlRegex = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):(\d+)/i;
        const match = stdoutBuffer.match(urlRegex);
        if (match && match[1]) {
          detectedPort = parseInt(match[1], 10);
        }

        // Check port connection
        const open = await checkPort(detectedPort, '127.0.0.1');
        if (open) {
          isUp = true;
          break;
        }

        if (detectedPort !== targetPort) {
          const defaultOpen = await checkPort(targetPort, '127.0.0.1');
          if (defaultOpen) {
            detectedPort = targetPort;
            isUp = true;
            break;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!isUp) {
        if (!hasExited) {
          try {
            process.kill(-child.pid, 'SIGKILL');
          } catch (e) {
            try {
              process.kill(child.pid, 'SIGKILL');
            } catch (err) {}
          }
        }
        
        let errorMsg = `Không thể kết nối tới server localhost sau 10 giây.`;
        if (stdoutBuffer.trim()) {
          errorMsg += `\n\n<b>Stdout:</b>\n<pre>${escapeHTML(stdoutBuffer.slice(-1000))}</pre>`;
        }
        if (stderrBuffer.trim()) {
          errorMsg += `\n\n<b>Stderr:</b>\n<pre>${escapeHTML(stderrBuffer.slice(-1000))}</pre>`;
        }
        throw new Error(errorMsg);
      }

      await updateTaskStatus(taskId, "completed");

      const localUrl = `http://localhost:${detectedPort}`;

      // Write execution report to reports.md
      const reportText = `### [${taskId}] THÀNH CÔNG\n` +
        `- **Nội dung task**: ${task.description}\n` +
        `- **Thời gian kết thúc**: ${new Date().toLocaleString('vi-VN')}\n` +
        `- **Kết quả**: Localhost đã chạy tại URL: ${localUrl}\n`;
      appendMarkdown(reportsFile, `Execution Report: ${taskId}`, reportText);

      // Write execution report to reports/[TASK-ID]-run.md
      const reportDir = path.join(projectRoot, 'telegram-agent', 'reports');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      const reportPath = path.join(reportDir, `${taskId}-run.md`);
      const runReportContent = `# BÁO CÁO THỰC THI TASK ${taskId}
- **Loại task**: RUN_LOCALHOST
- **Lệnh chạy**: \`${finalCommand}\`
- **Port hoạt động**: ${detectedPort}
- **Trạng thái**: THÀNH CÔNG
- **URL**: ${localUrl}
- **Thời gian**: ${new Date().toLocaleString('vi-VN')}
`;
      fs.writeFileSync(reportPath, runReportContent, 'utf8');

      // Save PID server state to local-server.json
      fs.writeFileSync(localServerFile, JSON.stringify({
        pid: child.pid,
        port: detectedPort,
        url: localUrl,
        taskId: taskId,
        command: finalCommand,
        startedAt: new Date().toISOString()
      }, null, 2), 'utf8');

      await ctx.reply(`✅ <b>Localhost đã chạy thành công</b>\n` +
        `URL: ${localUrl}\n` +
        `Lệnh chạy: <code>${finalCommand}</code>`, { parse_mode: 'HTML' });

      return;
    }

    // Default Code Upgrade path
    await ctx.reply(`🚀 <b>Bắt đầu chạy task \`${taskId}\` trên laptop...</b>\n\n` +
      `• Đang gửi yêu cầu và khởi chạy Antigravity IDE...`, { parse_mode: 'HTML' });

    // Call the runner to write bridge run prompt, start IDE, and wait for report
    const report = await runner.executeRun(taskId, task.description || task.content);

    await updateTaskStatus(taskId, "completed");

    // Write execution report to task markdown file reports.md
    const reportText = `### [${taskId}] THÀNH CÔNG\n` +
      `- **Nội dung task**: ${task.description}\n` +
      `- **Thời gian kết thúc**: ${new Date().toLocaleString('vi-VN')}\n` +
      `- **Kết quả**: Completed\n`;
    appendMarkdown(reportsFile, `Execution Report: ${taskId}`, reportText);

    // Send the report back to Telegram
    await ctx.reply(`🏆 <b>Task \`${taskId}\` đã hoàn thành THÀNH CÔNG!</b>\n\n` +
      `📝 <b>Báo cáo kết quả:</b>\n\n${report}`, { parse_mode: 'HTML' });

  } catch (error) {
    await updateTaskStatus(taskId, "failed");

    const reportText = `### [${taskId}] THẤT BẠI\n` +
      `- **Nội dung task**: ${task.description}\n` +
      `- **Lỗi**: ${error.message}\n` +
      `- **Trạng thái**: Failed\n`;
    appendMarkdown(reportsFile, `Execution Report (Failed): ${taskId}`, reportText);

    await ctx.reply(`💥 <b>Task \`${taskId}\` thất bại!</b>\n\n` +
      `❌ <b>Lỗi:</b> ${error.message}`, { parse_mode: 'HTML' });
  } finally {
    activeProcess = null;
    activeTaskId = null;
  }
}

// --- COMMAND HANDLERS IN TELEGRAF-LIKE SYNTAX ---

// Start
bot.command("start", async (ctx) => {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");
  
  const text = `🤖 **Antigravity Remote Bot**\n\n` +
    `Chọn thao tác nhanh dưới đây hoặc sử dụng menu lệnh:`;
    
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '➕ Tạo task', callback_data: 'create_task_help' },
          { text: '📋 Danh sách task', callback_data: 'list_tasks' }
        ],
        [
          { text: '📊 Báo cáo', callback_data: 'latest_report' },
          { text: '⚙️ Trạng thái', callback_data: 'bot_status' }
        ],
        [
          { text: '❓ Hướng dẫn', callback_data: 'help' }
        ]
      ]
    }
  };
  
  ctx.reply(text, options);
});

// Help
async function handleHelpCommand(ctx) {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");
  
  const text = `🤖 **HƯỚNG DẪN SỬ DỤNG BOT**\n\n` +
    `**Lệnh chính:**\n\n` +
    `• \`/task <nội dung>\`\n` +
    `Tạo yêu cầu mới. Bot sẽ tự động phân tích và lập kế hoạch.\n` +
    `Ví dụ: \`/task Tối ưu mobile, giảm lag, không đổi giao diện\`\n\n` +
    `• \`/list\`\n` +
    `Xem danh sách task.\n\n` +
    `• \`/detail <TASK_ID>\`\n` +
    `Xem chi tiết task.\n\n` +
    `• \`/approve <TASK_ID>\`\n` +
    `Duyệt task sau khi xem kế hoạch.\n\n` +
    `• \`/run <TASK_ID>\`\n` +
    `Chạy task đã duyệt.\n\n` +
    `• \`/report\`\n` +
    `Xem báo cáo mới nhất.\n\n` +
    `• \`/status\`\n` +
    `Kiểm tra trạng thái bot.`;
  ctx.reply(text, { parse_mode: 'Markdown' });
}
bot.command("help", handleHelpCommand);


// Status
async function handleStatusCommand(ctx) {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");
  
  // System metrics
  const freeMemGb = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
  const totalMemGb = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
  const cpuLoad = os.loadavg();
  const laptopUptimeHours = (os.uptime() / 3600).toFixed(1);
  
  // App status (Port 5173 is the default Vite dev server)
  const isViteRunning = await checkPort(5173, '127.0.0.1');
  const appStatus = isViteRunning ? '🟢 Đang chạy (127.0.0.1:5173)' : '🔴 Đang dừng';
  const devServerStatus = activeDevServerProcess ? `🟢 Đang chạy ngầm (\`${activeDevServerTaskId}\`)` : '🔴 Đang dừng';
  
  const text = `📊 **Trạng thái hệ thống:**\n\n` +
    `• **App Chính (Localhost)**: ${appStatus}\n` +
    `• **Dev Server của Bot**: ${devServerStatus}\n` +
    `• **Hoạt động Bot**: 🟢 Online\n` +
    `• **Thời gian chạy Laptop**: ${laptopUptimeHours} giờ\n` +
    `• **Bộ nhớ RAM trống**: ${freeMemGb} GB / ${totalMemGb} GB\n` +
    `• **Tải CPU (1/5/15 min)**: ${cpuLoad.map(v => v.toFixed(2)).join(' / ')}\n` +
    `• **Đang chạy task**: ${activeTaskId ? `\`${activeTaskId}\`` : 'Không'}`;
  
  ctx.reply(text, { parse_mode: 'Markdown' });
}
bot.command("status", handleStatusCommand);

// Task
bot.command("task", async (ctx) => {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const content = ctx.message.text.replace("/task", "").trim();

  if (!content) {
    return ctx.reply("Vui lòng nhập nội dung task. Ví dụ: /task Tối ưu mobile");
  }

  if (!isSafeInput(content)) {
    return ctx.reply("⚠️ Lệnh chứa từ khóa nguy hại hoặc bị cấm bởi bộ lọc bảo mật. Thao tác bị từ chối.");
  }

  const task = await createTask(content);
  await setCurrentTaskId(ctx.from.id, task.id);

  await ctx.reply(
    `✅ <b>Đã tạo task thành công!</b>\n\n` +
    `• ID: <code>${task.id}</code>\n` +
    `• Trạng thái: <code>${task.status}</code>\n` +
    `• Nội dung: ${escapeHTML(task.content)}\n\n` +
    `🔎 Đang tự động phân tích và lập kế hoạch...`,
    { parse_mode: 'HTML' }
  );

  try {
    const plan = await createPlanForTask(task.id);

    const options = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Duyệt task', callback_data: 'approve_current' },
            { text: '🚀 Chạy task', callback_data: 'run_current' }
          ],
          [
            { text: '📋 Chi tiết', callback_data: 'detail_current' },
            { text: '❌ Từ chối', callback_data: 'reject_current' }
          ]
        ]
      }
    };

    await ctx.reply(
      `${plan}\n\n` +
      `👉 Nếu đồng ý, gửi: /approve hoặc chọn phím chức năng dưới đây:`,
      options
    );
  } catch (error) {
    await ctx.reply(
      `❌ Không thể tự động lập kế hoạch cho ${task.id}.\n\n` +
      `Lỗi: ${escapeHTML(error.message)}\n\n` +
      `Bạn có thể thử lại bằng lệnh:\n` +
      `/plan ${task.id}`
    );
  }
});

// Plan
bot.command("plan", async (ctx) => {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const taskId = await getTaskIdFromCommandOrCurrent(ctx, "plan");
  if (!taskId) return;

  await ctx.reply(`🔎 Đang lập kế hoạch cho ${taskId}...`);

  try {
    const plan = await createPlanForTask(taskId);

    const options = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Duyệt task', callback_data: 'approve_current' },
            { text: '🚀 Chạy task', callback_data: 'run_current' }
          ],
          [
            { text: '📋 Chi tiết', callback_data: 'detail_current' },
            { text: '❌ Từ chối', callback_data: 'reject_current' }
          ]
        ]
      }
    };

    await ctx.reply(
      `${plan}\n\n` +
      `👉 Nếu đồng ý, gửi: /approve hoặc chọn phím chức năng dưới đây:`,
      options
    );
  } catch (error) {
    await ctx.reply(`❌ Lỗi khi lập kế hoạch: ${escapeHTML(error.message)}`);
  }
});


// List
async function handleListCommand(ctx) {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");
  
  const tasks = getQueue();
  if (tasks.length === 0) {
    return ctx.reply('📭 Danh sách hàng đợi rỗng. Chưa có task nào được tạo.');
  }
  
  const categories = {
    pending: [],
    planning: [],
    planned: [],
    approved: [],
    running: [],
    completed: [],
    rejected: [],
    failed: []
  };
  
  tasks.forEach(t => {
    if (categories[t.status]) {
      categories[t.status].push(t);
    } else {
      categories.pending.push(t);
    }
  });
  
  let text = `📋 <b>Danh sách Task hiện tại:</b>\n\n`;
  
  const statusEmoji = {
    pending: '⏳ Chờ lập kế hoạch',
    planning: '🧠 Đang lập kế hoạch',
    planned: '📝 Đã lập kế hoạch',
    approved: '✅ Đã duyệt',
    running: '🚀 Đang chạy',
    completed: '🏆 Đã hoàn thành',
    rejected: '🚫 Đã từ chối',
    failed: '💥 Thất bại'
  };

  Object.keys(categories).forEach(status => {
    const list = categories[status];
    if (list.length > 0) {
      text += `🔹 <b>${statusEmoji[status]} (${list.length}):</b>\n`;
      list.forEach(t => {
        const descEscaped = escapeHTML(t.description.substring(0, 45) + (t.description.length > 45 ? '...' : ''));
        text += `  • <code>${t.id}</code> - ${descEscaped}\n`;
      });
      text += '\n';
    }
  });
  
  ctx.reply(text, { parse_mode: 'HTML' });
}
bot.command("list", handleListCommand);

// Detail
async function handleDetailCommand(ctx) {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const taskId = await getTaskIdFromCommandOrCurrent(ctx, "detail");
  if (!taskId) return;

  const task = await getTaskById(taskId);
  if (!task) return ctx.reply(`❌ Không tìm thấy task với ID \`${taskId}\`.`);

  const text = `🔍 <b>Thông tin chi tiết Task:</b>\n\n` +
    `• <b>Mã ID</b>: <code>${task.id}</code>\n` +
    `• <b>Trạng thái</b>: <code>${task.status.toUpperCase()}</code>\n` +
    `• <b>Yêu cầu</b>: ${escapeHTML(task.description)}\n` +
    `• <b>Thời gian tạo</b>: ${new Date(task.created_at).toLocaleString('vi-VN')}\n` +
    `• <b>Thực thi lúc</b>: ${task.executed_at ? new Date(task.executed_at).toLocaleString('vi-VN') : 'Chưa chạy'}\n` +
    `• <b>Hoàn thành lúc</b>: ${task.completed_at ? new Date(task.completed_at).toLocaleString('vi-VN') : 'Chưa hoàn thành'}`;

  ctx.reply(text, { parse_mode: 'HTML' });
}
bot.command("detail", handleDetailCommand);

// Approve
async function handleApproveCommand(ctx) {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const taskId = await getTaskIdFromCommandOrCurrent(ctx, "approve");
  if (!taskId) return;

  const task = await getTaskById(taskId);
  if (!task) return ctx.reply(`❌ Không tìm thấy task với ID \`${taskId}\`.`);

  if (!task.plan_file || !fs.existsSync(task.plan_file)) {
    return ctx.reply(
      `❌ Task ${taskId} chưa có kế hoạch.\n\n` +
      `Hãy dùng /plan để lập kế hoạch trước.`
    );
  }

  if (task.status === "running") {
    return ctx.reply(`⚠️ Task ${taskId} đang chạy, không chạy lại.`);
  }

  if (task.status === "completed") {
    return ctx.reply(
      `⚠️ Task ${taskId} đã hoàn thành.\n\n` +
      `Nếu muốn chạy lại, hãy dùng /rerun ${taskId}.`
    );
  }

  await updateTaskStatus(taskId, "approved");

  // Write to tasks/approved.md
  const approvalContent = `## [${taskId}] APPROVED\n` +
    `- **Nội dung task**: ${task.description}\n` +
    `- **Ngày duyệt**: ${new Date().toLocaleString('vi-VN')}\n` +
    `- **Kế hoạch**: [plan-${taskId}.md](file://${task.plan_file})\n`;
  
  appendMarkdown(approvedFile, `Task Approved: ${taskId}`, approvalContent);

  if (AUTO_RUN_AFTER_APPROVE) {
    await ctx.reply(
      `✅ **Đã duyệt task: ${taskId}**\n\n` +
      `🚀 **Đang tự động chạy task...**\n` +
      `Vui lòng chờ báo cáo kết quả.`
    );
    try {
      await runApprovedTask(taskId, ctx);
    } catch (error) {
      await ctx.reply(`❌ Lỗi khi chạy task ${taskId}:\n\n${error.message}`);
    }
  } else {
    await ctx.reply(
      `✅ **Đã phê duyệt task hiện tại: \`${taskId}\`!**\n\n` +
      `Task đã được chuyển vào hàng đợi thực thi.\n\n` +
      `👉 Bấm \`/run\` để bắt đầu thực hiện.`, 
      { parse_mode: 'Markdown' }
    );
  }
}
bot.command("approve", handleApproveCommand);

// Run
async function handleRunCommand(ctx) {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const taskId = await getTaskIdFromCommandOrCurrent(ctx, "run");
  if (!taskId) return;

  try {
    await runApprovedTask(taskId, ctx);
  } catch (error) {
    await ctx.reply(`❌ Không thể chạy task ${taskId}:\n\n${error.message}`);
  }
}
bot.command("run", handleRunCommand);

// Rerun
async function handleRerunCommand(ctx) {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const taskId = await getTaskIdFromCommandOrCurrent(ctx, "rerun");
  if (!taskId) return;

  const task = await getTaskById(taskId);
  if (!task) return ctx.reply(`❌ Không tìm thấy task với ID \`${taskId}\`.`);

  // Reset task status to approved to bypass status checking in runApprovedTask
  await updateTaskStatus(taskId, "approved");

  try {
    await runApprovedTask(taskId, ctx);
  } catch (error) {
    await ctx.reply(`❌ Không thể chạy lại task ${taskId}:\n\n${error.message}`);
  }
}
bot.command("rerun", handleRerunCommand);

// Reject
async function handleRejectCommand(ctx) {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const taskId = await getTaskIdFromCommandOrCurrent(ctx, "reject");
  if (!taskId) return;

  const task = await getTaskById(taskId);
  if (!task) return ctx.reply(`❌ Không tìm thấy task với ID \`${taskId}\`.`);

  if (task.status === "completed" || task.status === "running") {
    return ctx.reply(`⚠️ Task ${taskId} đang chạy hoặc đã hoàn thành, không thể từ chối.`);
  }

  await updateTaskStatus(taskId, "rejected");
  await ctx.reply(`🚫 **Đã từ chối task: \`${taskId}\`**`, { parse_mode: 'Markdown' });
}
bot.command("reject", handleRejectCommand);

// (Using the core runApprovedTask defined earlier)
bot.command("run", handleRunCommand);

// Current
bot.command("current", async (ctx) => {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const taskId = await getCurrentTaskId(ctx.from.id);

  if (!taskId) {
    return ctx.reply(
      "❌ Hiện chưa có task nào đang chọn.\n\n" +
      "Hãy tạo task mới bằng /task hoặc chọn task bằng /select TASK-ID."
    );
  }

  const task = await getTaskById(taskId);
  if (!task) {
    return ctx.reply(`❌ Task \`${taskId}\` không còn tồn tại trong danh sách.`);
  }

  const detailText = `• <b>Mã ID</b>: <code>${task.id}</code>\n` +
    `• <b>Trạng thái</b>: <code>${task.status.toUpperCase()}</code>\n` +
    `• <b>Yêu cầu</b>: ${escapeHTML(task.description)}\n` +
    `• <b>Thời gian tạo</b>: ${new Date(task.created_at).toLocaleString('vi-VN')}`;

  const options = {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Duyệt task', callback_data: 'approve_current' },
          { text: '🚀 Chạy task', callback_data: 'run_current' }
        ],
        [
          { text: '📋 Chi tiết', callback_data: 'detail_current' },
          { text: '❌ Từ chối', callback_data: 'reject_current' }
        ]
      ]
    }
  };

  await ctx.reply(
    `📌 <b>Task hiện tại:</b>\n\n${detailText}\n\n` +
    `Bạn có thể chọn phím chức năng dưới đây hoặc dùng lệnh text:`,
    options
  );
});

// Select
bot.command("select", async (ctx) => {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const taskId = ctx.message.text.replace("/select", "").trim().toUpperCase();

  if (!taskId) {
    return ctx.reply("❌ Vui lòng nhập task ID. Ví dụ: /select TASK-052259");
  }

  const task = await getTaskById(taskId);

  if (!task) {
    return ctx.reply(`❌ Không tìm thấy task: ${taskId}`);
  }

  await setCurrentTaskId(ctx.from.id, taskId);

  await ctx.reply(
    `✅ **Đã chọn task hiện tại: \`${taskId}\`!**\n\n` +
    `Bây giờ bạn có thể bấm:\n` +
    `👉 /detail\n` +
    `👉 /approve\n` +
    `👉 /run`
  );
});

// Helper to check if PID is running
function isPidRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function getLocalServerState() {
  try {
    if (fs.existsSync(localServerFile)) {
      const data = fs.readFileSync(localServerFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading local server state:', e);
  }
  return null;
}

// Local
bot.command("local", async (ctx) => {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const state = getLocalServerState();
  if (!state || !state.pid) {
    return ctx.reply("🔴 Không có server localhost nào đang chạy ngầm.");
  }

  const pid = state.pid;
  const port = state.port || 5173;
  const running = isPidRunning(pid);
  const portOpen = await checkPort(port, '127.0.0.1');

  if (running && portOpen) {
    const timeStr = state.startedAt ? new Date(state.startedAt).toLocaleString('vi-VN') : 'Không rõ';
    return ctx.reply(
      `🟢 <b>Localhost đang chạy ngầm:</b>\n\n` +
      `• <b>URL</b>: ${state.url || `http://localhost:${port}`}\n` +
      `• <b>Port</b>: <code>${port}</code>\n` +
      `• <b>PID</b>: <code>${pid}</code>\n` +
      `• <b>Lệnh chạy</b>: <code>${state.command || 'N/A'}</code>\n` +
      `• <b>Task ID</b>: <code>${state.taskId || 'N/A'}</code>\n` +
      `• <b>Khởi chạy lúc</b>: ${timeStr}`,
      { parse_mode: 'HTML' }
    );
  } else {
    if (fs.existsSync(localServerFile)) {
      try {
        fs.unlinkSync(localServerFile);
      } catch (e) {}
    }
    return ctx.reply("🔴 Không có server localhost nào đang chạy ngầm.");
  }
});

// Stop
bot.command("stop", async (ctx) => {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  const state = getLocalServerState();
  const hasServerState = state && state.pid;

  if (!activeProcess && !activeDevServerProcess && !hasServerState) {
    return ctx.reply('ℹ️ Không có tiến trình hay server nào đang hoạt động.');
  }

  let killedSomething = false;

  try {
    if (activeProcess) {
      if (activeProcess.pid && typeof activeProcess.pid === 'number') {
        try {
          process.kill(-activeProcess.pid, 'SIGKILL');
        } catch (e) {
          try {
            process.kill(activeProcess.pid, 'SIGKILL');
          } catch (err) {}
        }
      }
      ctx.reply(`🛑 **Đã dừng theo dõi/thực thi Task \`${activeTaskId}\`.**`);
      await updateTaskStatus(activeTaskId, "failed");
      activeProcess = null;
      activeTaskId = null;
      killedSomething = true;
    }

    if (activeDevServerProcess) {
      if (activeDevServerProcess.pid && typeof activeDevServerProcess.pid === 'number') {
        try {
          process.kill(-activeDevServerProcess.pid, 'SIGKILL');
        } catch (e) {
          try {
            process.kill(activeDevServerProcess.pid, 'SIGKILL');
          } catch (err) {}
        }
      }
      ctx.reply(`🛑 **Đã dừng server localhost chạy ngầm (\`${activeDevServerTaskId}\`).**`);
      activeDevServerProcess = null;
      activeDevServerTaskId = null;
      killedSomething = true;
    }

    if (hasServerState) {
      const pid = state.pid;
      const taskId = state.taskId;
      try {
        process.kill(-pid, 'SIGKILL');
      } catch (e) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch (err) {}
      }
      
      if (taskId) {
        await updateTaskStatus(taskId, "failed");
      }
      
      ctx.reply(`🛑 **Đã dừng server localhost chạy ngầm (PID: ${pid}${taskId ? `, Task: ${taskId}` : ''}).**`);
      
      if (fs.existsSync(localServerFile)) {
        try {
          fs.unlinkSync(localServerFile);
        } catch (e) {}
      }
      killedSomething = true;
    }

    if (!killedSomething) {
      ctx.reply('ℹ️ Không thể xác định tiến trình hoạt động để dừng.');
    }
  } catch (e) {
    ctx.reply(`❌ Lỗi khi dừng tiến trình: ${e.message}`);
  }
});

// Report
async function handleReportCommand(ctx) {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  if (!fs.existsSync(reportsFile)) {
    return ctx.reply('📭 Chưa có báo cáo thực thi nào được lưu trữ.');
  }

  try {
    const data = fs.readFileSync(reportsFile, 'utf8');
    const lines = data.split('\n');
    const recent = lines.slice(-40).join('\n');
    ctx.reply(`📄 **Báo cáo thực thi gần đây:**\n\n${recent || 'Rỗng'}`);
  } catch (e) {
    ctx.reply('❌ Không thể đọc báo cáo thực thi.');
  }
}
bot.command("report", handleReportCommand);

// Diff
bot.command("diff", async (ctx) => {
  if (!isAllowedUser(ctx)) return ctx.reply("Bạn không có quyền sử dụng bot này.");

  exec('git diff', { cwd: projectRoot }, (err, stdout, stderr) => {
    if (err && !stdout) {
      return ctx.reply(`❌ Lỗi khi chạy git diff: ${stderr || err.message}`);
    }

    const diffText = stdout.trim();
    if (!diffText) {
      return ctx.reply('✅ **Không có thay đổi nào trong code (Mọi thứ sạch sẽ!)**', { parse_mode: 'Markdown' });
    }

    if (diffText.length < 3500) {
      ctx.reply(`🔍 **Thay đổi mã nguồn hiện tại:**\n\`\`\`diff\n${diffText}\n\`\`\``, { parse_mode: 'Markdown' });
    } else {
      const diffTempFile = path.join(logsDir, `git-diff-${Date.now()}.diff`);
      fs.writeFileSync(diffTempFile, diffText, 'utf8');
      bot.sendDocument(ctx.chat.id, diffTempFile, { caption: '🔍 Bản phân tích thay đổi mã nguồn (git diff)' })
        .then(() => {
          fs.unlinkSync(diffTempFile);
        }).catch((e) => {
          console.error(e);
          ctx.reply('❌ Gửi tệp diff thất bại.');
        });
    }
  });
});

// Handle inline button callback queries
bot.on('callback_query', async (query) => {
  const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID;
  if (String(query.from.id) !== String(allowedUserId)) {
    return bot.answerCallbackQuery(query.id, { text: "Bạn không có quyền sử dụng bot này.", show_alert: true });
  }

  const data = query.data;
  const chatId = query.message.chat.id;

  const ctx = {
    message: query.message,
    from: query.from,
    chat: query.message.chat,
    reply: (text, options) => bot.sendMessage(chatId, text, options)
  };

  try {
    await bot.answerCallbackQuery(query.id);
  } catch (err) {
    console.error("Error answering callback query:", err);
  }

  switch (data) {
    case 'create_task_help':
      await ctx.reply("💡 Vui lòng nhập lệnh theo cú pháp:\n`/task <nội dung yêu cầu>`\n\nVí dụ:\n`/task Tối ưu mobile, giảm lag, không đổi giao diện`", { parse_mode: 'Markdown' });
      break;
    case 'list_tasks':
      await handleListCommand(ctx);
      break;
    case 'latest_report':
      await handleReportCommand(ctx);
      break;
    case 'bot_status':
      await handleStatusCommand(ctx);
      break;
    case 'help':
      await handleHelpCommand(ctx);
      break;
    case 'approve_current': {
      const currentTaskId = await getCurrentTaskId(query.from.id);
      if (!currentTaskId) {
        return ctx.reply("❌ Chưa có task nào đang chọn. Vui lòng tạo task mới bằng /task.");
      }
      const mockCtx = {
        message: {
          ...query.message,
          text: `/approve ${currentTaskId}`
        },
        from: query.from,
        chat: query.message.chat,
        reply: (text, options) => bot.sendMessage(chatId, text, options)
      };
      await handleApproveCommand(mockCtx);
      break;
    }
    case 'run_current': {
      const currentTaskId = await getCurrentTaskId(query.from.id);
      if (!currentTaskId) {
        return ctx.reply("❌ Chưa có task nào đang chọn. Vui lòng tạo task mới bằng /task.");
      }
      const mockCtx = {
        message: {
          ...query.message,
          text: `/run ${currentTaskId}`
        },
        from: query.from,
        chat: query.message.chat,
        reply: (text, options) => bot.sendMessage(chatId, text, options)
      };
      await handleRunCommand(mockCtx);
      break;
    }
    case 'detail_current': {
      const currentTaskId = await getCurrentTaskId(query.from.id);
      if (!currentTaskId) {
        return ctx.reply("❌ Chưa có task nào đang chọn. Vui lòng tạo task mới bằng /task.");
      }
      const mockCtx = {
        message: {
          ...query.message,
          text: `/detail ${currentTaskId}`
        },
        from: query.from,
        chat: query.message.chat,
        reply: (text, options) => bot.sendMessage(chatId, text, options)
      };
      await handleDetailCommand(mockCtx);
      break;
    }
    case 'reject_current': {
      const currentTaskId = await getCurrentTaskId(query.from.id);
      if (!currentTaskId) {
        return ctx.reply("❌ Chưa có task nào đang chọn. Vui lòng tạo task mới bằng /task.");
      }
      const mockCtx = {
        message: {
          ...query.message,
          text: `/reject ${currentTaskId}`
        },
        from: query.from,
        chat: query.message.chat,
        reply: (text, options) => bot.sendMessage(chatId, text, options)
      };
      await handleRejectCommand(mockCtx);
      break;
    }
  }
});

// Global error handling for polling errors
bot.on('polling_error', (error) => {
  console.warn(`[TELEGRAM WARNING] Polling error: ${error.code} - ${error.message}`);
});

bot.on('error', (error) => {
  console.error(`[TELEGRAM ERROR] Bot error:`, error);
});
