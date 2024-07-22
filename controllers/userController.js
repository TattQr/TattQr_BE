const User = require("../models/Users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Helper function to get the next tag
const getNextTag = async () => {
  const userCount = await User.countDocuments();
  let prefix = String.fromCharCode(97 + Math.floor(userCount / 999));
  let number = (userCount % 999) + 1;
  return `${prefix}${number}`;
};

// Register a new user
exports.signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const tag = await getNextTag();
    const user = new User({ username, email, password: hashedPassword, tag });
    await user.save();
    // const token = jwt.sign({ id: user._id }, "tattqr", {
    //   expiresIn: "24h",
    // });
    res.status(200).send({ message: "User Created SuccessFully", status: 200 });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, "tattqr", {
      expiresIn: "24h",
    });
    res
      .status(200)
      .send({ token, message: "User LoggedIn Successfully", data: user });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
