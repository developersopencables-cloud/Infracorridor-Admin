import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const METACABLES_DIR = path.join(__dirname, "../public/data/metacables");
const OUTPUT_FILE = path.join(__dirname, "../public/data/metacables-all.json");

console.log("Consolidating metacable files...");

try {
    const files = fs
        .readdirSync(METACABLES_DIR)
        .filter((file) => file.endsWith(".json") && file !== "manifest.json")
        .sort();

    console.log(`Found ${files.length} metacable files`);

    const allMetacables = files.map((file) => {
        const filePath = path.join(METACABLES_DIR, file);
        const content = fs.readFileSync(filePath, "utf8");
        return JSON.parse(content);
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allMetacables, null, 2));

    const stats = fs.statSync(OUTPUT_FILE);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`Created ${OUTPUT_FILE}`);
    console.log(`${allMetacables.length} cables consolidated into ${sizeKB} KB`);
    console.log(`This replaces ${files.length} HTTP requests with just 1!`);
} catch (error) {
    console.error("Error consolidating metacables:", error);
    process.exit(1);
}
