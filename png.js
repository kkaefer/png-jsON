module.exports = PNG;
var crc32 = require('./crc32');
var Buffer = require('buffer').Buffer;

var chr = String.fromCharCode;

var header = new Buffer([ 137, 80, 78, 71, 13, 10, 26, 10 ]);

function PNG(d) {
    this.chunks = [];

    // Check header.
    for (var i = 0; i < header.length; i++) {
        if (d[i] !== header[i]) {
            throw new Error('Invalid PNG header');
        }
    }

    var i = 8;
    while (i < d.length) {
        var length = d[i++] << 24 | d[i++] << 16 | d[i++] << 8 | d[i++];
        if (length < 0) length += 0x100000000; // Convert to unsigned.

        var chunk = d.slice(i - 4, i + length + 8); // Includes length, type and CRC.
        var type = chr(d[i++]) + chr(d[i++]) + chr(d[i++]) + chr(d[i++]);
        var data = d.slice(i, i + length);
        i += length;
        var crc = d.slice(i, i + 4);
        i += 4;

        this.chunks.push({
            type: type,
            data: data,
            length: length,
            crc: crc,
            chunk: chunk
        });

        // Safeguard.
        if (type === 'IEND') break;
    }
}

PNG.prototype.addChunk = function(type, data, pos) {
    if (typeof pos === 'undefined') pos = -1;
    if (pos === 0) pos++; // Can't insert anything before IHDR.

    var typeBinary = new Buffer(type, 'ascii');
    if (typeBinary.length !== 4) throw new Error('Chunk type must be four bytes');

    var length = data.length;
    var crc = new Buffer(crc32(typeBinary, data));

    // length(4), type(4), data and crc(4)
    var chunk = new Buffer(4 + 4 + data.length + 4);
    chunk[0] = length >>> 24 & 0xFF;
    chunk[1] = length >>> 16 & 0xFF;
    chunk[2] = length >>> 8 & 0xFF;
    chunk[3] = length & 0xFF;
    typeBinary.copy(chunk, 4);
    data.copy(chunk, 8);
    crc.copy(chunk, 8 + length);

    this.chunks.splice(pos, 0, {
        type: type,
        data: data,
        length: length,
        crc: crc,
        chunk: chunk
    });
};

PNG.prototype.write = function(stream) {
    stream.write(header);
    for (var i = 0; i < this.chunks.length; i++) {
        stream.write(this.chunks[i].chunk);
    }
};

Object.defineProperty(PNG.prototype, 'length', {
    get: function() {
        var length = header.length;
        for (var i = 0; i < this.chunks.length; i++) {
            length += this.chunks[i].chunk.length;
        }
        return length;
    }
});

PNG.prototype.asBuffer = function() {
    var length = this.length;
    var buffer = new Buffer(length);
    header.copy(buffer);
    var position = position = header.length;
    for (var i = 0; i < this.chunks.length; i++) {
        var chunk = this.chunks[i].chunk;
        chunk.copy(buffer, position);
        position += chunk.length;
    }
    return buffer;
};
