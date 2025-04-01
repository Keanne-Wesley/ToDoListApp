require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

const User = require("./models/User.js");
const Task = require("./models/Task.js");

const app = express();

// Middleware
app.use(cors({ credentials: true, origin: "http://localhost:5500" }));
app.use(bodyParser.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || "secret",
        resave: false,
        saveUninitialized: false,
    })
);
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:5500/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ googleId: profile.id });
                if (!user) {
                    user = await User.create({
                        googleId: profile.id,
                        name: profile.displayName,
                    });
                }
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Auth Routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (req, res) => {
        res.redirect("http://localhost:5500");
    }
);

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) console.error(err);
        res.redirect("/");
    });
});

app.get("/auth/status", (req, res) => res.json({ user: req.user || null }));

// Task CRUD Routes
app.post("/tasks", async (req, res) => res.json(await Task.create(req.body)));
app.get("/tasks", async (req, res) => res.json(await Task.find()));
app.put("/tasks/:id", async (req, res) =>
    res.json(await Task.findByIdAndUpdate(req.params.id, req.body, { new: true }))
);
app.delete("/tasks/:id", async (req, res) => {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted" });
});

// Start Server
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
