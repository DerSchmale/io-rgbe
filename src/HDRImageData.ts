/**
 * HDRImageData contains all decompressed image data.
 */
export class HDRImageData
{
	width: number;
	height: number;
	exposure: number;
	gamma: number;
	data: Float32Array;
}
