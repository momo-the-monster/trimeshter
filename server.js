var express = require('express.io');
app = express();
app.http().io();

var serverPort;
var serverAddress;

// Route Touch Events
app.io.route('cursorStart', function(req) {
//    console.log('start', req.data);
    req.io.broadcast('cursorStart', req.data);
});

app.io.route('cursorMove', function(req) {
//    console.log('move', req.data);
    req.io.broadcast('cursorMove', req.data);
});

app.io.route('cursorEnd', function(req) {
//    console.log('end', req.data);
    req.io.broadcast('cursorEnd', req.data);
});

app.use(express.static('public'));

// Send the client html.
app.get('/', function(req, res) {
    res.sendfile(__dirname + '/public/interfaces/touch.html')
});

app.listen(3456, function () {
    require('dns').lookup(require('os').hostname(), function (err, add, fam) {
        serverPort = 3456;
        serverAddress = add;
        console.log('Express server listening at ' + add + ' on port ' + serverPort);
    });
});