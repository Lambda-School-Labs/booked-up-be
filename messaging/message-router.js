const router = require("express").Router();
const { check, validationResult, body } = require("express-validator");
const Messages = require("./message-model.js");
const MessageInbox = require("./message-inbox-model.js");
const MessageReply = require("./message-reply-model");
const Users = require("../users/user-model");
const checkRole = require("../check-role/check-role-message.js");
const restricted = require("../auth/restricted");

// POST message

router.post(
  "/:id",
  [
    body("recipient").custom((value, { req, loc, path }) => {
      if (value.indexOf("@") !== -1) {
        return Users.findByEmail(value).then((user) => {
          const newUser = user.map((u) => u.email_verification);
          if (
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value) ===
            false
          ) {
            return Promise.reject("please input a valid email");
          }
          if (user.length === 0) {
            return Promise.reject("email not registered");
          }
          if (newUser[0] === false) {
            return Promise.reject("email has not been validated");
          }
        });
      }
      return Users.findByDisplayName(value).then((user) => {
        const displayUser = user.map((u) => u.email_verification);
        if (value.length === 0) {
          return Promise.reject("recipient field required");
        }
        if (/\s/.test(value) === true) {
          return Promise.reject("please enter a valid display name");
        }
        if (user.length === 0) {
          return Promise.reject("display name not registered");
        }
        if (displayUser[0] === false) {
          return Promise.reject("user has not been validated");
        }
      });
    }),
    check("subject", "subject must not exceed 255 characters")
      .optional()
      .isLength({ max: 255 }),
    check(
      "body",
      "please enter a body not exceeding 1020 characters"
    ).isLength({ max: 1020 }),
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("Agent not found");
          }
        })
      ),
    check("recipient_id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("Author not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const newMessage = {
      subject: req.body.subject,
      body: req.body.body,
      sender_id: req.params.id,
      recipient_id: req.body.recipient_id,
      recipient: req.body.recipient,
    };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    Messages.add(newMessage).then((message) => {
      const newInbox = {
        user_id: req.params.id,
        recipient_id: req.body.recipient_id,
        message_id: message.id,
      };
      MessageInbox.add(newInbox)
        .then(() => {
          res.status(200).json(message);
        })
        .catch((err) => {
          res.status(500).json(err.message);
        });
    });
  }
);

// Post message reply

router.post(
  "/:id/reply/:replyId",
  [
    body("recipient").custom((value, { req, loc, path }) => {
      if (value.indexOf("@") !== -1) {
        return Users.findByEmail(value).then((user) => {
          const newUser = user.map((u) => u.email_verification);
          if (
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value) ===
            false
          ) {
            return Promise.reject("please input a valid email");
          }
          if (user.length === 0) {
            return Promise.reject("email not registered");
          }
          if (newUser[0] === false) {
            return Promise.reject("email has not been validated");
          }
        });
      }
      return Users.findByDisplayName(value).then((user) => {
        const displayUser = user.map((u) => u.email_verification);
        if (value.length === 0) {
          return Promise.reject("recipient field required");
        }
        if (/\s/.test(value) === true) {
          return Promise.reject("please enter a valid display name");
        }
        if (user.length === 0) {
          return Promise.reject("display name not registered");
        }
        if (displayUser[0] === false) {
          return Promise.reject("user has not been validated");
        }
      });
    }),
    check("subject", "subject must not exceed 255 characters")
      .optional()
      .isLength({ max: 255 }),
    check(
      "body",
      "please enter a body not exceeding 1020 characters"
    ).isLength({ max: 1020 }),
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("User not found");
          }
        })
      ),
    check("replyId")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        MessageInbox.findByMessageId(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("Message not found");
          }
        })
      ),
    check("recipient_id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("Author not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    const newMessage = {
      subject: req.body.subject,
      body: req.body.body,
      sender_id: req.params.id,
      recipient_id: req.body.recipient_id,
      recipient: req.body.recipient,
    };
    Messages.add(newMessage).then((message) => {
      const newInbox = {
        user_id: req.params.id,
        recipient_id: req.body.recipient_id,
        message_id: message.id,
      };
      const newReply = {
        user_id: req.params.id,
        recipient_id: req.body.recipient_id,
        message_id: message.id,
        linking_id: req.params.replyId,
      };
      MessageInbox.add(newInbox).then(() => {
        MessageReply.add(newReply)
          .then(() => {
            console.log(newReply);
            res.status(200).json(message);
          })
          .catch((err) => {
            res.status(500).json(err.message);
          });
      });
    });
  }
);

