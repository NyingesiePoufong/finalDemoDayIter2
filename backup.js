
module.exports = function(app, passport, db, ObjectID) {
  const Course = require('./models/course.js');
  const Enrollment = require('./models/enrollment.js');

  // normal routes ===============================================================

  // show the home page (will also have our login links)
  app.get('/', function(req, res) {
    res.render('index.ejs');
  });


  // PROFILE SECTION =========================
  app.get('/profile', isLoggedIn, function(req, res) {
    console.log("looking for USER TWILIO", req.user)
    if (req.user.local.role === 'student') {
      db.collection('students').findOne({email:req.user.local.email},(err, student) => {
        if (err) return console.log(err)
        //console.log(student)
        student.course = student.course.map(course => {
          let quizzes =  student.quizzResults.filter(quiz => course.courseName== quiz.courseName && (!quiz.type || quiz.type === "quiz"))
          console.log("quizes**********", quizzes)
          let total = 0;
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
        //find all the quizzes in the coursess of the student
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
      db.collection('quiz').find({teacherId:req.user.local.email, "type":"quiz"}).toArray((err, result) => {
        db.collection('quiz').find({teacherId:req.user.local.email, "type":"survey"}).toArray((err, surveyResult) => {
          if (err) return console.log(err)
          //console.log(result)
          //console.log(surveyResult)
          res.render('profile.ejs', {
            user : req.user,
            quizList: result,
            surveyList: surveyResult
          })
        });
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
    db.collection('quiz').find({teacherId:teacherId, course:courseName, "type": "quiz"}).toArray((err, quizList) =>{
      console.log('FINDING QUIZLIST!!!!!!!!!!!!!', quizList, err)
      res.render('studentQuizList', {
        user: req.user,
        quizList: quizList,
        courseName: courseName
      })
    })
  })

  app.get('/doAssignment', (req, res)=>{
    const quizId = req.query.quizId
    console.log("findAssignment ************************", quizId)
    console.log('the boddddyyy', req.body, "the userrrr", req.user)
    db.collection('quiz').findOne({_id:ObjectID(quizId)}, (err, quiz)=>{
      console.log('quiz', quiz.questions)
      res.render('doAssignment',{
        quiz:quiz,
        user:req.user
      })
    })
  })

  app.post('/studentResponse', isLoggedIn, (req, res)=>{
    console.log("theBODY for SURVEY", req.body)
    const surveyResult = {
      surveyId: req.body.surveyId
    }
    let responses = [];
    let responseNum = 0
    while(req.body["options"+responseNum]){
      const response = req.body["options"+responseNum]
      console.log('response number *********', responseNum)
      responses.push(response)
      console.log("responsesssss", responses)
      responseNum ++
    }
    surveyResult.responses = responses
    db.collection("survey").findOne({_id: ObjectID(req.body.surveyId)}, (err, survey)=>{
      console.log("survey results for user" ,surveyResult,req.user.local.email )
      db.collection('students').findOneAndUpdate({email:req.user.local.email}, {
        $push: {
          surveyResults: surveyResult
        }
      }, {
        sort: {_id: -1},
      }, (err, result) => {
        db.collection('survey').findOne({course:req.body.course, quizName:req.body.quizName, teacherId:req.body.teacherId}, (err, surveyResult)=>{
          if (surveyResult !== null){
            res.redirect('/doSurvey?surveyId=' + surveyResult._id)
          }else{
            console.log("???" ,err, result)
            res.redirect("profile")
          }
        })
      })
    })
  })










  app.post('/studentAnswer', isLoggedIn, (req, res)=>{
    console.log("the body", req.body)
    const quizResult = {
      quizId:req.body.quizId
    }
    let answers =[]
    let questionNum = 0
    while(req.body["answers"+questionNum]){
      const answer = req.body["answers"+questionNum]
      console.log('question number *********', questionNum)
      answers.push(answer)
      console.log("answersssssssss", answers)
      questionNum ++
    }
    quizResult.answers = answers
    db.collection("quiz").findOne({_id: ObjectID(req.body.quizId)}, (err, quiz)=>{
      let score = 0
      for(let i=0; i < quiz.questions.length; i++){
        console.log('checking answer********',quiz.questions[i].correctAnswer, answers[i])
        if (quiz.questions[i].correctAnswer == answers[i]){
          console.log("correct")
          score++
        }else {
          console.log("incorrect")
        }
      }
      console.log("final score", score)
      quizResult.score = score/quiz.questions.length
      quizResult.courseName = quiz.course

      console.log("quiz results for user" ,quizResult,req.user.local.email )
      db.collection('students').findOneAndUpdate({email:req.user.local.email}, {
        $push: {
          quizzResults: quizResult
        }
      }, {
        sort: {_id: -1},
      }, (err, result) => {
        db.collection('survey').findOne({course:req.body.course, quizName:req.body.quizName, teacherId:req.body.teacherId}, (err, surveyResult)=>{
          if (surveyResult !== null){
            res.redirect('/doSurvey?surveyId=' + surveyResult._id)
          }else{
            console.log("???" ,err, result)
            res.redirect("profile")

            const accountSid = 'ACd629b0ac3aacd8e5e3496e4699ea1ef7';
            const authToken = process.env.twilioAuth;
            const client = require('twilio')(accountSid, authToken);

            let body = "This is your child's results for the " + quiz.quizName +  "for " + quiz.course + " and their score was " + quizResult.score*100 +"%"
            console.log("LOOKING for body!!!!!!!!", body, req.user.parentContactInfo, req.user)

            client.messages
            .create({
              body: body,
              from: '+16509037299',
              to: req.user.parentContactInfo
            })
            .then(message => console.log("twilioSID!!!!!!", message.sid));
          }
        })

      })
    })

  })

  app.get('/doSurvey', (req, res)=>{
    const surveyId = req.query.surveyId
    console.log("findSurvey****************", surveyId)
    console.log('the SURVEYboddddyyy', req.body, "the userrrr", req.user)
    db.collection('survey').findOne({_id:ObjectID(surveyId)}, (err, survey)=>{
      console.log('survey', survey.questions)
      res.render('doSurvey.ejs',{
        survey:survey,
        user:req.user
      })
    })
  })

  app.get('/testCourse', (req, res)=>{
    db.collection('students').find({course: {$elemMatch:{courseName:'French'}}}).toArray((err, result)=>{
      console.log("app.get/testCourse", result)

    })})

    app.get('/gradeQuiz',isLoggedIn, (req, res)=>{
      db.collection('students').find({course: {$elemMatch: {courseName:req.query.course}}}).toArray((err, result)=>{
        //TODO:create users in the database instead of using mock users
        const mockStudent = [
          {id: 1, email: '1@1.com'},
          {id: 2, email: '2@2.com'},
          {id: 3, email: '3@3.com'}
        ]
        console.log("app.get(/gradeQuiz students)", result)
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
        db.collection('quiz').findOne({_id:ObjectID(req.query.quizId), "type":"quiz"}, (err, quiz)=>{
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
        const currentQuestion = {prompt: req.body.prompt,answersA:req.body.answersA, answersB:req.body.answersB, answersC:req.body.answersC, answersD:req.body.answersD, correctAnswer: req.body.correctAnswer};
        console.log("looking for currentQuestion", currentQuestion)
        //if we do not find it
        if(result === null){
          //we did not find it so we are creating a new one with the first question we created
          let qType = 'quiz'

          console.log('looking for bug', currentQuestion)
          db.collection('quiz').save({
            teacherId: req.user.local.email,
            quizName: req.body.quizName,
            course: req.body.course,
            description: req.body.description,
            dueDate: req.body.dueDate,
            "type": qType,
            questions: [currentQuestion]
          }, (err, newQuiz) => {
            if (err) return console.log(err)
            console.log('saved to database')
            if (req.body.done) {
              res.redirect('/profile')
            } else if (req.body.continue) {
              //we need a way to know what quiz they are working on thus the queryString/?
              console.log("New Quiz", newQuiz.ops)
              res.redirect('/createQuiz?quizId=' + newQuiz.ops[0]._id)
            } else {
              res.render('createSurvey', {
                teacherId: req.user.local.email,
                courseName: req.body.course,
                quizName: req.body.quizName,
                survey: null
              })
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
            //console.log('UPDATES', updateresult)
            if (err) return res.send(err)
            if (req.body.done) {
              res.redirect('/profile')
            } else if (req.body.continue) {
              res.redirect('/createQuiz?quizId=' + result._id)
            } else {
              res.render('createSurvey', {
                teacherId: result.teacherId,
                courseName: result.course,
                quizName: result.quizName,
                survey: null
              })
            }
          })
        }
      })
    })
    //create survey route
    app.post('/createSurvey', (req, res) => {
      //try to find quiz using the given criteria
      console.log("The body on post",req.body)
      db.collection('survey').findOne({teacherId:req.user.local.email, surveyName: req.body.surveyName, course: req.body.courseName, quizName: req.body.quizId},(err, result) =>{
        console.log("found survey", result)
        const currentSquestion = {prompt: req.body.prompt,optionsA:req.body.optionsA, optionsB:req.body.optionsB, optionsC:req.body.optionsC, optionsD:req.body.optionsD, optionsE:req.body.optionsE, comments: req.body.comments};
        console.log("looking for currentQuestion", currentSquestion)
        //if we do not find it
        if(result === null){
          //we did not find it so we are creating a new one with the first question we created
          let qType = 'quiz'
          if(req.body.type === "survey"){
            qType = 'survey'
          }
          console.log('looking for bug', currentSquestion)
          db.collection('survey').save({
            teacherId: req.user.local.email,
            surveyName: req.body.surveyName,
            quizName: req.body.quizId,
            course: req.body.courseName,
            description: req.body.description,
            dueDate: req.body.dueDate,
            "type": qType,
            questions: [currentSquestion]
          }, (err, newSurvey) => {
            if (err) return console.log(err)
            console.log('saved to database')
            if (req.body.done) {
              res.redirect('/profile')
            } else {
              //we need a way to know what quiz they are working on thus the queryString/?
              console.log("New Survey", newSurvey.ops)
              res.redirect('/createSurvey?surveyId=' + newSurvey.ops[0]._id)
            }
          })
        } else {
          //we found it using the id of the document/object and we are updating it with a new question
          console.log('updating survey', result._id)
          db.collection('survey')
          .findOneAndUpdate({
            _id: result._id
          }, {
            $push: {
              questions: currentSquestion
            }
          }, {
            sort: {
              _id: -1
            },
          }, (err, updateresult) => {
            //console.log('UPDATES', updateresult)
            if (err) return res.send(err)
            if (req.body.done) {
              res.redirect('/profile')
            } else {
              res.redirect('/createSurvey?surveyId=' + result._id)
            }
          })
        }
      })
    })

    app.get('/createSurvey', (req, res)=>{
      db.collection('survey').findOne({_id:ObjectID(req.query.surveyId)}, (err, result)=>{
        if (err !== null) {
          res.redirect('profile')
        }else {
          res.render('createSurvey', {
            teacherId: result.teacherId,
            courseName: result.course,
            quizName: result.quizName,
            survey: result
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

    app.get('/create-course', isLoggedIn, (req, res) => {
      res.render('createCourse')
    });

    app.post('/create-course', isLoggedIn, (req, res) => {
      console.log('reqqqqq user==>>>', req.user)
      const teacherEmail = req.user.local.email
      const {shortName, title, startDate, endDate, description} = req.body;
      db.collection('courses').insert({shortName, teacherEmail, title, startDate, endDate, description}, (err, result) => {
        if (err) return console.log(err)
        //find one and update on the teacher to add the course to the teacher's course array --> for future reference perhaps depends
        console.log('saved to database')
        res.redirect('/profile')
      })
    });

    app.get('/enroll', isLoggedIn, (req, res) => {
      db.collection('courses').find().toArray((err, result) => {
        res.render('enrollCourse', {
          courses: result
        });
      });
    });

    app.get('/enroll/course/:courseId', isLoggedIn, (req, res) => {
      db.collection('enrollments').find({course: req.params.courseId}).toArray((err, result) => {
        console.log("app.get/enroll/course/:courseId result", result)
        res.render('enrollmentByCourse', {
          enrollments: result,
          courseId: req.params.courseId
        });
      });
    });

    app.post('/enroll', isLoggedIn, (req, res) => {
      const student = req.user.local.refId;
      const courses = Object.entries(req.body);
      const promiseArr = courses.map(([teacherId, courseId]) =>{
        return new Promise((resolve, reject) => {
          db.collection('enrollments').insert({student, course: courseId }, (err, result) => {
            if (err) {
              reject(err);
            } else {
              console.log('saved to daabase');

              db.collection('teachers').findOneAndUpdate({_id: teacherId}, {$push: {students: student}}, (err, result) => {
                console.log('studenrttrttt', err, 'teachererrrrrr', result)
                if (err) {
                  reject(err);
                } else {
                  resolve(result);
                }
              });
            }
          });
        });
      });
      Promise.all(promiseArr).then(() => {
        res.redirect('/enroll');
      }).then(err => console.log('errrrrr', err));
    });

    app.post("/enrollmentsByCourses/:courseId", isLoggedIn, (req, res)=> {
      const {student} = req.body
      const {courseId} = req.params
      db.collection("courses").findOneAndUpdate({_id: courseId}, {$addToSet: {
        students: student
      }})
      db.collection('students').findOneAndUpdate({_id: student}, {$addToSet: {
        course: courseId
      }})
      //current enrollment and delete this enrollment so we do not see it again so you do not approve them twice.. generate sep form and button
      console.log("app.post/enrollmentsByCourses req.body", req.body)
      res.send('okay')
    })
  };


  // route middleware to ensure user is logged in
  function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
    return next();

    res.redirect('/');
  }
