var TYMP = (function (exports) {
	'use strict';

	var HDRImageData = /** @class */ (function () {
	    function HDRImageData() {
	    }
	    return HDRImageData;
	}());

	/**
	 * Parses
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
	        array: parseData(stream, header)
	    };
	}
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
	function readLine(stream) {
	    var ch, str = "";
	    while ((ch = stream.data.getUint8(stream.offset++)) !== 0x0a)
	        str += String.fromCharCode(ch);
	    return str;
	}
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
	    console.log(offset, stream.data.byteLength);
	    return tgt;
	}
	function swap(data, i1, i2) {
	    i1 *= 3;
	    i2 *= 3;
	    for (var i = 0; i < 3; ++i) {
	        var tmp = data[i1 + i];
	        data[i1 + i] = data[i2 + i];
	        data[i2 + i] = tmp;
	    }
	}
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

	exports.HDRImageData = HDRImageData;
	exports.decodeRGBE = decodeRGBE;

	Object.defineProperty(exports, '__esModule', { value: true });

	return exports;

}({}));
