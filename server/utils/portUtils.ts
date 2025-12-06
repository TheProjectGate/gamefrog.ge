import { createServer } from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);

/**
 * Check if a port is available
 * @param port - Port number to check
 * @returns Promise that resolves to true if port is available, false otherwise
 */
export const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer();
    
    // Set timeout to avoid hanging
    const timeout = setTimeout(() => {
      server.close();
      resolve(false);
    }, 1000);
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      // EADDRINUSE means port is in use
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // Other errors might mean port is available but something else is wrong
        resolve(false);
      }
    });
    
    server.listen(port, () => {
      clearTimeout(timeout);
      // Port is available - close the test server
      server.close(() => {
        resolve(true);
      });
    });
  });
};

/**
 * Free port by killing process using it (Windows)
 * @param port - Port number to free
 * @returns Promise that resolves to true if port was freed successfully
 */
export const freePort = async (port: number): Promise<boolean> => {
  try {
    try {
      // Windows command to find process using port
      const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`);
      
      if (!stdout.trim()) {
        return true;
      }

      // Parse PID from netstat output
      const lines = stdout.trim().split('\n');
      const pids = new Set<number>();
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(parseInt(pid, 10))) {
          const pidNum = parseInt(pid, 10);
          // Don't kill ourselves or parent process
          if (pidNum !== process.pid && pidNum !== process.ppid) {
            pids.add(pidNum);
          }
        }
      }

      if (pids.size === 0) {
        return true;
      }

      logger.debug(`Port ${port} is in use by ${pids.size} process(es), freeing...`);
      
      // Kill each process and wait for each to ensure cleanup
      let killed = 0;
      for (const pid of pids) {
        try {
          await execAsync(`taskkill /PID ${pid} /F /T`);
          killed++;
        } catch (error: any) {
          if (error.message.includes('not found') || error.message.includes('does not exist')) {
            killed++;
          } else {
            // Try one more time with different approach
            try {
              await execAsync(`taskkill /F /T /FI "PID eq ${pid}"`);
              killed++;
            } catch {
              logger.warn(`Could not kill process ${pid}, may require admin rights`);
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (killed > 0) {
        // Wait for port to be fully released
        for (let i = 0; i < 15; i++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          const portAvailable = await isPortAvailable(port);
          if (portAvailable) {
            return true;
          }
        }
        logger.warn(`Port ${port} may still be in use after wait period`);
        return true;
      } else {
        logger.warn(`Could not kill any processes on port ${port}`);
        return false;
      }
    } catch (error: any) {
      // If findstr returns error, port is likely free
      if (error.code === 1 || error.message.includes('findstr')) {
        return true;
      }
      throw error;
    }
  } catch (error: any) {
    logger.warn(`Error checking/freeing port ${port}:`, error.message);
    return true;
  }
};

