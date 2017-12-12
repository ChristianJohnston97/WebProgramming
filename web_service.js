
//base url: http://127.0.0.1:8090/events2017
//JSON format
//RESTful service
//authentication token: concertina
//Database via flat json file

// One can access:
// http://localhost:8090/events2017 or
// http://localhost:8090
// Both will redirect to index page
// to run server: node web_service.js



//tranfers data over web
var http = require('http');
//file stream
var fs = require('fs');
//handles user requests
//var connect = require('connect');
//we application framework
var express = require('express');
//cookies

var bodyParser = require('body-parser');

var serveStatic = require('serve-static');

var credentials = require('./credentials.js');

var expressSession = require('express-session');

var jwt    = require('jsonwebtoken');




var app = express()


// cookie parser middleware needs to be installed
app.use(require('cookie-parser')(credentials.cookie));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Once you’ve done this, you can set a cookie or a signed cookie anywhere you have access to a request object
// eg res.cookie('monster', 'nom nom');
//To retrieve the value of a cookie (if any) sent from the client, just access the cookie  properties of the request object
// var monster = req.cookies.monster;
// To delete a cookie, use req.clearCookie: res.clearCookie('monster');

app.set('superSecret', credentials.secret); // secret variable





//    app.use(require('express-session')());


app.use('/public', express.static('public'))
//Now, I can load the files that are in the public directory
// put images in here
// make another for css files etc


//create server
//app.listen(8090)
app.listen(process.env.PORT || 8090)
console.log('Server is now running...');


app.get('/', function(req, res){
    return res.redirect('/events2017/index.html');
});

app.get('/events2017', function(req, res){
    return res.redirect('/events2017/index.html');
});

//index Page
app.get('/events2017/index.html', function(req, res){
  fs.readFile('index.html', function(err, data) {
    if(err)
    {
      send404Response(res);
    }
    res.writeHead(200, {"Content-Type": "text/html"});
    res.write(data);
    res.end();
  });
})

//admin Page
// should only allow to access admin page if auth_token is present
// if not, forward to a login page
app.get('/events2017/admin.html', function(req, res){
  fs.readFile('admin.html', function(err, data) {
    if(err)
    {
      send404Response(res);
    }
    res.writeHead(200, {"Content-Type": "text/html"});
    res.write(data);
    res.end();
  });
})



// GLOBAL VARIABLE OF EVENT DATA
var gEventData = fs.readFileSync("events.json", 'utf8');


// GLOBAL VARIABLE OF VENUE DATA
var gVenueData = fs.readFileSync("venues.json", 'utf8');

// https://stackoverflow.com/questions/10058814/get-data-from-fs-readfile



//Get all events
app.get('/events2017/events', function (req, res) {
  res.writeHead(200, {"Content-Type": "application/json"});

    try {
      res.write(gEventData);
      res.end();
    } catch (err) {
      gEventData = JSON.stringify(gEventData);
      res.write(gEventData);
      res.end();
    }
  })


//Get all venues
  app.get('/events2017/venues', function (req, res) {
      res.writeHead(200, {"Content-Type": "application/json"});
      try
      {
        res.write(gVenueData);
        res.end();

      }
      catch(err)
      {
        gVenueData = JSON.stringify(gVenueData);
        res.write(gVenueData);
        res.end();
      }
    });



// Events search
// Optional parameters include event title and date, both url

