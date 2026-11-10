const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'data', 'authorities.json');

function readAll() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return []; }
}
function writeAll(list) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, FILE);
}

module.exports = {
  findByUsername: (u) =>
    readAll().find(a => a.username.toLowerCase() === u.toLowerCase()),
  create: (record) => { const all = readAll(); all.push(record); writeAll(all); return record; },
};