const fs = require('fs');
const file = 'src/routes/trains.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const SEARCH_VERSION = 'v3\.15-gst-update';/, "const SEARCH_VERSION = 'v3.16-rapidapi';");
fs.writeFileSync(file, code);
