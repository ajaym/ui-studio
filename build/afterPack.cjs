const { execSync } = require("child_process");
const path = require("path");

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  console.log(`Stripping extended attributes from ${appOutDir}`);
  execSync(`xattr -cr "${appOutDir}"`, { stdio: "inherit" });
};
