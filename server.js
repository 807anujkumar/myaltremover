const express = require("express");
const path = require("path");
const fs = require("fs");
const cheerio = require("cheerio");

const app = express();
app.use(express.json());
app.use(express.static("public")); // serve frontend

// API: run fixer
app.post("/run-fix", (req, res) => {
  const inputDir = req.body.folder;
  if (!inputDir || !fs.existsSync(inputDir)) {
    return res.json({ success: false, log: ["❌ Folder not found"] });
  }

  const logs = [];
  fs.readdirSync(inputDir).forEach(file => {
    if (!file.endsWith(".html") && !file.endsWith(".xhtml")) return;

    const filePath = path.join(inputDir, file);
    let content = fs.readFileSync(filePath, "utf8");

    const $ = cheerio.load(content, { xmlMode: false, decodeEntities: false });

    let fileChanged = false; // 🔑 track karne ke liye

    // ✅ sirf span+mathml ke just baad wale <img> ko fix karo
    $("span").each((i, el) => {
      const $el = $(el);

      if ($el.find("math").length > 0) {
        // check agar already correct hai to skip
        if ($el.attr("class") !== "hidden" || $el.attr("aria-hidden") !== undefined) {
          $el.attr("class", "hidden");
          $el.removeAttr("aria-hidden");
          fileChanged = true;
        }

        // add aria-hidden to immediate next img
        let next = $el.next();
        if (next.is("img")) {
          if (next.attr("aria-hidden") !== "true") {
            next.attr("aria-hidden", "true");
            fileChanged = true;
          }
          if (next.attr("alt") !== "") {
            next.attr("alt", "");
            fileChanged = true;
          }
        }
      }
    });

    // ❌ agar koi change hi nahi hua to skip writing
    if (fileChanged) {
      const output = $.html({ selfClosingTags: true });
      fs.writeFileSync(filePath, output, "utf8");
      logs.push("✔ Fixed: " + file);
    }
  });

  res.json({ success: true, log: logs.length ? logs : ["ℹ No changes needed"] });
});

app.listen(3000, () => {
  console.log("✅ UI Tool running at http://localhost:3000");
});
