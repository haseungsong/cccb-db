import sharp from "sharp";

export async function createPreviewImage(imageBuffer: Buffer) {
  return sharp(imageBuffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}
