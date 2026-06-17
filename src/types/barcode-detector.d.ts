declare global {
  type DetectedBarcode = {
    rawValue?: string;
  };

  interface BarcodeDetector {
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  }

  interface BarcodeDetectorConstructor {
    new (options?: { formats?: string[] }): BarcodeDetector;
    getSupportedFormats?: () => Promise<string[]>;
  }

  var BarcodeDetector: BarcodeDetectorConstructor | undefined;
}

export {};
