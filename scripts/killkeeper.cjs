const cp = require("child_process");
let out = "";
try {
  out = cp.execSync('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /FORMAT:CSV 2>nul').toString();
} catch (e) {
  out = "ERR " + e.message;
}
const fs = require("fs");
fs.writeFileSync("C:/Users/Administrator/ps2.txt", out);
// kill keepers
out.split("\n").forEach((line) => {
  if (line.includes("keeper.mjs")) {
    const parts = line.split(",");
    const pid = parts[parts.length - 1].trim();
    if (/^\d+$/.test(pid)) {
      try { process.kill(Number(pid), "SIGKILL"); fs.appendFileSync("C:/Users/Administrator/ps2.txt", "\nKILLED " + pid); }
      catch (e) { fs.appendFileSync("C:/Users/Administrator/ps2.txt", "\nKILLFAIL " + pid + " " + e.message); }
    }
  }
});
