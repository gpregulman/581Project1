var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mysql = require('mysql');
var async = require('async');
var connection = mysql.createConnection({
  host     : 'mysql.eecs.ku.edu',
  user     : 'ewenski',
  password : 'ewenski'
});

connection.connect();

var query = connection.query('select * from ewenski.users;', function(err, result) {
//  console.log(result);
});

var app = express();
var number= 1;
app.use(cookieParser());
app.use(session({secret:'supersecret', cookie:{}}));

app.get('/', function(req, res){
	res.status(200);
	res.sendFile(__dirname + "/index.html");
});

app.get('/userid', function(req, res) {
    inventory[number] = [number + "s laptop"];
    connection.query('INSERT INTO ewenski.users VALUES(\''+number+'\', \''+inventory[number]+'\',1);', function(err, result) {
  		//console.log(result);
	});
	var query = connection.query('select * from ewenski.users;', function(err, result) {
//	  console.log(result);
	});
	
	res.send(number.toString());
	number++;
});

app.get('/:userid/offline', function(req, res) {
    connection.query('update ewenski.users set online = 0 where name = \''+req.params.userid+'\';');
//    console.log(req.params.userid, "went offline")
    res.send('You have gone offline.');
});

app.get('/users-online/:userid', function(req, res) {
    connection.query('select name,inv from ewenski.users where name != \''+req.params.userid+'\' and online = 1;', function(err, result) {
      res.send(result);
    });
});

app.get('/:userid/inventory', function(req, res){
    var query = connection.query('select inv from ewenski.users where name = \''+req.params.userid+'\';', function(err, result) {
        if(result.length == 0) {
            connection.query('update ewenski.users set inv = \''+(inventory[req.params.userid] ? inventory[req.params.userid] : '')+'\' where name = \''+req.params.userid+'\';');
        } else if(result[0].inv != ''){
//            console.log('get inv: ', result);
            inventory[req.params.userid] = result[0].inv.split(',');
        } else {
            inventory[req.params.userid] = [];
        }
    });

    connection.query('update ewenski.users set online = 1 where name = \''+req.params.userid+'\';');
    res.set({'Content-Type': 'application/json'});
    res.status(200);
    res.send(inventory[req.params.userid]);
//    console.log(req.params.userid, inventory);
    return;
	
});

app.get('/:where', function(req, res) {
	for (var i in campus) {
		if (req.params.where == campus[i].id) {
		    res.set({'Content-Type': 'application/json'});
		    res.status(200);
		    res.send(campus[i]);
		    return;
		}
	}
	res.status(404);
	res.send("not found, sorry");
});

app.get('/images/:name', function(req, res){
	res.status(200);
	res.sendFile(__dirname + "/" + req.params.name);
});

app.delete('/:id/:item/:userid', function(req, res){
	for (var i in campus) {
		if (req.params.id == campus[i].id) {
		    res.set({'Content-Type': 'application/json'});
		    var ix = -1;
		    if (campus[i].what != undefined) {
					ix = campus[i].what.indexOf(req.params.item);
		    }
		    if (ix >= 0) {
		       res.status(200);
			inventory[req.params.userid].push(campus[i].what[ix]); // stash
            connection.query('UPDATE ewenski.users set inv = \''+inventory[req.params.userid]+'\' where name = \''+req.params.userid+'\';');
			var query = connection.query('select * from ewenski.users;', function(err, result) {
//			  console.log(result);
			});
		        res.send(inventory);
			campus[i].what.splice(ix, 1); // room no longer has this
            connection.query('UPDATE ewenski.users set inv = \''+campus[i].what+'\' where name = \''+campus[i].id+'\';');
			return;
		    }
		    res.status(200);
		    res.send([]);
		    return;
		}
	}
	res.status(404);
	res.send("location not found");
});

app.put('/:id/:item/:userid', function(req, res){
	for (var i in campus) {
		if (req.params.id == campus[i].id) {
				// Check you have this
				var ix = inventory[req.params.userid].indexOf(req.params.item)
				if (ix >= 0) {
					dropbox(ix,campus[i],req);
					res.set({'Content-Type': 'application/json'});
					res.status(200);
					res.send([]);
				} else {
					res.status(404);
					res.send("you do not have this");
				}
				return;
		}
	}
	res.status(404);
	res.send("location not found");
});

app.listen(3000);

