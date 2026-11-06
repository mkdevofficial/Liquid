/**
 * Task and Dev Server Process Manager
 * Runs liquid dev / build / preview / check in an embedded output pane,
 * detecting Local and LAN URLs as tappable/copyable items.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { EventEmitter } from 'node:events';

export class TaskRunner extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.currentTask = null; // 'dev' | 'build' | 'check' | 'preview'
    this.logs = [];
    this.maxLogs = 200;
    this.localUrl = null;
    this.networkUrl = null;
    this.visible = false;
  }

  isRunning() {
    return this.process !== null && !this.process.killed;
  }

  start(taskName, projectDir = process.cwd()) {
    if (this.isRunning()) {
      this.stop();
    }

    this.currentTask = taskName;
    this.logs = [];
    this.localUrl = null;
    this.networkUrl = null;
    this.visible = true;

    this._appendLog(`\x1b[36m[Liquid Task: ${taskName}]\x1b[0m Starting in ${projectDir}...`);

    // Locate liquid-cli binary
    const cliPath = path.resolve(import.meta.dirname, '../../../liquid-cli/bin/liquid.js');
    const args = [cliPath, taskName];

    if (taskName === 'dev') {
      args.push('--host', '0.0.0.0');
    }

    try {
      this.process = spawn(process.execPath, args, {
        cwd: projectDir,
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      const onData = (chunk) => {
        const text = chunk.toString('utf8');
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line) continue;
          this._appendLog(line);

          // Detect URLs
          const localMatch = line.match(/(http:\/\/(?:localhost|127\.0\.0\.1):\d+\/?)/i);
          if (localMatch) this.localUrl = localMatch[1];

          const netMatch = line.match(/(http:\/\/(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+):\d+\/?)/i);
          if (netMatch) this.networkUrl = netMatch[1];
        }

        this.emit('update');
      };

      this.process.stdout.on('data', onData);
      this.process.stderr.on('data', onData);

      this.process.on('close', (code) => {
        this.process = null;
        this._appendLog(`\x1b[33m[Liquid Task: ${taskName}]\x1b[0m Process exited with code ${code}.`);
        this.emit('update');
      });

      this.process.on('error', (err) => {
        this.process = null;
        this._appendLog(`\x1b[31m[Liquid Task Error]\x1b[0m ${err.message}`);
        this.emit('update');
      });
    } catch (err) {
      this._appendLog(`\x1b[31m[Task Error]\x1b[0m ${err.message}`);
      this.emit('update');
    }
  }

  stop() {
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch {}
      this.process = null;
      this._appendLog(`\x1b[33m[Liquid Task]\x1b[0m Stopped.`);
      this.emit('update');
    }
  }

  _appendLog(line) {
    this.logs.push(line);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }
}
