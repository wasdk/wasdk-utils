/*
 * Copyright 2016 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from "fs";
import * as tmp from "tmp";
import * as path from "path";
import * as http from "http";
import * as https from "https";

var rimraf: {sync: (string) => void;} = require('rimraf');
var mkdirp: {sync: (string) => void;} = require('mkdirp');
var spawnSyncFn = require('child_process').spawnSync;

var verbose = false;

export function setVerbose(enabled: boolean): void {
  verbose = enabled;
}

export let TMP_DIR = path.resolve(__dirname, '..', '.wasdk-tmp');

export function spawnSync(command: string, args: any [], options?: any): any {
  verbose && console.error(command + " " + args.join(" "));
  return spawnSyncFn(command, args, options);
}
export function ifWindows(s: string): string {
  return process.platform === 'win32' ? s : '';
}

export function fail(message) {
  throw new Error(message)
}
export function endsWith(subjectString: string, searchString: string): boolean {
  let position = subjectString.length;
  position -= searchString.length;
  var lastIndex = subjectString.lastIndexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
}
export function flatten(elements: any [], target?: any []) {
  if (!target) target = [];
  elements.forEach(element => {
    if (Array.isArray(element)) {
      flatten(element, target);
    } else {
      target.push(element);
    }
  });
  return target;
}
export function replaceBackslash(s: string): string {
  return s.split('\\').join('/');
}
export function doubleBackslash(s: string): string {
  return s.split('\\').join('\\\\');
}

export function appendFilesSync(output: string, input: string [], insertNewLine = false) {
  let files = input.map(file => fs.readFileSync(file, 'utf8'));
  files.forEach(file => {
    fs.appendFileSync(output, file);
    if (insertNewLine) {
      fs.appendFileSync(output, "\n");
    }
  });
}
function element<T>(array: T[], i): T {
  if (i >= 0) return array[i];
  return array[array.length + i];
}
export function pathLooksLikeDirectory(path: string) {
  if (path === ".") return true;
  let lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  let lastDot = path.lastIndexOf('.');
  let noSuffix = lastDot < lastSlash || lastDot === -1;
  if (noSuffix) return true;
  let suffix = path.substr(lastDot);
  if (suffix === ".exe" || suffix == ".zip") return false;
  return true;
}
export function ensureDirectoryCreatedSync(path: string) {
  mkdirp.sync(path);
}
export function downloadFileSync(url: string, filename: string, downloadEvenIfExists = false): boolean {
  mkdirp.sync(path.dirname(filename));
  if (fs.existsSync(filename) && !downloadEvenIfExists) {
    console.log(`File already downloaded, skipping.`);
    return true;
  }
  process.stdout.write(`Downloading `);
  return spawnDownloadFileSync(url, filename);
}
export function spawnDownloadFileSync(url: string, filename: string): boolean {
  let req = JSON.stringify({url, filename});
  let res = spawnSync(process.execPath, 
    [require.resolve('./download.js'), url, filename], 
    { stdio: [0, 1, 2] });
  if (res.status !== 0) fail(res.stderr.toString());
  return fs.existsSync(filename);
}
export function decompressFileSync(filename: string, dstPath: string, strip = 0): boolean {
  mkdirp.sync(dstPath);
  process.stdout.write(`Unpacking`);
  let res = spawnSync(process.execPath,
    [require.resolve('./unpack.js'), filename, dstPath, strip], 
    { stdio: [0, 1, 2] });
  if (res.status !== 0) fail(res.stderr.toString());
  return true;
}
export function deleteFileSync(filename: string) {
  rimraf.sync(filename);
}
export function createTmpFile(): string {
  return tmp.fileSync({template: `${TMP_DIR}/tmp-XXXXXX`}).name;
}

export class IndentingWriter {
  w: fs.WriteStream;
  i: number;
  constructor(path: string) {
    this.i = 0;
    this.w = fs.createWriteStream(path);
  }
  getIndent(): string {
    let s = "";
    let i = 0;
    while (i++ < this.i) {
      s += "  ";
    }
    return s;
  }
  writeLn(s: string) {
    this.w.write(this.getIndent() + s + "\n");
  }
  enter(s: string) {
    this.writeLn(s);
    this.i++;
  }
  leave(s: string) {
    this.i--;
    this.writeLn(s);
  }
  end() {
    this.w.end();
  }
}
