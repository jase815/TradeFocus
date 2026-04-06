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
const folderRoutes = require("./routes/folders");

const app = express();
const PORT = process.env.PORT || 5000;

app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook secret is missing");
    return res.status(500).send("Webhook not configured");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = String(session.metadata?.userId || "").trim();
      const stripeCustomerId = String(session.customer || "").trim();
      const stripeSubscriptionId = String(session.subscription || "").trim();

      if (!userId) {
        console.warn("Stripe webhook missing metadata.userId on checkout.session.completed");
      } else {
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          {
            subscriptionActive: true,
            stripeCustomerId,
            stripeSubscriptionId,
          },
          { new: true }
        );

        if (updatedUser) {
          console.log(`Activated Pro for user ${userId}`);
        } else {
          console.warn(`User not found for Stripe checkout completion: ${userId}`);
        }
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const stripeSubscriptionId = String(subscription.id || "").trim();
      const stripeCustomerId = String(subscription.customer || "").trim();

      let updatedUser = null;

      if (!stripeSubscriptionId && !stripeCustomerId) {
        console.warn("Deleted subscription webhook is missing both subscription and customer IDs");
      } else {
        updatedUser = await User.findOneAndUpdate(
          {
            $or: [
              stripeSubscriptionId ? { stripeSubscriptionId } : null,
              stripeCustomerId ? { stripeCustomerId } : null,
            ].filter(Boolean),
          },
          {
            subscriptionActive: false,
            stripeSubscriptionId: "",
          },
          { new: true }
        );
      }

      if (updatedUser) {
        console.log(`Deactivated Pro for user ${updatedUser._id}`);
      } else {
        console.warn(
          `No user linkage found for deleted subscription ${stripeSubscriptionId || "(missing id)"}`
        );
      }
    } else {
      console.log(`Unhandled Stripe webhook event: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed:", error.message);
    return res.status(500).send("Webhook handling failed");
  }
});

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:3000",
        "https://tradefocus.org",
        "https://www.tradefocus.org",
        "https://trade-focus.vercel.app",
      ];

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);
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
app.use("/api/folders", folderRoutes);

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("username email subscriptionActive");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      username: user.username || "",
      email: user.email || "",
      subscriptionActive: !!user.subscriptionActive,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/signup", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "That username is already taken" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "That email is already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      subscriptionActive: false,
    });

    await user.save();

    res.json({ message: "Your account has been created" });
  } catch (error) {
    if (error && error.code === 11000) {
      if (error.keyPattern?.username) {
        return res.status(400).json({ message: "That username is already taken" });
      }

      if (error.keyPattern?.email) {
        return res.status(400).json({ message: "That email is already in use" });
      }
    }

    res.status(500).json({ message: error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || "").trim();
    const password = String(req.body.password || "");

    if (!identifier) {
      return res.status(400).json({ message: "Email or username is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const normalizedEmail = identifier.toLowerCase();
    const user = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: identifier }],
    });
    if (!user) {
      return res.status(400).json({ message: "Account not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
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
    if (!process.env.STRIPE_PRICE_ID) {
      console.error("STRIPE_PRICE_ID is missing");
      return res.status(500).json({ message: "Stripe is not configured" });
    }

    if (!process.env.CLIENT_URL) {
      console.error("CLIENT_URL is missing");
      return res.status(500).json({ message: "Client URL is not configured" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      metadata: {
        userId: req.user.id,
      },
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success`,
      cancel_url: `${process.env.CLIENT_URL}/settings`,
    });

    console.log(`Checkout session created for user ${req.user.id}`);
    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`USING THIS SERVER FILE NOW - port ${PORT}`);
});
console.log("Stripe key prefix:", process.env.STRIPE_SECRET_KEY?.slice(0, 12));
console.log("Stripe price prefix:", process.env.STRIPE_PRICE_ID?.slice(0, 12));