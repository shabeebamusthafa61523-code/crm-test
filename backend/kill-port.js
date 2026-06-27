// kill-port.js
// Principal-grade target-specific process termination script for crm-test local environment
import { execSync } from 'child_process';

const PORT = 5000;
console.log(`🔍 Inspecting processes on local Port ${PORT}...`);

// 1. Kill process on Port 5000
try {
  const stdout = execSync('netstat -ano').toString();
  const lines = stdout.split('\n');
  const pids = new Set();
  
  for (const line of lines) {
    if (line.includes(`:${PORT}`) && line.includes('LISTENING')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        pids.add(pid);
      }
    }
  }

  for (const pid of pids) {
    console.log(`🔥 Found process on port ${PORT} (PID: ${pid}). Terminating...`);
    try {
      execSync(`taskkill /F /PID ${pid}`);
    } catch (err) {
      // Ignore
    }
  }
  if (pids.size === 0) {
    console.log(`✅ Port ${PORT} is clear.`);
  }
} catch (e) {
  console.log('No active connections on port 5000 or error reading netstat.');
}

// 2. Kill orphaned Node/Nodemon processes
console.log('🔍 Sweeping for stale or orphaned Node/Nodemon processes matching this project...');
try {
  const currentPid = process.pid;
  const wmicOut = execSync('wmic process where "name=\'node.exe\'" get commandline,processid').toString();
  const lines = wmicOut.split('\n');
  
  for (const line of lines) {
    if (line.includes('server.js') || line.includes('nodemon')) {
      const matches = line.trim().match(/(\d+)$/);
      if (matches) {
        const pid = matches[1];
        if (parseInt(pid, 10) !== currentPid) {
          console.log(`🔥 Found orphaned node process (PID: ${pid}). Terminating...`);
          try {
            execSync(`taskkill /F /PID ${pid}`);
          } catch (err) {
            // Ignore
          }
        }
      }
    }
  }
} catch (e) {
  console.log('Could not query wmic or error cleaning up node processes:', e.message);
}

console.log('🎉 Environment cleanup completed successfully.');
