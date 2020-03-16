var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./Users');
var Movie = require('./Movies');
var jwt = require('jsonwebtoken');
var cors = require('cors');


var app = express();
module.exports = app; // for testing
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

// hey

var router = express.Router();

router.route('/movies')
    .post(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);
        if (!req.body.title || !req.body.releaseDate || !req.body.genre) {
            res.json({success: false, message: 'Error,  Empty fields.'});
        }
        else if(!req.body.actors[0] || !req.body.actors[1]|| !req.body.actors[2]){

            res.json({success: false, message: 'Error,  Less than 3 actors.'});

        }
        else {
            var movie = new Movie();
            movie.title = req.body.title;
            console.log(movie.title);
            movie.releaseDate = req.body.releaseDate;
            console.log(movie.releaseDate)
            movie.genre = req.body.genre;
            console.log(movie.genre);
            movie.actors = req.body.actors;


            // save the movie
            movie.save(function(err) {

                if (err) {

                    console.log('Error Inserting New Data');
                    if (err.name == 'ValidationError') {
                        for (field in err.errors) {
                            console.log(err.errors[field].message);
                        }
                    }
                    // duplicate entry
                    if (err.code == 11000)
                        return res.json({ success: false, message: 'A Movie with that title already exists. '});
                    else
                        return res.send(err);
                }

                res.json({ success: true, message: 'Movie created.' });
            });
        }

    })
    .put(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);

        if (!req.body.title || !req.body.s || !req.body.update) {
            res.json({success: false, message: 'Error,  Empty fields.'});
        }
        var temp = req.body.s;
        const filter = { title: req.body.title };
        console.log(filter);
        var update = req.body.s;
        var args = {};
        args[update] = req.body.update;
        console.log(args);


        Movie.findOneAndUpdate(filter, args, function(err, result) {
            if (err) {
                res.send(err);
            }
            else {
                res.json({ success: true, message: 'Movie Updated.' });
            }
        });

    })
    .delete(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);

        if (!req.body.title) {
            res.json({success: false, message: 'Error,  Empty fields.'});
        }


        Movie.findOneAndDelete({'title':req.body.title})
            .then(deletedDocument => {
                if(deletedDocument) {
                    res.json({ success: true, message: 'Movie Deleted.' });
                }
                else {
                    res.json({success: false, message: 'Error,  no matching movie found.'});
                }
            })
            .catch(err => console.error(`Failed to find and delete movie: ${err}`))

    })
    .get(authJwtController.isAuthenticated, function (req, res) {
        console.log(req.body);

        Movie.find(function (err, movie) {
        if(err){
            res.send(err);
        }
        else{
            res.json(movie);
        }
        })

    });

router.route('/postjwt')
    .post(authJwtController.isAuthenticated, function (req, res) {
            console.log(req.body);
            res = res.status(200);
            if (req.get('Content-Type')) {
                console.log("Content-Type: " + req.get('Content-Type'));
                res = res.type(req.get('Content-Type'));
            }
            res.send(req.body);
        }
    );

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userId;
        User.findById(id, function(err, user) {
            if (err) res.send(err);

            var userJson = JSON.stringify(user);
            // return that user
            res.json(user);
        });
    });

router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);
            // return the users
            res.json(users);
        });
    });

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, message: 'Please pass username and password.'});
    }
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        // save the user
        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else
                    return res.send(err);
            }

            res.json({ success: true, message: 'User created!' });
        });
    }
});

router.post('/signin', function(req, res) {
    var userNew = new User();
    //userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) res.send(err);

        user.comparePassword(userNew.password, function(isMatch){
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, message: 'Authentication failed.'});
            }
        });


    });
});

app.use('/', router);
app.listen(process.env.PORT || 8080);
