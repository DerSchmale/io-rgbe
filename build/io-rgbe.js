var RGBE = (function (exports) {
	'use strict';

	/**
	 * HDRImageData contains all decompressed image data.
	 */
	var HDRImageData = /** @class */ (function () {
	    function HDRImageData() {
	    }
	    return HDRImageData;
	}());

	/**
	 * Decodes RGBE-encoded data to a flat list of floating point pixel data (RGB).
	 * @param data A DataView object containing the RGBE data.
	 */
	function decodeRGBE(data) {
	    var stream = {
	        data: data,
	        offset: 0
	    };
	    var header = parseHeader(stream);
	    return {
	        width: header.width,
	        height: header.height,
	        exposure: header.exposure,
	        gamma: header.gamma,
	        data: parseData(stream, header)
	    };
	}
	/**
	 * @ignore
	 */
	function parseHeader(stream) {
	    var line = readLine(stream);
	    var header = {
	        colorCorr: [1, 1, 1],
	        exposure: 1,
	        gamma: 1,
	        width: 0,
	        height: 0,
	        flipX: false,
	        flipY: false
	    };
	    if (line !== "#?RADIANCE" && line !== "#?RGBE")
	        throw new Error("Incorrect file format!");
	    while (line !== "") {
	        // empty line means there's only 1 line left, containing size info:
	        line = readLine(stream);
	        var parts_1 = line.split("=");
	        switch (parts_1[0]) {
	            case "GAMMA":
	                header.gamma = parseFloat(parts_1[1]);
	                break;
	            case "FORMAT":
	                if (parts_1[1] !== "32-bit_rle_rgbe" && parts_1[1] !== "32-bit_rle_xyze")
	                    throw new Error("Incorrect encoding format!");
	                break;
	            case "EXPOSURE":
	                header.exposure = parseFloat(parts_1[1]);
	                break;
	            case "COLORCORR":
	                header.colorCorr = parts_1[1].replace(/^\s+|\s+$/g, "").split(" ").map(function (m) { return parseFloat(m); });
	                break;
	        }
	    }
	    line = readLine(stream);
	    var parts = line.split(" ");
	    parseSize(parts[0], parseInt(parts[1]), header);
	    parseSize(parts[2], parseInt(parts[3]), header);
	    return header;
	}
	/**
	 * @ignore
	 */
	function parseSize(label, value, header) {
	    switch (label) {
	        case "+X":
	            header.width = value;
	            break;
	        case "-X":
	            header.width = value;
	            header.flipX = true;
	            console.warn("Flipping horizontal orientation not currently supported");
	            break;
	        case "-Y":
	            header.height = value;
	            break;
	        case "+Y":
	            header.height = value;
	            header.flipY = true;
	            break;
	    }
	}
	/**
	 * @ignore
	 */
	function readLine(stream) {
	    var ch, str = "";
	    while ((ch = stream.data.getUint8(stream.offset++)) !== 0x0a)
	        str += String.fromCharCode(ch);
	    return str;
	}
	/**
	 * @ignore
	 */
	function parseData(stream, header) {
	    var hash = stream.data.getUint16(stream.offset);
	    var data;
	    if (hash === 0x0202) {
	        data = parseNewRLE(stream, header);
	        if (header.flipX)
	            flipX(data, header);
	        if (header.flipY)
	            flipY(data, header);
	    }
	    else {
	        throw new Error("Obsolete HDR file version!");
	    }
	    return data;
	}
	/**
	 * @ignore
	 */
	function parseNewRLE(stream, header) {
	    var width = header.width, height = header.height, colorCorr = header.colorCorr;
	    var tgt = new Float32Array(width * height * 3);
	    var i = 0;
	    var offset = stream.offset, data = stream.data;
	    for (var y = 0; y < height; ++y) {
	        if (data.getUint16(offset) !== 0x0202)
	            throw new Error("Incorrect scanline start hash");
	        if (data.getUint16(offset + 2) !== width)
	            throw new Error("Scanline doesn't match picture dimension!");
	        offset += 4;
	        var numComps = width * 4;
	        // read individual RLE components
	        var comps = [];
	        var x = 0;
	        while (x < numComps) {
	            var value = data.getUint8(offset++);
	            if (value > 128) {
	                // RLE:
	                var len = value - 128;
	                value = data.getUint8(offset++);
	                for (var rle = 0; rle < len; ++rle) {
	                    comps[x++] = value;
	                }
	            }
	            else {
	                for (var n = 0; n < value; ++n) {
	                    comps[x++] = data.getUint8(offset++);
	                }
	            }
	        }
	        for (x = 0; x < width; ++x) {
	            var r = comps[x];
	            var g = comps[x + width];
	            var b = comps[x + width * 2];
	            var e = comps[x + width * 3];
	            // NOT -128 but -136!!! This allows encoding smaller values rather than higher ones (as you'd expect).
	            e = e ? Math.pow(2.0, e - 136) : 0;
	            tgt[i++] = r * e * colorCorr[0];
	            tgt[i++] = g * e * colorCorr[1];
	            tgt[i++] = b * e * colorCorr[2];
	        }
	    }
	    return tgt;
	}
	/**
	 * @ignore
	 */
	function swap(data, i1, i2) {
	    i1 *= 3;
	    i2 *= 3;
	    for (var i = 0; i < 3; ++i) {
	        var tmp = data[i1 + i];
	        data[i1 + i] = data[i2 + i];
	        data[i2 + i] = tmp;
	    }
	}
	/**
	 * @ignore
	 */
	function flipX(data, header) {
	    var width = header.width, height = header.height;
	    var hw = width >> 1;
	    for (var y = 0; y < height; ++y) {
	        // selects the current row
	        var b = y * width;
	        for (var x = 0; x < hw; ++x) {
	            // add the mirrored columns
	            var i1 = b + x;
	            var i2 = b + width - 1 - x;
	            swap(data, i1, i2);
	        }
	    }
	}
	/**
	 * @ignore
	 */
	function flipY(data, header) {
	    var width = header.width, height = header.height;
	    var hh = height >> 1;
	    for (var y = 0; y < hh; ++y) {
	        // selects the mirrored rows
	        var b1 = y * width;
	        var b2 = (height - 1 - y) * width;
	        for (var x = 0; x < width; ++x) {
	            // adds the column
	            swap(data, b1 + x, b2 + x);
	        }
	    }
	}

	/**
	 * Encodes the HDRImageData or ImageData (LDR) to the RGBE file format.
	 */
	function encodeRGBE(imageData) {
	    var hdriData = imageData instanceof ImageData ? convertToHDRIData(imageData) : imageData;
	    var width = hdriData.width, height = hdriData.height, data = hdriData.data;
	    var encoded = [];
	    var header = "#?RADIANCE\n# Made with derschmale/io-rgbe\n" +
	        "EXPOSURE=" + hdriData.exposure + "\n" +
	        "GAMMA=" + hdriData.gamma + "\n" +
	        "PRIMARIES=0 0 0 0 0 0 0 0\nFORMAT=32-bit_rle_rgbe\n\n";
	    header += "-Y " + height + " +X " + width + "\n";
	    for (var i_1 = 0; i_1 < header.length; ++i_1) {
	        encoded.push(header.charCodeAt(i_1));
	    }
	    var i = 0;
	    for (var y = 0; y < height; ++y) {
	        // 0x0202 and 16-bit for width
	        encoded.push(0x02, 0x02, (width & 0xff00) >> 8, width & 0xff);
	        var scanline = [[], [], [], []];
	        for (var x = 0; x < width; ++x) {
	            // gamma to linear
	            var r = data[i++];
	            var g = data[i++];
	            var b = data[i++];
	            var maxComp = Math.max(r, g, b) / 256.0;
	            var e = clamp(Math.ceil(Math.log2(maxComp)) + 136, 0.0, 0xff);
	            var sc = 1.0 / Math.pow(2, e - 136);
	            scanline[0].push(clamp(r * sc, 0, 0xff));
	            scanline[1].push(clamp(g * sc, 0, 0xff));
	            scanline[2].push(clamp(b * sc, 0, 0xff));
	            scanline[3].push(e);
	        }
	        scanline.forEach(function (s) { return encodeRLE(s, encoded); });
	    }
	    return new Uint8Array(encoded).buffer;
	}
	/**
	 * @ignore
	 */
	function convertToHDRIData(img) {
	    var data = new Float32Array(img.width * img.height * 3);
	    for (var i = 0, j = 0; i < data.length; i += 3, j += 4) {
	        data[i] = Math.pow(img.data[j] / 0xff, 2.2);
	        data[i + 1] = Math.pow(img.data[j + 1] / 0xff, 2.2);
	        data[i + 2] = Math.pow(img.data[j + 2] / 0xff, 2.2);
	    }
	    return {
	        data: data,
	        exposure: 1,
	        gamma: 1,
	        width: img.width,
	        height: img.height
	    };
	}
	/**
	 * @ignore
	 */
	function clamp(x, min, max) {
	    return Math.max(Math.min(x, max), min);
	}
	/**
	 * Straight port from https://www.graphics.cornell.edu/~bjw/rgbe/rgbe.c
	 * @ignore
	 */
	function encodeRLE(data, encoded) {
	    var minRunLen = 4;
	    var len = data.length;
	    var i = 0;
	    while (i < len) {
	        var runStart = i;
	        // find next run of length at least 4 if one exists
	        var runCount = 0;
	        var prevRunCount = 0;
	        while ((runCount < minRunLen) && (runStart < len)) {
	            runStart += runCount;
	            prevRunCount = runCount;
	            runCount = 1;
	            while ((runStart + runCount < len) && (runCount < 127)
	                && (data[runStart] == data[runStart + runCount]))
	                runCount++;
	        }
	        // if data before next big run is a short run then write it as such
	        if ((prevRunCount > 1) && (prevRunCount == runStart - i)) {
	            encoded.push(128 + prevRunCount, data[i]);
	            i = runStart;
	        }
	        // write out bytes until we reach the start of the next run
	        while (i < runStart) {
	            var count = runStart - i;
	            if (count > 128)
	                count = 128;
	            encoded.push(count);
	            for (var d = 0; d < count; ++d)
	                encoded.push(data[i + d]);
	            i += count;
	        }
	        /* write out next run if one was found */
	        if (runCount >= minRunLen) {
	            encoded.push(128 + runCount, data[runStart]);
	            i += runCount;
	        }
	    }
	}

	exports.HDRImageData = HDRImageData;
	exports.decodeRGBE = decodeRGBE;
	exports.encodeRGBE = encodeRGBE;

	Object.defineProperty(exports, '__esModule', { value: true });

	return exports;

}({}));
