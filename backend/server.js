require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const OpenAI = require("openai");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const path = require("path");

const User = require("./models/user");
const auth = require("./middleware/auth");
const tradeRoutes = require("./routes/trades");
const presetRoutes = require("./routes/presets");
const aiTradeScanRoutes = require("./routes/aiTradeScan");
const aiReviewRoutes = require("./routes/aiReview");
const importCsvRoutes = require("./routes/importCsv");
const settingsRoutes = require("./routes/settings");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

console.log("USING THIS SERVER FILE NOW");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

app.get("/", (req, res) => {
  res.send("API running and MongoDB connected!");
});

app.get("/api/trades-test", (req, res) => {
  res.send("api trades test works");
});

app.get("/api/settings-test", (req, res) => {
  res.send("settings route registered");
});

app.use("/api/presets", presetRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/ai", aiTradeScanRoutes);
app.use("/api/ai", aiReviewRoutes);
app.use("/api/import", importCsvRoutes);
app.use("/api/settings", settingsRoutes);

app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      subscriptionActive: false,
    });

    await user.save();

    res.json({ message: "User created" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/analyze-trades", auth, async (req, res) => {
  try {
    const Trade = require("./models/trade");
    const trades = await Trade.find({ userId: req.user.id });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional trading coach. Analyze trades and give actionable feedback on risk management, consistency, and mistakes.",
        },
        {
          role: "user",
          content: JSON.stringify(trades),
        },
      ],
    });

    res.json({ analysis: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/create-checkout-session", auth, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: "YOUR_PRICE_ID",
          quantity: 1,
        },
      ],
      success_url: "http://localhost:3000/dashboard",
      cancel_url: "http://localhost:3000",
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`USING THIS SERVER FILE NOW - port ${PORT}`);
});