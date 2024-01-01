// jshint esversion:6
require('dotenv').config()
const bodyParser = require("body-parser");
const express = require("express");
const ejs = require("ejs");
const mongoose=require("mongoose");
const app = express();
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));


app.use(session({
    secret: "Our Little Secret.",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 3600000, // 1 hour (adjust as needed)
      httpOnly: false
  }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", { useNewUrlParser: true });
const userSchema = new mongoose.Schema({
  username: String, 
    email: String,
    password:String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
    done(null,user.id);
});

passport.deserializeUser(function(id,done){
    User.findById(id).exec()
    .then(function(user) {
      done(null, user);
    })
    .catch(function(err) {
      done(err);
    });
});


app.get("/register",function(req,res){
    res.render("register");
});
app.get("/",function(req,res){
    res.render("home");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    });
});

app.get("/secrets", function(req, res) {
  User.find({ "secret": { $ne: null } })
    .then(foundUsers => {
      res.render("secrets", { usersWithSecrets: foundUsers });
    })
    .catch(err => {
      console.error("Error fetching secrets:", err);
      res.status(500).send("Internal Server Error");
    });
});


app.post("/register", async function(req, res) {
  try {
      // Check if a user with the given username email already exists
      const existingUser = await User.findOne({ username: req.body.username });

      if (existingUser) {
          // User with the given username email already exists
          console.log("User with this email already exists");
          return res.render("register", { error: "User with this email already exists" });
      }

      // User does not exist, proceed with registration
      const user = await User.register({ username: req.body.username }, req.body.password);

      // Authenticate the user and redirect to secrets page
      passport.authenticate("local")(req, res, function() {
          res.cookie('username', req.body.username);
          res.redirect("/secrets");
      });
  } catch (err) {
      console.error(err);
      res.redirect("/register");
  }
});

app.post("/login", function(req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
  
    req.login(user, function(err) {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, function() {
          res.cookie('username', req.body.username);
          res.render("secrets");
        });
      }
    });
  });
app.listen(3000,function(){
    console.log("Server is Running on Port 3000");
});

