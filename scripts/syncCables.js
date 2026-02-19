import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts = [
    {
        name: "fetch cable data",
        file: path.join(__dirname, "fetchCables.js"),
    },
    {
        name: "merge metacable data",
        file: path.join(__dirname, "mergeMetacables.js"),
    },
];

function runScript(script, label) {
    return new Promise((resolve, reject) => {
        console.log(`\n Starting ${label}...`);

        const child = spawn("node", [script], {
            stdio: "inherit",
        });

        child.on("close", (code) => {
            if (code === 0) {
                console.log(` Completed ${label}`);
                resolve();
            } else {
                reject(new Error(`${label} exited with code ${code}`));
            }
        });

        child.on("error", (error) => {
            reject(new Error(`${label} failed to start: ${error.message}`));
        });
    });
}

try {
    for (const script of scripts) {
        await runScript(script.file, script.name);
    }

    console.log("\n All scripts completed successfully");
} catch (error) {
    console.error(`\n ${error.message}`);
    process.exit(1);
}
