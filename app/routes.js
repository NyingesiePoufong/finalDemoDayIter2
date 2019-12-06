
module.exports = function(app, passport, db, ObjectID) {
  const Course = require('./models/course.js')

  // normal routes ===============================================================

  // show the home page (will also have our login links)
  app.get('/', function(req, res) {
    res.render('index.ejs');
  });


  // PROFILE SECTION =========================
  app.get('/profile', isLoggedIn, function(req, res) {
    if (req.user.local.role === 'student') {
      db.collection('students').findOne({email:req.user.local.email},(err, student) => {
        if (err) return console.log(err)
        console.log(student)
        student.course = student.course.map(course => {
          let quizzes =  student.quizzResults.filter(quiz => course.courseName== quiz.courseName)
          total = 0;
          for(let i=0; i< quizzes.length;i++){
            total += quizzes[i].score
          }
          avg = "No Attempt Yet!";
          if(quizzes.length > 0){
            avg = total/quizzes.length * 100
            avg = `${avg}%`
          }
          course.average = avg
          return course
        })
        //find all the quizzes in the class of the student
        // db.collection('quiz').find({}).toArray((err, result) => {
        //
        // }
        console.log("Transformed Student", student)
        res.render('studentProfile.ejs', {
          user : req.user,
          student: student
        })
      });
    } else if (req.user.local.role === 'teacher') {
      db.collection('quiz').find({teacherId:req.user.local.email}).toArray((err, result) => {
        if (err) return console.log(err)
        console.log(result)
        res.render('profile.ejs', {
          user : req.user,
          quizList: result
        })
      });
    } else {
      res.render('profile.ejs', {
        user: req.user
      });
    }
  });

  app.get('/assignments/:id', (req, res) =>{
    db.collection('assignments').find().toArray((err, result) =>{
      res.render('quizzesTemplate',{
        assignment: result[req.params.id]
      })
    })

  });

  app.get('/course', (req, res) =>{
    const teacherId = req.query.teacherId
    const courseName = req.query.courseName
    console.log("checkingFor",teacherId, courseName)
    db.collection('quiz').find({teacherId, course:courseName}).toArray((err, quizList) =>{
      res.render('studentQuizList', {
        user: req.user,
        quizList: quizList,
        courseName: courseName
      })
    })
  })

  app.get('/doAssignment', (req, res)=>{
    const quizId = req.query.quizId
    console.log("findAssignment", quizId)
    db.collection('quiz').findOne({_id:ObjectID(quizId)}, (err, quiz)=>{
      res.render('doAssignment',{
        quiz:quiz,
        user:req.user
      })
    })
  })

  app.post('/studentAnswer', isLoggedIn, (req, res)=>{
    console.log(req.body)
    const quizResult = {
      quizId:req.body.quizId
    }
    let answers =[]
    let questionNum = 0
    while(req.body["answer"+questionNum]){
      const answer = req.body["answer"+questionNum]
      answers.push(answer)
      questionNum ++
    }
    quizResult.answers = answers
    db.collection("quiz").findOne({_id: ObjectID(req.body.quizId)}, (err, quiz)=>{
      let score = 0
      for(let i=0; i < quiz.questions.length; i++){
        if (quiz.questions[i].correctAnswer == answers[i]){
          score++
        }
      }
      quizResult.score = score
      quizResult.courseName = quiz.course

      console.log("looking for user" ,quizResult,req.user.local.email )
      db.collection('students').findOneAndUpdate({email:req.user.local.email}, {
        $push: {
          quizzResults: quizResult
        }
      }, {
        sort: {_id: -1},
      }, (err, result) => {
        console.log("???" ,err, result)
        res.redirect("profile")
      })

    })



  })

  app.get('/gradeQuiz', isLoggedIn, (req, res)=>{
    db.collection('students').find({course: {teacherId:req.user.local.email, courseName:req.query.course}}).toArray((err, result)=>{
      res.render("gradeQuiz", {
        user:req.user,
        students: result,
        courseName: req.query.course,
        quizName: req.query.quizName,
        quizId: req.query.quizId
      })
    })
  })

  app.get('/gradeQuizStudent', isLoggedIn, (req, res)=>{
    db.collection('students').findOne({_id:ObjectID(req.query.studentId)}, (err, student)=>{
      db.collection('quiz').findOne({_id:ObjectID(req.query.quizId)}, (err, quiz)=>{
        res.render('gradeQuizStudent', {
          user:req.user,
          student:student,
          quiz:quiz
        })
      })
    })
  })

  // LOGOUT ==============================
  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  // message board routes ===============================================================

  app.post('/messages', (req, res) => {
    db.collection('messages').save({name: req.body.name, msg: req.body.msg, thumbUp: 0, thumbDown:0}, (err, result) => {
      if (err) return console.log(err)
      console.log('saved to database')
      res.redirect('/profile')
    })
  })

  app.put('/messages', (req, res) => {
    db.collection('messages')
    .findOneAndUpdate({name: req.body.name, msg: req.body.msg}, {
      $set: {
        thumbUp:req.body.thumbUp + 1
      }
    }, {
      sort: {_id: -1},
      upsert: true
    }, (err, result) => {
      if (err) return res.send(err)
      res.send(result)
    })
  })

  app.delete('/messages', (req, res) => {
    db.collection('messages').findOneAndDelete({name: req.body.name, msg: req.body.msg}, (err, result) => {
      if (err) return res.send(500, err)
      res.send('Message deleted!')
    })
  })

  // =============================================================================
  // AUTHENTICATE (FIRST LOGIN) ==================================================
  // =============================================================================

  // locally --------------------------------
  // LOGIN ===============================
  // show the login form
  app.get('/login', function(req, res) {
    res.render('login.ejs', { message: req.flash('loginMessage') });
  });

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/login', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
  }));

  // SIGNUP =================================
  // show the signup form
  app.get('/signup', function(req, res) {
    res.render('signup.ejs');
  });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/profile', // redirect to the secure profile section
    failureRedirect : '/signup', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
  }));

  app.get('/createQuiz', isLoggedIn, (req,res) => {
    console.log("CQ USER\n", req.session.passport.user)
    if (req.session.passport.user.role == "teacher"){
      //check to see if the quiz already exists and if it does
      if(req.query.quizId){


        db.collection('quiz').findOne({_id:ObjectID(req.query.quizId)},(err, result) =>{
          console.log("found || did not find quiz", result)
          res.render('createQuiz', {
            user: req.user,
            quiz: result
          })
        })
      } else{
        res.render('createQuiz', {
          user: req.user,
          quiz: null
        })
      }
    }else{
      res.redirect('profile')
    }
  })

  app.post('/createQuiz', (req, res) => {
    //try to find quiz using the given criteria
    console.log("The body on post",req.body)
    db.collection('quiz').findOne({teacherId:req.user.local.email, quizName: req.body.quizName, course: req.body.course},(err, result) =>{
      console.log("found quiz", result)
      const currentQuestion = {prompt: req.body.prompt,answerA:req.body.answerA, answerB:req.body.answerB, answerC:req.body.answerC, answerD:req.body.answerD, correctAnswer: req.body.correctAnswer};
      console.log(currentQuestion)
      //if we do not find it
      if(result === null){
        //we did not find it so we are creating a new one with the first question we created
        db.collection('quiz').save({
        teacherId: req.user.local.email,
        quizName: req.body.quizName,
        course: req.body.course,
        description: req.body.description,
        dueDate: req.body.dueDate,
        questions: [currentQuestion]
      }, (err, newQuiz) => {
        if (err) return console.log(err)
        console.log('saved to database')
        if (req.body.done) {
          res.redirect('/profile')
        } else {
          //we need a way to know what quiz they are working on thus the queryString/?
          console.log("New Quiz", newQuiz.ops)
          res.redirect('/createQuiz?quizId=' + newQuiz.ops[0]._id)
        }
      })
      } else {
        //we found it using the id of the document/object and we are updating it with a new question
        console.log('updating quiz', result._id)
        db.collection('quiz')
      .findOneAndUpdate({
        _id: result._id
      }, {
        $push: {
          questions: currentQuestion
        }
      }, {
        sort: {
          _id: -1
        },
      }, (err, updateresult) => {
        console.log('UPDATES', updateresult)
        if (err) return res.send(err)
        if (req.body.done) {
          res.redirect('/profile')
        } else {
          res.redirect('/createQuiz?quizId=' + result._id)
        }
      })
      }
    })
  })
  // =============================================================================
  // UNLINK ACCOUNTS =============================================================
  // =============================================================================
  // used to unlink accounts. for social accounts, just remove the token
  // for local account, remove email and password
  // user account will stay active in case they want to reconnect in the future

  // local -----------------------------------
  app.get('/unlink/local', isLoggedIn, function(req, res) {
    var user            = req.user;
    user.local.email    = undefined;
    user.local.password = undefined;
    user.save(function(err) {
      res.redirect('/profile');
    });
  });

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
  return next();

  res.redirect('/');
}
