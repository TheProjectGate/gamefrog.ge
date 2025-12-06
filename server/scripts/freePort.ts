/**
 * Utility script to free a port by killing the process using it
 * Usage: tsx server/scripts/freePort.ts <port>
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const port = process.argv[2];

if (!port) {
  console.error('❌ Please provide a port number');
  console.log('Usage: tsx server/scripts/freePort.ts <port>');
  process.exit(1);
}

const portNumber = parseInt(port, 10);
if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
  console.error('❌ Invalid port number');
  process.exit(1);
}

async function freePort(port: number) {
  try {
    console.log(`🔍 Finding process using port ${port}...`);
    
    // Windows command to find process using port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    
    if (!stdout.trim()) {
      console.log(`✅ Port ${port} is already free`);
      return;
    }

    // Parse PID from netstat output
    // Format: TCP    0.0.0.0:4001    0.0.0.0:0    LISTENING    12345
    const lines = stdout.trim().split('\n');
    const pids = new Set<number>();
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(parseInt(pid, 10))) {
        pids.add(parseInt(pid, 10));
      }
    }

    if (pids.size === 0) {
      console.log(`✅ Port ${port} is already free`);
      return;
    }

    console.log(`📋 Found ${pids.size} process(es) using port ${port}:`);
    for (const pid of pids) {
      console.log(`   PID: ${pid}`);
    }

    console.log(`\n🔄 Killing process(es)...`);
    
    // Kill each process
    for (const pid of pids) {
      try {
        await execAsync(`taskkill /PID ${pid} /F`);
        console.log(`✅ Killed process ${pid}`);
      } catch (error: any) {
        if (error.message.includes('not found')) {
          console.log(`⚠️  Process ${pid} not found (may have already terminated)`);
        } else {
          console.error(`❌ Failed to kill process ${pid}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Port ${port} should now be free`);
  } catch (error: any) {
    if (error.message.includes('findstr')) {
      console.log(`✅ Port ${port} is already free`);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

freePort(portNumber);

