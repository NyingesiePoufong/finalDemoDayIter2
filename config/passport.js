// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;

// load up the user model
var User       		= require('../app/models/user');
var Student       		= require('../app/models/student');
var Teacher       		= require('../app/models/teacher');
var Parent       		= require('../app/models/parent');

// expose this function to our app using module.exports
module.exports = function(passport) {

	// =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
      //console.log("serialize\n", user.local.role)
        done(null, {_id: user.id, role: user.local.role});
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
          //console.log("deserialize\n", user)
            done(err, user);
        });
    });

 	// =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
	// by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {

		// find a user whose email is the same as the forms email
		// we are checking to see if the user trying to login already exists
        User.findOne({ 'local.email' :  email }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                return done(err);

            // check to see if theres already a user with that email
            if (user) {
                return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
            } else {

				// if there is no user with that email
                // create the user
                var newUser            = new User();

                // set the user's local credentials
                newUser.local.email    = email;

                newUser.local.password = newUser.generateHash(password); // use the generateHash function in our user model
                newUser.local.role = req.body.role;
                newUser.name = req.body.name;
                newUser.parentContactInfo = req.body.parentContactInfo

                if (req.body.role.toLowerCase() === "student"){
                  console.log("student")
                  //creates a new students that references our student DB model/schema that makes a new document in our database
                  var newStudent            = new Student();
                  // go to our document and find the property/key email and set it equal to the value email from our form
                  newStudent.email = email;
                  newUser.local.refId = newStudent._id;
                  newStudent.parentContactInfo = req.body.parentContactInfo;
                  newStudent.save();
                } else if(req.body.role.toLowerCase() === "teacher"){
                  console.log("teacher=>>>>>>")
                  // var newTeacher            = new Teacher();
                  // newTeacher.email = email;
                  // newTeacher.save((err, result))
                  // newUser.local.refId = newTeacher._id
                  Teacher.create({
                    email:email,
                  }).then(teacher => {
                    console.log('teacher created', teacher);
                    newUser.local.refId = teacher._id
                  })
                  .catch(err => console.log('err creating teacher', err))
                }else{
                  console.log("parent")
                  var newParent            = new Parent();
                  newParent.email = email;
                  newUser.local.refId = newParent._id
                  newParent.save()
                }

				// save the user
                newUser.save(function(err) {
                    if (err)
                        throw err;
                    return done(null, newUser);
                });
            }

        });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'local.email' :  email }, function(err, user) {
            // if there are any errors, return the error before anything else
            if (err)
                return done(err);

            // if no user is found, return the message
            if (!user)
                return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

            // if the user is found but the password is wrong
            if (!user.validPassword(password))
                return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

            // all is well, return successful user
            return done(null, user);
        });

    }));

};
