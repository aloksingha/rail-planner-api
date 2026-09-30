const fs = require('fs');
const file = 'src/routes/trains.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const SEARCH_VERSION = 'v3\.16-rapidapi';/, "const SEARCH_VERSION = 'v3.17-rapidapi-fix';");
fs.writeFileSync(file, code);
