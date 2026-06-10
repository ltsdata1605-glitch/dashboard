const { execFile } = require("child_process");

function escapeAppleScriptString(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n");
}

function sendPromptToAntigravityChat(prompt) {
  return new Promise((resolve, reject) => {
    const appName = process.env.ANTIGRAVITY_APP_NAME || "Antigravity";
    const delayMs = Number(process.env.GUI_PASTE_DELAY_MS || 500);
    const safePrompt = escapeAppleScriptString(prompt);

    const script = `
      tell application "System Events"
        if not (exists process "${appName}") then
          error "Ứng dụng ${appName} chưa được mở. Vui lòng mở ứng dụng trước."
        end if
      end tell

      set the clipboard to "${safePrompt}"
      delay 0.2

      tell application "${appName}"
        activate
      end tell

      delay ${delayMs / 1000}

      tell application "System Events"
        keystroke "v" using command down
        delay 0.2
        key code 36
      end tell
    `;

    execFile("osascript", ["-e", script], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
        return;
      }

      resolve({
        stdout,
        stderr,
      });
    });
  });
}

module.exports = {
  sendPromptToAntigravityChat
};
