import { HDRImageData } from "./HDRImageData";
/**
 * Decodes RGBE-encoded data to a flat list of floating point pixel data (RGB).
 * @param data A DataView object containing the RGBE data.
 */
export declare function decodeRGBE(data: DataView): HDRImageData;
