var http = require('http');
var url = require('url');
var fs = require('fs');
var Buffer = require('buffer').Buffer;
var PNG = require('./png');

var html = fs.readFileSync('request.html');
fs.watchFile('request.html', { interval: 200 }, function(cur, prev) {
    if (cur.mtime != prev.mtime || cur.size != prev.size) {
        html = fs.readFileSync('request.html');
    }
});

var json = JSON.parse(fs.readFileSync('11.grid.json', 'utf8'));
var data = new Buffer('mapbox:grid\0\0' + JSON.stringify(json), 'utf8');

var image = fs.readFileSync('11.png');
var png = new PNG(image);
png.addChunk('jsON', data, -1);

var server = http.createServer(function(req, res) {
    var uri = url.parse(req.url.toLowerCase(), true);

    if (uri.pathname === '/') {
        res.writeHead(200, {
            'Content-Length': html.length,
            'Content-Type': 'text/html'
        });
        res.end(html);
    } else if (/\.png$/.test(uri.pathname)) {
        res.writeHead(200, {
            'Content-Length': png.length,
            'Content-Type': 'image/png',
            'Cache-Control': 'max-age=3600'
        });
        png.write(res);
        res.end();
    } else {
        res.writeHead(404, {
            'Cache-Control': 'max-age=3600'
        });
        res.end();
    }
    console.warn('REQUEST: ' + req.url);

});

server.listen(8888, function() {
    var address = server.address();
    console.warn('Listening at %s:%d', address.address, address.port);
});