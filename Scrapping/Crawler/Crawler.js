// local imports
const CONFIG = require("./config");

// puppeteer imports
const puppeteer = require("puppeteer-extra");
const { TimeoutError } = require("puppeteer");

// other imports
const fs = require("fs");
const { load } = require("cheerio");
const { writeFile } = require("fs");
const path = require("path");
const URL = require("url");
const glob = require("glob");
const axios = require("axios");

function delay(ms) {
  console.log("Delay");
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to extract links from a file
const extractLinksFromFile = (filePath) => {
  const resourceRegex = /[a-zA-Z\\:\/0-9-]+\.pdf/g;
  const content = fs.readFileSync(filePath, "utf-8");
  let matches = [...content.matchAll(resourceRegex)].map((match) => match[0]);
  return matches ? matches : [];
};

// Function to get all JS files in the directory
const getJsFiles = (dir) => {
  return glob.sync(path.join(dir, "**/*.js"));
};

// Main function to process all JS files and extract resource links
const extractLinksFromJsFiles = (dir) => {
  const jsFiles = getJsFiles(dir);
  const allLinks = [];

  jsFiles.forEach((file) => {
    const links = extractLinksFromFile(file);
    allLinks.push(...links);
  });

  return allLinks;
};

class Crawler {
  constructor() {
    console.log("Crawler.contructor");

    // browser instance
    this.browser = null;
    // webpage name
    this.url = "";
    this.webPage = "";
    this.webPagePath = "";
  }
  async start(url) {
    console.log("Crawler.start");
    this.url = url;
    try {
      // Extract url name
      this.webPage = this.url.replace(/^(https?:\/\/)?(www\.)?/, "");
      this.webPagePath = `${CONFIG["outputDIR"]}/${this.webPage}`;

      if (this.webPage == "" || this.webPagePath == "") {
        throw new Error("Failed to parse WebPage Name");
      }

      // Create output Directory
      if (!fs.existsSync(this.webPagePath)) {
        fs.mkdirSync(this.webPagePath, { recursive: true });
      }

      this.browser = await puppeteer.launch({
        headless: true,
      });

      await this.crawl(this.url);
    } catch (e) {
      console.error(e);
    } finally {
      if (this.browser) {
        const jsDir = path.join(this.webPagePath, "jsFiles");
        const resourceLinks = extractLinksFromJsFiles(jsDir);
        const pdfPaths = path.join(this.webPagePath, "pdfs");
        if (!fs.existsSync(pdfPaths)) {
          fs.mkdirSync(pdfPaths, { recursive: true });
        }
        fs.writeFileSync(
          path.join(pdfPaths, "pdfs.txt"),
          resourceLinks.toString()
        );
        const baseUrl = "https://cdn.mt.gov.sa/mtportal/mt-fe-production/";
        let counter = 0;
        for (let pdf of resourceLinks) {
          const pdfUrl = `${baseUrl}${pdf}`;

          axios({
            method: "get",
            url: pdfUrl,
            responseType: "stream",
          })
            .then((response) => {
              counter += 1;
              const fileStream = fs.createWriteStream(
                path.join(pdfPaths, `${counter}.pdf`)
              );

              response.data.pipe(fileStream);

              fileStream.on("finish", () => {
                fileStream.close(() => {
                  // console.log(`File ${counter}.pdf saved`);
                });
              });
            })
            .catch((error) => {
              console.error(`Error fetching the file: ${error.message}`);
            });
        }

        await this.browser.close();
      }
    }
  }

  async crawl(url) {
    // variables to store the page and content
    let page = null;
    let content = null;

    try {
      console.log("Crawler.crawl");

      // create a new page instance
      page = await this.browser.newPage();

      // save all the js files and extract relevent links

      page.on("response", async (response) => {
        const requestUrl = response.url();
        const parsedUrl = URL.parse(requestUrl);
        const fileName = path.basename(parsedUrl.pathname);

        if (
          response.request().resourceType() === "script" &&
          parsedUrl.hostname.endsWith("mt.gov.sa")
        ) {
          const buffer = await response.buffer();
          const jsFilesPath = path.join(this.webPagePath, "jsFiles");
          if (!fs.existsSync(jsFilesPath)) {
            fs.mkdirSync(jsFilesPath, { recursive: true });
          }

          fs.writeFileSync(path.join(jsFilesPath, fileName), buffer);
        }
      });

      // navigate to the URL and wait for the body to load
      await page.goto(url, {
        // timeout: CONFIG["timeout"],
        waitUntil: ["networkidle2"],
      });

      // Delay for the page to load
      await delay(CONFIG["delay"]);

      await page.waitForSelector("body");

      await page.screenshot({
        path: `${this.webPagePath}/ss.png`,
        fullPage: true,
      });

      // get the content of the page
      content = await page.content();

      // console.log(content);
      fs.writeFileSync(`${this.webPagePath}/page.html`, content);

      // throw an error if the content is empty
      if (!content) {
        throw new Error("ContentError");
      }

      // parse the content
      const parsedContent = await this.parseContent(content);

      if (!parsedContent) {
        // throw an error if the parsed content is empty
        throw new Error("ContentError");
      } else {
        // console.log(parsedContent);
      }

      fs.writeFile(
        `${this.webPagePath}/page.json`,
        JSON.stringify(parsedContent),
        function (err) {
          if (err) throw err;
          console.log("Saved!");
        }
      );

      // this.saveContent(parsedContent);

      console.log("Crawled Page: ", url);
    } catch (error) {
      if (error instanceof TimeoutError) {
        console.error("TimeoutError: ", url);
      } else if (error.message === "CaptchaError") {
        console.error("CaptchaError: ", url);
      } else if (error.message === "ContentError") {
        console.error("ContentError: ", url);
        console.error("Failed Page");
      } else {
        Crawler.logErrorFile(error, url);
      }
    } finally {
      // close the page instance
      if (page) {
        await page.close();
      }
    }
  }

  async parseContent(content) {
    console.log("Crawler.parse");
    const contentData = {};
    contentData["doc"] = [];
    contentData["links"] = [];
    const tempLinksInternal = new Set();
    const tempLinksExternal = new Set();

    // element for headings and content
    const headingEls = ["h1", "h2"];
    const contentMineEls = ["p", "h3", "h4", "h5", "h6", "a", "li", "td", "th"];

    // exclude the forward URLs with these prefixes
    const includedPrefixes = ["http:", "https:"];

    // load the content using cheerio
    const $ = load(content);

    // if the language is not mentioned or is not English, return
    const lang = $("html").attr("lang");
    if (lang && lang !== "en") {
      return;
    }

    // extract the title, description, keywords, and a preview to show as search results
    const title = $("title").text() || "Failed to Fetch Title";
    const description = $('meta[name="description"]').attr("content");
    const keywords = $('meta[name="keywords"]').attr("content") || "";

    // extract the content and headings
    Crawler.textMining(contentMineEls, $, contentData["doc"]);
    Crawler.textMining(headingEls, $, contentData["doc"]);
    Crawler.linkMining(
      $,
      contentData["links"],
      tempLinksInternal,
      tempLinksExternal
    );

    const urlFileData = fs.readFileSync(CONFIG["urlFile"]);
    const json = JSON.parse(urlFileData);

    let scannedUrls = new Set();
    for (let entry of json["urls"]) {
      scannedUrls.add(entry.url);
    }

    for (let entry of json["urls"]) {
      if (entry.url === this.url) {
        entry.internalLinks = Array.from(tempLinksInternal);
        entry.externalLinks = Array.from(tempLinksExternal);
      }
      entry.scraped = true;
    }

    for (let link of Array.from(tempLinksInternal)) {
      if (!scannedUrls.has(`${json["baseUrl"]}${link}`)) {
        json["urls"].push({
          url: `${json["baseUrl"]}${link}`,
          scraped: false,
          internalLinks: [],
          externalLinks: [],
        });
      }
    }

    fs.writeFileSync(CONFIG["urlFile"], JSON.stringify(json));

    return {
      title: title,
      description: description,
      keywords: keywords,
      doc: contentData["doc"],
      links: contentData["links"],
    };
  }

  static textMining(els, $, contentData) {
    els.forEach((el) => {
      $(el).each((_, element) => {
        const text = $(element).text().trim();
        if (text != "") {
          contentData.push(text);
        }
      });
    });
  }

  static linkMining($, contentData, tempLinksExternal, tempLinksInternal) {
    $("a").each((idx, el) => {
      const linkData = {
        text: $(el).text().trim(),
        link: $(el).attr("href") || "No Link Found",
      };
      contentData.push(linkData);

      if (linkData.link != "No Link Found") {
        if (
          linkData.link.includes("http://") ||
          linkData.link.includes("https://")
        ) {
          tempLinksInternal.add(linkData.link);
        } else {
          tempLinksExternal.add(linkData.link);
        }
      }
    });
  }

  static logErrorFile(error, url = "") {
    const logFile = `${CONFIG.logDIR}/${Date.now()}-${url
      .replace(/(^\w+:|^)\/\//, "")
      .replace(/\//g, "-")}.log`;
    console.error(
      "Error Occurred, please check logs for more details: ",
      logFile
    );
    const stringError = String(error);
    writeFile(logFile, stringError, Crawler.logError);
  }

  static logError(error = null) {
    if (error) {
      console.error(error);
    }
  }
}

module.exports = Crawler;
