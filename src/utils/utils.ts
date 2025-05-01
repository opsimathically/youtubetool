/* eslint-disable @typescript-eslint/no-explicit-any */
import fs_promises from 'fs/promises';
import readline from 'readline';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const exec_async = promisify(exec);

import * as fs from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';

async function read_json_file<T = unknown>(file_path: string): Promise<T> {
  try {
    const absolute_path = path.resolve(file_path);
    const file_contents = await fs_promises.readFile(absolute_path, 'utf-8');
    return JSON.parse(file_contents) as T;
  } catch (error) {
    throw new Error(`Failed to read or parse JSON file: ${error}`);
  }
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// Note: This function is dangerous, only use it if you know exactly what you're doing.
async function runShellScript(script: string) {
  try {
    const { stdout, stderr } = await exec_async(script);
    return { stdout, stderr };
  } catch (err: any) {
    return { error: err.message, stderr: err.stderr };
  }
}

function sha1File(file_path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1');
    const stream = fs.createReadStream(file_path);

    stream.on('data', (chunk) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

export { read_json_file, askQuestion, runShellScript, sha1File };
