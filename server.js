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

    // 1) fix img alt
    $("img").each((i, el) => {
      if ($(el).attr("alt") !== undefined) {
        $(el).attr("alt", "");
      }
    });

    // 2) fix span+mathml
    $("span").each((i, el) => {
      const $el = $(el);

      if ($el.find("math").length > 0) {
        // ensure class=hidden only
        $el.attr("class", "hidden");
        $el.removeAttr("aria-hidden");

        // add aria-hidden to immediate next img
        let next = $el.next();
        if (next.is("img")) {
          next.attr("aria-hidden", "true");
        }
      }
    });

    const output = $.html({ selfClosingTags: true });
    fs.writeFileSync(filePath, output, "utf8");
    logs.push("✔ Fixed: " + file);
  });

  res.json({ success: true, log: logs });
});

app.listen(3000, () => {
  console.log("✅ UI Tool running at http://localhost:3000");
});