app.get('/events2017/events/search', function (req, res, next) {
      var newData = JSON.parse(gEventData);

// http://127.0.0.1:8090/events2017/events/search?search=Lumiere&date=2017-06-09


// if no search terms provided then return all events
      if(req.query.search == undefined && req.query.date == undefined)
      {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(newData, null, 2));
        res.end();
        return;
      }

// if the data is inputted, check it is a valid date
      if(req.query.date != undefined)
      {
        if(isValidDate(req.query.date.toString()) == false)
        {
          res.status(404).json({"Error": "Not a valid date" });
          res.end();
          return;
        }
      }



      var event_title = req.query.search;
      var event_date = req.query.date;


      // if both are inputted, need to check that, if they are both found
      // that they arent finding different events
      // if there is a conflict, return neither


      if(event_title != undefined && event_date != undefined)
      {
        var foundTitle = false;
        var titleLocation;
        var foundDate = false;
        var dateLoction
        for(var i = 0; i < newData.events.length; i++) {
            if(newData.events[i].title.includes(event_title) == true)
            {
              foundTitle = true;
              titleLocation = i;
            }
            if(newData.events[i].date == event_date){
              foundDate = true;
              dateLoction = i;
          }
        }


        if(titleLocation != dateLoction)
        {
          res.status(404).json({"Error": "No such event exists" });
          res.end()
          return;
        }
      }


      var found = false;
      var location;
      for(var i = 0; i < newData.events.length; i++) {

        var title = newData.events[i].title;
        var date = newData.events[i].date;
        if ((title.includes(event_title) == true) || (date == event_date)){
            // both paramters are optional
              found = true;
              location = i;
              break;
          }
          else
          {
            continue;
          }
          // if gone through all the events and no match found then return false
          if(i == gEventData.events.length)
          {
            found = false;
          }
        }

      if(found)
      {
        var specificEvent = {"events":[newData.events[location]]};
        // 2nd parameter returns pretty print.
        res.end(JSON.stringify(specificEvent, null, 2));
      }
      else {
        res.status(404).json({"Error": "No such event exists" });
        res.end()
      }
})

//Events get via event_id
// cant use the word 'event' as it is a keyword
//http://127.0.0.1:8090/events2017/events/get/E-01

app.get('/events2017/events/get/:event_id', function (req, res) {
      var data = JSON.parse(gEventData);

      // if paramater is not included or not equal to an event ID
      if(req.params.event_id == '')
      {
        res.status(404).json({ "error": "No such event" });
        res.end();
        return;
      }

      var found = false;
      var location;
      for(var i = 0; i < data.events.length; i++) {
          if (data.events[i].event_id == req.params.event_id) {
              found = true;
              location = i;
              break;
          }
          else
          {
            found = false;
          }
        }
      if(found)
      {
        var specificEvent = {"events":[data.events[location]]};
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(specificEvent, null, 2));
      }
      else {
        res.status(404).json({ "Error": "No such event exists" });
      }
});

// Add venue
// https://www.gitbook.com/book/kevinchisholm/handling-post-requests-with-express-and-node-js/details
// https://www.tutorialspoint.com/nodejs/nodejs_restful_api.htm

app.post('/events2017/venues/add', function (req, res) {

        token = req.cookies.auth_token;

        if(token == '' || token == null )
        {
          res.status(400).json({ "Error": "No valid athentication token" });
          res.end();
          return;
        }

        if(req.body.name == '' || req.body.name == null )
        {
          res.status(400).json({ "Error": "No venue name given" });
          res.end();
          return;
        }

          var j;
          gVenueData = JSON.parse(gVenueData);
          size = Object.keys(gVenueData.venues).length;
          j = size+1;
          j = j.toString();

          var venue_id = "v_" + j;

          var venueData = {
            token: token,
            name: req.body.name,
            postcode: req.body.postcode || null,
            town: req.body.town || null,
            url: req.body.url || null,
            icon: req.body.icon || null
          }

        gVenueData.venues[venue_id] = venueData;


        data = JSON.stringify(gVenueData)
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(data);
        res.end();
  });

// https://stackoverflow.com/questions/18758772/how-do-i-validate-a-date-in-this-format-yyyy-mm-dd-using-jquery
// check date is in specific format
// ISO8601 = YYYY-MM-DD
function isValidDate(dateString) {
  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  if(!dateString.match(regEx)) return false;  // Invalid format
  else return true;
}


