import sharp from "sharp";

async function main() {
  const sizes = [192, 512];
  for (const s of sizes) {
    await sharp("public/icons/icon.svg").resize(s, s).png().toFile(`public/icons/icon-${s}.png`);
  }
  // Versione "maskable": margine di sicurezza del 10% su sfondo pieno.
  await sharp("public/icons/icon.svg").resize(410, 410).extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#0f766e" }).png().toFile("public/icons/maskable-512.png");
  await sharp("public/icons/icon.svg").resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
  console.log("Icone generate.");
}

main();
