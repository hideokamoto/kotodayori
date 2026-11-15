import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateWorkersProject } from './workers.js';

// Mock dependencies
vi.mock('../utils/files.js', async () => {
  const actual = await vi.importActual('../utils/files.js');
  return {
    ...actual,
    copyTemplate: vi.fn(),
  };
});

vi.mock('../utils/install.js', () => ({
  installDependencies: vi.fn(),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    title: vi.fn(),
  },
}));

// Mock picocolors
vi.mock('picocolors', () => ({
  default: {
    bold: (s: string) => s,
    dim: (s: string) => s,
    cyan: (s: string) => s,
  },
}));

describe('Workers Generator', () => {
  const testDir = path.join(process.cwd(), 'test-generator');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('copies the workers template', async () => {
    const { copyTemplate } = await import('../utils/files.js');

    await generateWorkersProject({
      projectName: 'test-app',
      targetDir: testDir,
      packageManager: 'npm',
      shouldInstall: false,
    });

    expect(copyTemplate).toHaveBeenCalledWith('workers', testDir, {
      PROJECT_NAME: 'test-app',
      PACKAGE_MANAGER: 'npm',
    });
  });

  it('installs dependencies when shouldInstall is true', async () => {
    const { installDependencies } = await import('../utils/install.js');

    await generateWorkersProject({
      projectName: 'test-app',
      targetDir: testDir,
      packageManager: 'pnpm',
      shouldInstall: true,
    });

    expect(installDependencies).toHaveBeenCalledWith(testDir, 'pnpm');
  });

  it('skips install when shouldInstall is false', async () => {
    const { installDependencies } = await import('../utils/install.js');

    await generateWorkersProject({
      projectName: 'test-app',
      targetDir: testDir,
      packageManager: 'npm',
      shouldInstall: false,
    });

    expect(installDependencies).not.toHaveBeenCalled();
  });
});
