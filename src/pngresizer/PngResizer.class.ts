import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export default class PngResizer {
  readonly inputPath: string;
  readonly outputPath: string;
  readonly targetSizeBytes: number;

  constructor(
    inputPath: string,
    outputPath: string,
    targetSizeMB: number = 1.9
  ) {
    this.inputPath = inputPath;
    this.outputPath = outputPath;
    this.targetSizeBytes = targetSizeMB * 1024 * 1024;
  }

  private async getFileSize(filePath: string): Promise<number> {
    const stat = await fs.stat(filePath);
    return stat.size;
  }

  public async resizeUntilUnderTarget(): Promise<void> {
    const image = sharp(this.inputPath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to determine image dimensions.');
    }

    const width = metadata.width;
    const height = metadata.height;
    let scale = 1.0;

    while (true) {
      const resizedBuffer = await sharp(this.inputPath)
        .resize(Math.round(width * scale), Math.round(height * scale), {
          fit: 'inside'
        })
        .png()
        .toBuffer();

      const bufferSize = resizedBuffer.length;

      if (bufferSize <= this.targetSizeBytes) {
        await fs.writeFile(this.outputPath, resizedBuffer);
        console.log(
          `✅ Resized to ${(bufferSize / 1024).toFixed(1)} KB at scale ${Math.round(scale * 100)}%`
        );
        break;
      }

      scale -= 0.05;
      if (scale < 0.1) {
        throw new Error(
          '❌ Could not reduce file under target size without going below 10% scale.'
        );
      }

      console.log(
        `🔁 Still too large (${(bufferSize / 1024).toFixed(1)} KB), retrying with scale ${(scale * 100).toFixed(0)}%`
      );
    }
  }
}
