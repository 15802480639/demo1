const cp = require("child_process");
try {
  const o = cp.execSync('wmic logicaldisk where "DeviceID=\'D:\'" get DeviceID,DriveType,ProviderName /FORMAT:CSV 2>nul').toString();
  require("fs").writeFileSync("C:/Users/Administrator/drive.txt", o);
} catch (e) {
  require("fs").writeFileSync("C:/Users/Administrator/drive.txt", "ERR " + e.message);
}
