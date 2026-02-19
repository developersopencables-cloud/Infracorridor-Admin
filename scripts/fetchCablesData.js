import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const CONFIG = {
  DATA_ROOT: path.resolve(__dirname, "..", "public", "data"),
  META_DIR: "metacables",
  MAX_RETRIES: 3,
  TIMEOUT_MS: 10000,
  CONCURRENCY: 10,
  ENDPOINTS: {
    geo: "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json",
    land: "https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json",
    index: "https://www.submarinecablemap.com/api/v3/cable/all.json"
  },
  BASE_CABLE: "https://www.submarinecablemap.com/api/v3/cable/"
};


const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, maxRetries = CONFIG.MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
      
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
      
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(800 * attempt); 
      }
    }
  }
  throw lastError;
}

function ensureCleanDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true });
  } catch (error) {
    console.error(`Failed to setup directory ${dir}:`, error.message);
    process.exit(1);
  }
}

async function fetchCableData() {
  console.log("Starting submarine cable data sync");
  
  const startTime = Date.now();
  const metaDir = path.join(CONFIG.DATA_ROOT, CONFIG.META_DIR);
  
  try {

    ensureCleanDir(CONFIG.DATA_ROOT);
    ensureCleanDir(metaDir);


    console.log("Fetching baseline data...");
    const [geo, land, indexData] = await Promise.all([
      fetchWithRetry(CONFIG.ENDPOINTS.geo),
      fetchWithRetry(CONFIG.ENDPOINTS.land),
      fetchWithRetry(CONFIG.ENDPOINTS.index)
    ]);

    const writeFile = (name, data) => 
      fs.writeFileSync(path.join(CONFIG.DATA_ROOT, name), JSON.stringify(data, null, 2));
    
    writeFile("cablegeo-data.json", geo);
    writeFile("cable-data.json", land);
    writeFile("allcables.json", indexData);

    const cableIds = indexData.map(c => c.id);
    console.log(`Found ${cableIds.length} cables to process`);

    let success = 0;
    const queue = [...cableIds];
    
    const worker = async () => {
      while (queue.length) {
        const id = queue.shift();
        try {
          const data = await fetchWithRetry(`${CONFIG.BASE_CABLE}${id}.json`);
          fs.writeFileSync(path.join(metaDir, `${id}.json`), JSON.stringify(data, null, 2));
          console.log(`${id} fetched`);
          success++;
        } catch (error) {
          console.log(`${id}: ${error.message}`);
        }
      }
    };

    await Promise.all(new Array(CONFIG.CONCURRENCY).fill().map(worker));
    
    const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\nSync Complete");
    console.log("------------------");
    console.log(`Success: ${success}`);
    console.log(`Failed: ${cableIds.length - success}`);
    console.log(`Time: ${timeElapsed}s`);
    console.log("------------------");

  } catch (error) {
    console.error("\nFatal error:", error.message);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\n Process interrupted. Cleaning up...');
  process.exit(0);
});

await fetchCableData();