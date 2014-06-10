![Trimeshter](http://i.imgur.com/25LCYHP.png)

Work-in-progress piece for the [Portland Tuio Jam](http://ctrl-art.github.io/tuio-jam/) based on [Make Space Ship](http://makespaceship.com).

[Demo for Leap and Touchscreen](http://momo-the-monster.github.io/trimeshter/)

---

## Touch Socket Server

Multiple people can play with a single instance of Trimeshter by using the included socket server. You'll need [Node](http://nodejs.org/) installed if you haven't got it.

Clone the git repository and then run:

``` npm install ```

to install all the dependencies needed. Then you can run:

``` npm start ```

to start up the server. It defaults to port 3456. This is currently hardcoded in server.js, you can change it if you need to use a different port.

Once the server has started, note the address that it started on (this is output in your console) and visit that address and port from a mobile device with a touchscreen. It will serve up an html page which will turn blue when connected, and then stream your touches to Trimeshter.

### .local names
It's much easier to remember and visit an address like momobook.local:3456 than 10.1.2.123:3456. On a Mac or Linux machine, you should be able to use your machine name like this to visit the socket transmission page from any iOS device. If you're serving from a Windows machine, you'll just need to install [Bonjour For Windows](http://support.apple.com/kb/DL999) to get this working. Unfortunately, this doesn't currently work for Android devices.
