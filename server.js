var express = require('express.io');
app = express();
app.http().io();

// Route Touch Events
app.io.route('touchStart', function(req) {
//    console.log('start', req.data);
    req.io.broadcast('touchStart', req.data);
});

app.io.route('touchMove', function(req) {
//    console.log('move', req.data);
    req.io.broadcast('touchMove', req.data);
});

app.io.route('touchEnd', function(req) {
//    console.log('end', req.data);
    req.io.broadcast('touchEnd', req.data);
});

app.use(express.static('public'));

// Send the client html.
app.get('/', function(req, res) {
    res.sendfile(__dirname + '/public/views/control.html')
});

app.listen(3456);