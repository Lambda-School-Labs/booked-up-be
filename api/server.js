const express = require("express");
const path = require("path");
const configureMiddleware = require("./configure-middleware.js");
const registerRouter = require("../auth/register-router");
const loginRouter = require("../auth/login-router");
const usersRouter = require("../users/user-router");
const contentRouter = require("../author-content/content-router");
const libraryRouter = require("../content-library/library-router");
const adminRegisterRouter = require("../auth/admin-register-router");
const adminLoginRouter = require("../auth/admin-login");
const adminRouter = require("../admins/admin-router");
const userResetPassword = require("../users/user-reset-password");
const messageRouterAgent = require("../messaging/message-router-agent");
const messageRouterAuthor = require("../messaging/message-router-author");
const comments = require("../comments/comments-router");

const server = express();
server.set("view engine", "ejs");

configureMiddleware(server);

server.use("/api/auth/register", registerRouter);
server.use("/api/auth/login", loginRouter);
server.use("/api/users", usersRouter);
server.use("/api/author-content", contentRouter);
server.use("/api/content-library", libraryRouter);
server.use("/api/auth/admin/register", adminRegisterRouter);
server.use("/api/auth/admin/login", adminLoginRouter);
server.use("/api/admin", adminRouter);
server.use("/api/users/password", userResetPassword);
server.use("/api/message/agent", messageRouterAgent);
server.use("/api/message/author", messageRouterAuthor);
server.use("/api/comments", comments);

server.get("/", (req, res) => {
  res.status(200).json({
    api: "Booked Up server live."
  });
});

server.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "booked-up-fe", "build", "index.html"));
});

module.exports = server;