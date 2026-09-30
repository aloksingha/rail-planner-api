const fs = require('fs');
const file = 'src/routes/trains.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /\/\/ 2\. Proximity Search[\s\S]*?allRemoteTrains = \[\.\.\.allRemoteTrains, \.\.\.fallbackResults\];/g;

if (code.match(regex)) {
    code = code.replace(regex, '// Fallback logic removed because RapidAPI automatically includes nearby stations!');
    fs.writeFileSync(file, code);
    console.log('Removed fallback logic in trains.ts');
} else {
    console.log('Could not find fallback logic to replace');
}
