import { HDRIData } from "./HDRIData";
/**
 * Parses
 * @param data A DataView object containing the RGBE data.
 * @param applyExposure Indicates whether or not the returned data should have the exposure factor
 * multiplied to the output. This will set the returned exposure value to 1.
 * @param toLinear Undoes the gamma correction applied when saving this hdr image. This will set the
 * returned gamma value to 1.
 */
export declare function parseRGBE(data: DataView, applyExposure?: boolean, toLinear?: boolean): HDRIData;
