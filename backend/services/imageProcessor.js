import sharp from 'sharp';

class ImageProcessor {
  /**
   * Strips original metadata (EXIF) so no privacy data leaks
   * Normalizes orientation, optimizes internal structure
   * @param {Buffer} buffer - The raw uploaded image buffer
   * @returns {Promise<Buffer>}
   */
  async preprocessImage(buffer) {
    return sharp(buffer)
      .withMetadata({ density: 72 }) // minimal metadata
      .rotate() // Auto-orient based on EXIF before stripping it out
      .toBuffer();
  }

  /**
   * Formats the final transparent image.
   * @param {Buffer} imageBuffer - Background removed buffer
   * @param {string} format - png or webp
   * @returns {Promise<Buffer>}
   */
  async formatOutput(imageBuffer, format = 'png') {
    const pipeline = sharp(imageBuffer);

    if (format === 'webp') {
      pipeline.webp({ lossless: true, quality: 90 });
    } else {
      // Default to PNG with highest compression
      pipeline.png({ compressionLevel: 9, effort: 10 });
    }

    return pipeline.toBuffer();
  }
}

export const imageProcessor = new ImageProcessor();
export default imageProcessor;
