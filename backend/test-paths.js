import fs from 'fs';
import path from 'path';

console.log("Current Working Directory:", process.cwd());
console.log("Files in root:", fs.readdirSync('.'));

if (fs.existsSync('./routes')) {
    console.log("Files inside 'routes' folder:", fs.readdirSync('./routes'));
} else {
    console.log("❌ ERROR: 'routes' folder does not exist in this root directory!");
}