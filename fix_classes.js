const fs = require('fs');
const file = 'src/routes/trains.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const classesSource = t\.classes \|\| t\.availableClasses \|\| t\.train_class_details \|\| \[\];/g, 
                    "const classesSource = t.available_classes || t.classes || t.availableClasses || t.train_class_details || [];");
                    
fs.writeFileSync(file, code);
