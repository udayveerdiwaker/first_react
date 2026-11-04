/**
 * Base Image Provider Interface
 */

class BaseImageProvider {
  constructor(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  /**
   * Generates an image and returns a buffer or URL
   * @param {Object} options
   * @param {string} options.prompt - Detailed visual prompt
   * @param {string} [options.aspectRatio='1:1'] - '1:1' | '16:9' | '9:16' | '4:3'
   * @param {string} [options.size] - e.g. '1024x1024'
   * @param {string} [options.quality='standard'] - 'standard' | 'hd'
   * @param {string} [options.style='vivid'] - 'vivid' | 'natural'
   * @param {string} [options.model] - Specific model name
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<{ buffer: Buffer, mimeType: string, revisedPrompt?: string, width: number, height: number, providerModel: string }>}
   */
  async generate(_options) {
    throw new Error(`generate() not implemented by provider: ${this.name}`);
  }

  /**
   * Returns list of supported aspect ratios
   */
  getSupportedAspectRatios() {
    return ["1:1", "16:9", "9:16", "4:3"];
  }

  /**
   * Checks whether the provider has the necessary credentials/configuration
   */
  isConfigured() {
    return true;
  }
}

module.exports = BaseImageProvider;
