//const { buildDepTreeFromFiles } = require('snyk-nodejs-lockfile-parser');
const Arborist = require('@npmcli/arborist');
const { breadth } = require('treeverse');
const path = require('path');
const crypto = require('crypto');

const getHash = str => crypto.createHash('md5').update(str).digest('hex');

const deps = [];

(async () => {
  const arborist = new Arborist();
  const tree = await arborist.loadVirtual();
  const dir = process.cwd();
  breadth({
    tree,
    getChildren: node => [...node.children.values()],
    visit: node => {
      if (node.dev === true || node.location === '') {
        return;
      }
      const { resolved, realpath, integrity } = node;
      const buildPath = path.join('/', 'src', path.relative(dir, realpath))

      console.log(`fs fetch${getHash(buildPath)}() {`);
      console.log(`  image "node"`);
      console.log(`  dir "/src"`);
      console.log(`  run "mkdir -p ${buildPath}"`);
      console.log(`  run "wget ${resolved}"`);
      console.log(`  run "tar -C ${buildPath} --strip-components 1 -xzvf *.tgz" with option {`);
      console.log(`    mount fs { scratch; } "${buildPath}" as mount${getHash(buildPath)}`);
      console.log(`  }`);
      console.log(`}`);
      deps.push({
        func: getHash(buildPath),
        buildPath
      });
    }
  });
  console.log(`fs combine() {`);
  console.log(`  image "node"`);
  console.log(`  run "cp -r /src /result" with option {`);
  deps.forEach(dep => {
    console.log(`    mount mount${dep.func} "${dep.buildPath}"`);
  });
  console.log(`    mount fs { scratch; } "/result" as fetchAll`);
  console.log(`  }`);
  console.log(`}`);
})()