// Get all messages

router.get("/", restricted, checkRole(), (req, res) => {
  MessageInbox.findByIdSearch(req.params.id)
    .then((messages) => {
      res.status(200).json(messages);
    })
    .catch((err) => {
      res.status(500).json(err.message);
    });
});

// Get all messages-inbox by User ID

router.get(
  "/:id/inbox",
  [
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("User not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    const { body, sort, limit } = req.query;
    MessageInbox.findById(req.params.id, {
      body,
      sort,
      limit,
    })
      .then((messages) => {
        res.status(200).json({
          Messages: messages,
        });
      })
      .catch((err) => {
        res.status(500).json(err.message);
      });
  }
);

// Get message by message ID

router.get(
  "/:id/inbox/:messageId",
  [
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("User not found");
          }
        })
      ),
    check("messageId")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        MessageInbox.findByMessageId(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("Message not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    MessageInbox.findByMessageId(req.params.messageId)
      .then((message) => {
        res.status(200).json({
          Message: message,
        });
      })
      .catch((err) => {
        res.status(500).json(err.message);
      });
  }
);

// Get message by message ID and show all responses

router.get(
  "/inbox/:id",
  [
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        MessageInbox.findByMessageId(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("Message not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    const { body, sort, limit } = req.query;
    MessageReply.findById(req.params.id, { body, sort, limit })
      .then((message) => {
        res.status(200).json({
          Message: message,
        });
      })
      .catch((err) => {
        res.status(500).json(err.message);
      });
  }
);

// Get sent messages by User ID

router.get(
  "/:id/sent",
  [
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("User not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    const { body, sort, limit } = req.query;
    MessageInbox.findByIdSent(req.params.id, {
      body,
      sort,
      limit,
    })
      .then((messages) => {
        res.status(200).json({
          Messages: messages,
        });
      })
      .catch((err) => {
        res.status(500).json(err.message);
      });
  }
);

// Get recieved messages by user ID

router.get(
  "/:id/recieved",
  [
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("User not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    const { body, sort, limit } = req.query;
    MessageInbox.findByIdRecieved(req.params.id, {
      body,
      sort,
      limit,
    })
      .then((message) => {
        res.status(200).json({
          Message: message,
        });
      })
      .catch((err) => {
        res.status(500).json(err.message);
      });
  }
);

// Get messages by sent id and recieved id

router.get(
  "/:sentId/:recievedId",
  [
    check("sentId")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("Sending User not found");
          }
        })
      ),
    check("recievedId")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("Recipient User not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    const { body, sort, limit } = req.query;
    MessageInbox.findByIdSentandRecieved(
      req.params.sentId,
      req.params.recievedId,
      { body, sort, limit }
    )
      .then((message) => {
        res.status(200).json({
          Message: message,
        });
      })
      .catch((err) => {
        res.status(500).json(err.message);
      });
  }
);

// Get all message subjects by User ID

router.get(
  "/:id/subject/all",
  [
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("User not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    MessageInbox.findByIdSubject(req.params.id)
      .then((message) => {
        res.status(200).json({
          Message: message,
        });
      })
      .catch((err) => {
        res.status(500).json(err.message);
      });
  }
);

// Get sent subject by User ID

router.get(
  "/:id/subject/sent",
  [
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("User not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    MessageInbox.findByIdSentSubject(req.params.id)
      .then((message) => {
        res.status(200).json({
          Message: message,
        });
      })
      .catch((err) => {
        res.status(500).json(err.message);
      });
  }
);

// Get recieved subject by User ID

router.get(
  "/:id/subject/recieved",
  [
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        Users.findById(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("User not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).jsonp(errors.array());
    }
    MessageInbox.findByIdRecievedSubject(req.params.id)
      .then((message) => {
        res.status(200).json({
          Message: message,
        });
      })
      .catch((err) => {
        res.status(500).json(err.message);
      });
  }
);

// Delete message

router.delete(
  "/:id/",
  [
    check("id")
      .exists()
      .toInt()
      .optional()
      .custom((value) =>
        MessageInbox.findByMessageId(value).then((user) => {
          if (user === undefined) {
            return Promise.reject("Message not found");
          }
        })
      ),
  ],
  restricted,
  checkRole(),
  (req, res) => {
    MessageInbox.removeMessage(req.params.id)
      .then((post) => {
        res.status(200).json(post);
      })
      .catch((err) => {
        res.status(500).json(err);
      });
  }
);

module.exports = router;