var dropbox = function(ix,room,req) {
	var item = inventory[req.params.userid][ix];
	inventory[req.params.userid].splice(ix, 1);	 // remove from inventory
    connection.query('UPDATE ewenski.users set inv = \''+inventory[req.params.userid]+'\' where name = \''+req.params.userid+'\';');
	var query = connection.query('select * from ewenski.users;', function(err, result) {
//		console.log(result);
	});
	if (room.id == 'allen-fieldhouse' && item == "basketball") {
		room.text	+= " Someone found the ball so there is a game going on!"
		return;
	}
	if (room.id == 'dole-institute' && item == "ku flag") {
		room.text	+= " You have captured the flag! Time for pizza!"
		campus[9].next = {"north": "eaton-hall","east": "ambler-recreation","west": "dole-institute", "south": "pizza-shuttle"}
		return;
	}
    if (!room.what) {
		room.what = [];
	}
//    console.log('room: ', room.what);
	room.what.push(item);
    connection.query('UPDATE ewenski.users set inv = \''+room.what+'\' where name = \''+room.id+'\';');
}

var inventory = [];


var campus =
    [ { "id": "lied-center",
	"where": "LiedCenter.jpg",
	"next": {"east": "eaton-hall", "south": "dole-institute"},
	"text": "You are outside the Lied Center."
      },
      { "id": "dole-institute",
	"where": "DoleInstituteofPolitics.jpg",
	"next": {"east": "allen-fieldhouse", "north": "lied-center"},
	"text": "You take in the view of the Dole Institute of Politics. This is the best part of your walk to Nichols Hall."
      },
      { "id": "eaton-hall",
	"where": "EatonHall.jpg",
	"next": {"east": "snow-hall", "south": "allen-fieldhouse", "west": "lied-center"},
	"text": "You are outside Eaton Hall. You should recognize here."
      },
      { "id": "snow-hall",
	"where": "SnowHall.jpg",
	"next": {"east": "strong-hall", "south": "ambler-recreation", "west": "eaton-hall"},
	"text": "You are outside Snow Hall. Math class? Waiting for the bus?"
      },
      { "id": "strong-hall",
	"where": "StrongHall.jpg",
	"next": {"east": "outside-fraser", "north": "memorial-stadium", "west": "snow-hall"},
	"what": ["coffee"],
	"text": "You are outside Stong Hall."
      },
      { "id": "ambler-recreation",
	"where": "AmblerRecreation.jpg",
	"next": {"west": "allen-fieldhouse", "north": "snow-hall"},
	"text": "It's the starting of the semester, and you feel motivated to be at the Gym. Let's see about that in 3 weeks."
      },
      { "id": "outside-fraser",
  "where": "OutsideFraserHall.jpg",
	"next": {"west": "strong-hall","north":"spencer-museum"},
	"what": ["basketball"],
	"text": "On your walk to the Kansas Union, you wish you had class outside."
      },
      { "id": "spencer-museum",
	"where": "SpencerMuseum.jpg",
	"next": {"south": "outside-fraser","west":"memorial-stadium"},
	"what": ["art"],
	"text": "You are at the Spencer Museum of Art."
      },
      { "id": "memorial-stadium",
	"where": "MemorialStadium.jpg",
	"next": {"south": "strong-hall","east":"spencer-museum"},
	"what": ["ku flag"],
	"text": "Half the crowd is wearing KU Basketball gear at the football game."
      },
      { "id": "allen-fieldhouse",
	"where": "AllenFieldhouse.jpg",
	"next": {"north": "eaton-hall","east": "ambler-recreation","west": "dole-institute"},
	"text": "Rock Chalk! You're at the field house."
      },
      { "id": "pizza-shuttle",
	"where": "pizza.jpg",
	"next": {"north":"allen-fieldhouse"},
	"what": ["pizza"],
	"text": "PIZZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA!"
      }
    ]

var index = 0;
async.whilst(
    function () { return index < campus.length; },
    function (callback) {
        var query = connection.query('select inv from ewenski.users where name = \''+campus[index].id+'\';', function(err, result) {
            if(result.length == 0) {
                connection.query('INSERT INTO ewenski.users VALUES(\''+campus[index].id+'\', \''+(campus[index].what ? campus[index].what : '')+'\',-1);');
            } else if(result[0].inv != '') {
//                console.log(result);
                campus[index].what = result[0].inv.split(',');
            } else {
                campus[index].what = '';
            }

            index++;
            callback();
        });
    },
    function (err) {
//        console.log('Done\n');
    }
);

connection.query('select name,inv from ewenski.users where online != -1;', function(err, result) {
  var uids = [];
//  console.log('other users: ', result);
  if(result.length > 0)
  {
    for(var i = 0; i < result.length; i++) {
           uids.push(Number(result[i].name));
      }
      uids.sort();
      uids.reverse();
      number = uids[0] + 1;
  }
});