//Add event
app.post('/events2017/events/add', function (req, res) {

      token = req.cookies.auth_token;

      if(token == '' || token == null )
      {
        res.status(400).json({ "Error": "No token provided" });
        res.end();
        return;
      }

      if(req.body.event_id == '' || req.body.event_id == null )
      {
        res.status(400).json({ "Error": "No event id given" });
        res.end();
        return;
      }
      if(req.body.title == '' || req.body.title == null )
      {
        res.status(400).json({ "Error": "No event title given" });
        res.end();
        return;
      }
      if(req.body.venue_id == '' || req.body.venue_id == null )
      {
        res.status(400).json({ "Error": "No venue id given" });
        res.end();
        return;
      }
      if(req.body.date == '' || req.body.date == null )
      {
        res.status(400).json({ "Error": "No date given" });
        res.end();
        return;
      }
      // check date is in specific format
      if(isValidDate(req.body.date) == false)
      {
        res.status(400).json({ "Error": "Date in wrong format" });
        res.end();
        return;
      }

      try
      {
        gEventData = JSON.parse(gEventData)
      }
      catch(err)
      {

      }

      var venue_id = req.body.venue_id;
      var location;
      for(var i=0; i<gEventData.events.length; i++){
        if(gEventData.events[i].venue.venue_id == venue_id)
        {
          location = i;
          break;
        }
      }

      var name = gEventData.events[location].venue.name;
      var postcode = gEventData.events[location].venue.postcode;
      var town = gEventData.events[location].venue.town;
      var url = gEventData.events[location].venue.url;
      var icon = gEventData.events[location].venue.icon;

      var eventData = {
        token: token,
        event_id: req.body.event_id,
			  title: req.body.title,
        blurb: req.body.blurb || null,
        date: req.body.date,
        url: req.body.url2 || null,
        venue:
        {
          name: name,
          postcode: postcode,
          town: town,
          url: url,
          icon: icon,
          venue_id: req.body.venue_id
        }
      }

      gEventData.events.push(eventData)

      var dataToSend = {
        token: token,
        event_id: req.body.event_id,
			  title: req.body.title,
        venue_id: req.body.venue_id,
        blurb: req.body.blurb || null,
        date: req.body.date,
        url: req.body.url2 || null
        }

      dataToSend = JSON.stringify(dataToSend)
      res.write(dataToSend)
      res.end()

});

            //       AUTHENTICATION SERVICE         //

//  Provide a POST method which takes username, password and IP address
//  issues an auth_token for that IP address which lasts for two hours

app.post('/events2017/auth', function(req,res){
  fs.readFile('users.json', function(err, data) {



    var location;

    data = JSON.parse(data);

    length = Object.keys(data.users[0]).length

    var found = false;
    for (i = 0; i < length; i++) {
      if(req.body.username == data.users[i].username)
      {
        location = i;
        found = true;
        break;
      }
    }
    if(found == false)
    {
      res.status(404).json({ "Error": "Username doesn't exist" });
      res.end();
      return;
    }

    if(req.body.password != data.users[location].password)
    {
      res.status(404).json({ "Error": "Password incorrect" });
      res.end();
      return;
    }


    if(req.body.password != req.body.confirmPassword)
    {
      res.status(404).json({ "Error": "Passwords don't match" });
      res.end();
      return;
    }

    username = req.body.username;


    //create an auth token and sends it to client

    var token = jwt.sign({
      data: username
    }, app.get('superSecret'), { expiresIn: '2h' });

    res.writeHead(200, {"Content-Type": "application/json"});
    var dataSend = {
      token: token
    }
    dataSend = JSON.stringify(dataSend);
    res.write(dataSend);
    res.end();
  });
});

// Provide a GET method which takes an auth_token and and IP address
// and returns whether or not the token is valid
app.get('/events2017/auth2', function(req,res){

// get token via cookie
  var token = req.cookies.auth_token;

  // CHECKING IP ADDRESS


  ip = req.ip;
  // returns ::ffff:129.234.xxx.yyy
  ip = ip.toString();
  

    // The auth_token concertina should be valid for all times for IP addresses 129.234.xxx.yyy

    if (token) {

      if(token == "concertina" && ip.substring(0,14) == "::ffff:129.234")
      {
        res.status(200).json({ "Success": "Token is valid" });
        res.end();
        return;
      }

      // verifies secret and checks exp
      jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) {
          res.status(404).json({ "Error": "Not a valid token" });
          res.end();
          return;
        }
        else {
          // if everything is good, save to request for use in other routes
          req.decoded = decoded;
          res.status(200).json({ "Success": "Token is valid" });
          res.end();
          return;
        }
      });
    }
    else {
      // if there is no token, return an error
      res.status(404).json({ "Error": "No token" });
      res.end();
      return;
      }
  });



// ERROR HANDLING

app.use(function(req, res) {
    res.status(404).json({ "error": "File not found" });
});

app.use(function(req, res, next) {
    res.status(500).json({"error": "Server error"});
});


// error 404 response
function send404Response(res)
{
  res.status(404).json({ "error": "File not found" });
}
