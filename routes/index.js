var express = require('express');
var router = express.Router();
const userModel = require("./users")
const postModel = require("./posts")
const localStrategy = require("passport-local");
const passport = require('passport');
const path = require('path');
const multer = require('multer');
const fs = require("fs")
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
})

const upload = multer({ storage: storage})
passport.use(new localStrategy(userModel.authenticate()))

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});
router.post("/upload", isLoggedIn, upload.single("image"), function (req, res, next) {
  userModel.findOne({ username: req.session.passport.user })
    .then(function (founduser) {
      if (founduser.image && founduser.image !== "def.png") {
        fs.unlinkSync(`./public/images/uploads/${founduser.image}`);
      }
      founduser.image = req.file.filename;
      founduser.save()
        .then(function () {
          res.redirect("back");
        })
        .catch(function (err) {
          console.error(err);
          res.status(500).send("Kuch samasya aayi, kripya dubara koshish karein.");
        });
    });
});

router.post('/register', function(req, res, next) {
  userModel.findOne({ username: req.body.username })
    .then(function(found) {
      if (found) {
        res.send("user already exists")
      } else {
        var newUser = new userModel({
          username: req.body.username,
          age: req.body.age,
          email: req.body.email,
          image: req.body.image,
        })
        userModel.register(newUser, req.body.password)
          .then(function(u) {
            passport.authenticate('local')(req, res, function() {
              res.redirect('/profile')
            })
          })
      }
    })
});

router.get('/profile', isLoggedIn, function(req, res, next) {
  userModel.findOne({ username: req.session.passport.user })
  .populate("posts")
    .then(function(founduser) {
      res.render("profile", { founduser })
    })
})

router.post('/post', isLoggedIn ,function(req, res, next) {
  userModel.findOne({ username: req.session.passport.user })
    .then(function(find) {
      postModel.create({
        userid: find._id,
        data: req.body.post
      })
      .then(function(post) {
        find.posts.push(post._id)
        find.save()
      })
      .then(function() {
        res.redirect("back")
      })
    })
})
router.get('/like/:postid', isLoggedIn, function (req, res, next) {
  userModel
  .findOne({username: req.session.passport.user})
  .then(function(user){
    postModel
    .findOne({_id: req.params.postid})
      .then(function(post){
        if(post.likes.indexOf(user._id) === -1){
          post.likes.push(user._id);
        }
        else{
          post.likes.splice(post.likes.indexOf(user._id), 1);
        }

        post.save()
        .then(function(){
          res.redirect("back");
        })
      })
  })
});

router.get('/feed', isLoggedIn ,function(req, res, next) {
 userModel.findOne({username:req.session.passport.user})
 .then(function(user){
  postModel.find()
  .populate("userid")
  .then(function(allpost) {
    res.render("feed", { allpost,user })
  })
 })
})

router.get('/login', function(req, res, next) {
  res.render("login")
})

router.post('/login', passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/login"
}), function(req, res, next) {
})

router.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
})

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  } else {
    res.redirect("/login")
  }
}

module.exports = router;
