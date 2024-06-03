// Local Imports
const Crawler = require("./Crawler");
const CONFIG = require("./config");
// Other Imports
const fs = require("fs");

// Check if output and log directories exist
if (!fs.existsSync(CONFIG["logDIR"])) {
  fs.mkdir(CONFIG["logDIR"], { recursive: true }, (e) => {
    console.log(e);
  });
}

const crawler = new Crawler();

let json = JSON.parse(fs.readFileSync(CONFIG["urlFile"]));

(async () => {
  for (let entry of json["urls"]) {
    if (entry.scraped === true) {
      console.log(`Skipped already scraped ${entry.url}`);
      continue;
    }
    console.log(`Scraping ${entry.url}`);

    await crawler.start(entry.url);
  }
})();
