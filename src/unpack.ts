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

var decompress: (input: string, output: string, options?: any) => Promise<any> = require('decompress');
var logSymbols = require('log-symbols');
var path = require('path');

// Avoiding "too many open files" error.
var gracefulFs = require('graceful-fs');
gracefulFs.gracefulify(require('fs'));

let filename = process.argv[2];
let dstPath = process.argv[3];
let strip = +process.argv[4];

let links: {path: string; linkpath: string;}[] = [];
function stripDir(p: string): string {
  if (!strip) return p;
  var ar = p.split(path.sep); ar.splice(0, strip);
  return ar.join(path.sep);
}

function filterOutSymlinks(f: {path: string; type: string; linkname?: string}) : boolean {
  if (f.type !== 'link') {
    return true;
  }
  // Workaround for https://github.com/kevva/decompress/issues/52
  var path_ = path.join(dstPath, f.path);
  var linkpath = path.join(dstPath, stripDir(f.linkname));
  links.push({path: path_, linkpath: linkpath});
  return false;
}

decompress(filename, dstPath, {strip: strip, filter: filterOutSymlinks }).then(() => {
  links.forEach(l => {
    try {
      gracefulFs.linkSync(l.linkpath, l.path);
    } catch (_) {
      gracefulFs.unlinkSync(l.path);
      gracefulFs.linkSync(l.linkpath, l.path);
    }
  });
  console.log(" " + logSymbols.success);
  process.exit(0);
}, (reason) => {
  console.log(" " + logSymbols.error);
  console.error(reason);
  process.exit(1);
});
