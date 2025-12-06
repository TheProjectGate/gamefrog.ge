import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, '../data/payment-test-mode.json');

interface PaymentTestModeState {
  enabled: boolean;
  updatedAt: string;
}

let cachedState: PaymentTestModeState | null = null;

const readStateFromDisk = async (): Promise<PaymentTestModeState> => {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PaymentTestModeState>;
    return {
      enabled: Boolean(parsed.enabled),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      logger.warn('[PaymentTestMode] Failed to read state from disk:', error);
    }
    return {
      enabled: false,
      updatedAt: new Date().toISOString(),
    };
  }
};

const writeStateToDisk = async (state: PaymentTestModeState) => {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(state, null, 2), 'utf-8');
};

export const getGlobalPaymentTestModeState = async (): Promise<PaymentTestModeState> => {
  if (!cachedState) {
    cachedState = await readStateFromDisk();
  }
  return cachedState;
};

export const isGlobalPaymentTestModeEnabled = async (): Promise<boolean> => {
  const state = await getGlobalPaymentTestModeState();
  return state.enabled;
};

export const setGlobalPaymentTestMode = async (enabled: boolean): Promise<PaymentTestModeState> => {
  cachedState = {
    enabled,
    updatedAt: new Date().toISOString(),
  };

  await writeStateToDisk(cachedState);
  logger.info(`[PaymentTestMode] Global test mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
  return cachedState;
};


