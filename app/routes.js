
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
        console.log('STUDENT!!!!!!!!',JSON.stringify(student))
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
    db.collection('quiz').find({teacherId: teacherId, course:courseName, "type": "quiz"}).toArray((err, quizList) =>{
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
    db.collection("quiz").findOne({_id: ObjectID(req.body.surveyId)}, (err, survey)=>{
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
        db.collection('quiz').findOne({_id: ObjectID(req.body.quizId)}, (err, surveyResult)=>{
          console.log("???" ,err, result)
          //res.redirect("profile")

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
          if (surveyResult !== null){
            res.redirect('/doSurvey?surveyId=' + surveyResult._id)
          }else{
            res.redirect('profile')
          }
        })

      })
    })

  })

  app.get('/doSurvey', (req, res)=>{
    const surveyId = req.query.surveyId
    console.log("findSurvey****************", surveyId)
    console.log('the SURVEYboddddyyy', req.body, "the userrrr", req.user)
    db.collection('quiz').findOne({_id:ObjectID(surveyId)}, (err, quiz)=>{
      if ("survey" in quiz){
        res.render('doSurvey.ejs',{
          user:req.user,
          quiz: quiz
        })
      } else {
        res.redirect('profile')
      }
    })
  })

  app.get('/testCourse', (req, res)=>{
    db.collection('students').find({course: {$elemMatch:{courseName:'French'}}}).toArray((err, result)=>{
      console.log("app.get/testCourse", result)

    })})

    app.get('/gradeQuiz',isLoggedIn, (req, res)=>{
      if (req.session.passport.user.role == "teacher"){
        db.collection('quiz').findOne({_id: ObjectID(req.query.quizId)},
        (err, quiz) => {
          db.collection('students').find({course: {$elemMatch: {courseName:quiz.course}}}).toArray((err, students)=>{

            students = students.map(student => {
              const completedQuizzes = student.quizzResults.filter(result => {
                return result.quizId === quiz._id.toString()
              })
              if (completedQuizzes.length > 0) {
                return { student: student, disabled: false }
              } else {
                return { student: student, disabled: true }
              }
            })

            res.render("gradeQuiz", {
              user:req.user,
              students: students,
              courseName: quiz.course,
              quizName: quiz.quizName,
              quizId: req.query.quizId
            })
          })
        })
      } else {
        res.redirect("profile")
      }
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

    // =========================================================================
    // TEACHER PAGES ===========================================================
    // =========================================================================

    // this page is a form allows the teacher to create quizzes that their students can see and take

    app.get('/createQuiz', isLoggedIn, (req,res) => {
      console.log("CQ USER\n", req.session.passport.user)

      // only teachers are allowed to see this page
      if (req.session.passport.user.role == "teacher"){

        // for a new quiz the quizId query params does not exist, but once you hit save and continue, a quiz object is created in the database and we pass the id of that object as a query param to continue adding questions to the correct quiz object (342-355)
        if(req.query.quizId){
          db.collection('quiz').findOne({_id:ObjectID(req.query.quizId)},(err, result) =>{

            res.render('/teacher/createQuiz', {
              user: req.user,
              quiz: result
            })
          })
        } else {
          res.render('/teacher/createQuiz', {
            user: req.user,
            quiz: null
          })
        }

      // redirect other user roles to thier profile
      } else {
        res.redirect('profile')
      }
    })

    app.post('/createQuiz', (req, res) => {
      // set up the object for the question form that the teacher user filled out
      const currentQuestion = {
        prompt: req.body.prompt,
        answersA: req.body.answersA,
        answersB: req.body.answersB,
        answersC: req.body.answersC,
        answersD: req.body.answersD,
        correctAnswer: req.body.correctAnswer
      };

      // if the quiz ID is not included in the request create a new quiz object in the database
      if(req.body.quizId === ""){
        db.collection('quiz').save({
          teacherId: req.user.local.email,
          quizName: req.body.quizName,
          course: req.body.course,
          description: req.body.description,
          dueDate: req.body.dueDate,
          type: "quiz",
          questions: [currentQuestion]
        }, (err, newQuiz) => {
          if (err) return console.log(err)
          console.log('saved to database')
          if (req.body.done) {
            res.redirect('/profile')
          } else if (req.body.continue) {

            // get quiz ID from the write operation and redirect our user so they can keep adding questions to that quiz
            let quizId = newQuiz.ops[0]._id
            res.redirect('/createQuiz?quizId=' + quizId)
          } else {
            let quizId = newQuiz.ops[0]._id
            res.redirect('/createSurvey?quizId=' + quizId)
          }
        })
      } else {


        //we found it using the id of the document/object and we are updating/adding more questions to an existing quiz

        db.collection('quiz').findOneAndUpdate({
          _id: ObjectID(req.body.quizId)
        }, {
          $push: {
            questions: currentQuestion
          }
        }, {
          sort: {
            _id: -1
          },
        }, (err, updateresult) => {

          if (err) return res.send(err)
          if (req.body.done) {
            // the user is done adding questions so redirect them to profile page
            res.redirect('/profile')
          } else if (req.body.continue) {
            // the user wants to add a new question so redirect them to the same form
            res.redirect('/createQuiz?quizId=' + req.body.quizId)
          } else {
            // the user wants to add/attach a survey to the quiz so redirect them to the survey form
            res.redirect('/createSurvey?quizId=' + req.body.quizId)
          }
        })
      }
    })

    // this page is a form allows the teacher to create surveys that their students can see and take
    app.get('/createSurvey', isLoggedIn, (req, res)=>{
      if (req.session.passport.user.role == "teacher") {
        db.collection('quiz').findOne({_id:ObjectID(req.query.quizId)}, (err, result) => {
          if (err !== null) {
            res.redirect('profile')
          } else {
            res.render('/teacher/createSurvey', {
              quiz: result
            })
          }
        })
      } else {
        res.redirect('profile')
      }
    })

    app.post('/createSurvey', (req, res) => {
    // set up the object for the question form that the teacher user filled out
      const currentSquestion = {
        prompt: req.body.prompt,
        optionsA: req.body.optionsA,
        optionsB: req.body.optionsB,
        optionsC: req.body.optionsC,
        optionsD: req.body.optionsD,
        optionsE: req.body.optionsE,
        comments: req.body.comments
      };

      // add survey question to quiz object
      db.collection('quiz').findOneAndUpdate({
        _id: ObjectID(req.body.quizId)
      }, {
        $set: {
          "survey.description": req.body.description
        },
        $push: {
          "survey.questions": currentSquestion
        }
      }, {
        sort: {
          _id: -1
        },
      }, (err, updateresult) => {
        //console.log('UPDATES', updateresult)
        if (err) return res.send(err)
        if (req.body.done) {
          // the user is done adding questions so redirect them to profile page
          res.redirect('/profile')
        } else {
          // the user wants to add a new question so redirect them to the same form
          res.redirect('/createSurvey?quizId=' + req.body.quizId)
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
    db.collection('courses').insert({shortName, teacherEmail, teacherId: req.user._id, title, startDate, endDate, description}, (err, result) => {
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
    console.log('WHAT ARE THE COURSES', courses, req.body)
    const promiseArr = courses.map(([teacherId, courseId]) =>{
      return new Promise((resolve, reject) => {
        db.collection('enrollments').insert({student, course: courseId }, (err, result) => {
          console.log('ENROLLMENTS ERROR', err)
          if (err) {
            reject(err);
          } else {
            console.log('ENROLLMENTS saved to daabase', student, courseId);

            db.collection('teachers').findOneAndUpdate({_id: teacherId}, {$push: {students: student}}, (teacherErr, result) => {
              console.log('PUSH STUDENT INTO ARRAY', teacherId, student)
              db.collection('courses').findOne({_id: ObjectID(courseId)},(courseErr, course) =>{
                let courseTitle = course.title
                console.log("FOUND COURSE", courseTitle, courseId)
                db.collection('users').findOne({_id: ObjectID(teacherId)}, (err, userResult) =>{


                  db.collection('students').findOneAndUpdate({_id: ObjectID(student)},{$push: {course: {courseName: courseTitle, teacherId: teacherId, teacherEmail: userResult.local.email}}}, (studentErr, studentResult) => {
                    console.log('STUDENT REULTS', studentResult)



                    console.log('studenrttrttt ERROR', studentErr, 'teachererrrrrr RESULT', result)
                    if (teacherErr || courseErr || studentErr) {
                      reject(teacherErr + courseErr + studentErr);
                    } else {
                      resolve(result);
                    }
                  })
                })
              })
            });
          }
        });
      });
    });
    console.log('PROMISE ARRAYYYYY',promiseArr)
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
