import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import redis from "redis";
import mongoose from "mongoose";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// ------------------ ENV VARIABLES ------------------
const token = process.env.WHATSAPP_TOKEN;
const verifyToken = process.env.VERIFY_TOKEN;
const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;

// ------------------ REDIS SETUP ------------------
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOSTNAME,
    port: Number(process.env.REDIS_PORT),
  },
  password: process.env.REDIS_PASSWORD,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("✅ Connected to Redis");
  }
}
connectRedis();

// ------------------ MONGODB SETUP ------------------
mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const orderSchema = new mongoose.Schema(
  {
    customer: String,
    category: String,
    vehicle: String,
    weight: String,
    address: String,
    date: String,
    time: String,
    payment: String,
  },
  { timestamps: true }
);
const Order = mongoose.model("Order", orderSchema);

// ------------------ HELPER FUNCTIONS ------------------
async function sendTextMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function sendInteractiveButtons(to, body, buttons) {
  await axios.post(
    `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: { buttons: buttons.map((b) => ({ type: "reply", reply: b })) },
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function sendInteractiveList(to, header, body, options) {
  await axios.post(
    `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: header },
        body: { text: body },
        action: {
          button: "Choose",
          sections: [
            {
              title: "Available Options",
              rows: options.map((o) => ({
                id: o.id,
                title: o.title,
              })),
            },
          ],
        },
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// ------------------ SESSION FUNCTIONS ------------------
async function getSession(userId) {
  const data = await redisClient.get(`session:${userId}`);
  return data ? JSON.parse(data) : { step: 0, data: {} };
}
async function setSession(userId, session) {
  await redisClient.set(`session:${userId}`, JSON.stringify(session));
}
async function deleteSession(userId) {
  await redisClient.del(`session:${userId}`);
}

// ------------------ WELCOME FLOW ------------------
async function sendWelcomeFlow(to) {
  await sendTextMessage(
    to,
    "🤝 Yagya waste solutions welcome you on board!\nIf you want to cancel at any time, type 'cancel'."
  );
  await sendInteractiveList(
    to,
    "♻️ Yagya E-Waste Service",
    "Select category of waste for pickup:",
    [
      { id: "electronics", title: "Electronics" },
      { id: "plastic", title: "Plastic" },
      { id: "glass", title: "Glass" },
      { id: "metal", title: "Metal" },
      { id: "paper", title: "Paper & Cardboard" },
      { id: "multiple", title: "Multiple Types" },
    ]
  );
}

// ------------------ SERVER STATUS ROUTE ------------------
app.get("/", (req, res) => {
  res.send(`
    <h2>✅ Yagya WhatsApp Bot Server</h2>
    <p>Status: Running</p>
    <p>Current Time (UTC): ${new Date().toISOString()}</p>
  `);
});


// ------------------ MAIN LOGIC ------------------
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages?.[0];

    if (messages) {
      const from = messages.from;
      const type = messages.type;

      let session = await getSession(from);
      const userText = messages.text?.body?.trim().toLowerCase() || "";

      // Cancel flow
      if (userText === "cancel") {
        await deleteSession(from);
        await sendTextMessage(from, "❌ Your order has been cancelled.");
        await sendWelcomeFlow(from);
        session = { step: 1, data: {} };
        await setSession(from, session);
        return res.sendStatus(200);
      }

      // First time flow
      if (session.step === 0) {
        await sendWelcomeFlow(from);
        session.step = 1;
        await setSession(from, session);
        return res.sendStatus(200);
      }

      // Interactive replies
      let selection = null;
      if (type === "interactive") {
        if (messages.interactive.type === "button_reply") {
          selection = messages.interactive.button_reply.id;
        } else if (messages.interactive.type === "list_reply") {
          selection = messages.interactive.list_reply.id;
        }
      }

      // Booking flow
      if (session.step === 1 && selection) {
        session.data.category = selection;
        await sendInteractiveButtons(from, "Choose pickup vehicle:", [
          { id: "bike", title: "🏍️ Bike" },
          { id: "van", title: "🚐 Van" },
          { id: "truck", title: "🚛 Truck" },
        ]);
        session.step = 2;
        await setSession(from, session);
      } else if (session.step === 2 && selection) {
        session.data.vehicle = selection;
        await sendTextMessage(from, "Enter the approximate weight (in kg):");
        session.step = 3;
        await setSession(from, session);
      } else if (session.step === 3 && messages.text) {
        session.data.weight = messages.text.body;
        await sendTextMessage(from, "Please enter pickup address:");
        session.step = 4;
        await setSession(from, session);
      } else if (session.step === 4 && messages.text) {
        session.data.address = messages.text.body;

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(today.getDate() + 2);

        await sendInteractiveButtons(from, "Select pickup date:", [
          { id: today.toISOString().slice(0, 10), title: `Today (${today.toLocaleDateString("en-GB")})` },
          { id: tomorrow.toISOString().slice(0, 10), title: `Tomorrow (${tomorrow.toLocaleDateString("en-GB")})` },
          { id: dayAfter.toISOString().slice(0, 10), title: `Day After (${dayAfter.toLocaleDateString("en-GB")})` },
        ]);
        session.step = 5;
        await setSession(from, session);
      } else if (session.step === 5 && selection) {
        session.data.date = selection;
        await sendInteractiveButtons(from, "Select a time slot:", [
          { id: "slot1", title: "10AM–12PM" },
          { id: "slot2", title: "12PM–4PM" },
          { id: "slot3", title: "4PM–7PM" },
        ]);
        session.step = 6;
        await setSession(from, session);
      } else if (session.step === 6 && selection) {
        session.data.time = selection;
        await sendInteractiveButtons(from, "Choose payment method:", [
          { id: "upi", title: "💳 UPI" },
          { id: "cod", title: "💵 Cash on Pickup" },
        ]);
        session.step = 7;
        await setSession(from, session);
      } else if (session.step === 7 && selection) {
        session.data.payment = selection;

        // Confirm to customer
        await sendTextMessage(
          from,
          `✅ Booking Confirmed!\n\n📌 Category: ${session.data.category}\n🚚 Vehicle: ${session.data.vehicle}\n⚖️ Weight: ${session.data.weight}kg\n🏠 Address: ${session.data.address}\n📅 Date: ${session.data.date}\n⏰ Time: ${session.data.time}\n💰 Payment: ${session.data.payment}\n\nThank you for using Yagya ♻️`
        );

        // Notify owner
        await sendTextMessage(
          ownerNumber,
          `🔔 New Order Received!\nCustomer: ${from}\nCategory: ${session.data.category}\nVehicle: ${session.data.vehicle}\nWeight: ${session.data.weight}kg\nAddress: ${session.data.address}\nDate: ${session.data.date}\nTime: ${session.data.time}\nPayment: ${session.data.payment}`
        );

        // Save to MongoDB
        const newOrder = new Order({
          customer: from,
          category: session.data.category,
          vehicle: session.data.vehicle,
          weight: session.data.weight,
          address: session.data.address,
          date: session.data.date,
          time: session.data.time,
          payment: session.data.payment,
        });

        try {
          await newOrder.save();
          console.log("✅ Order saved to MongoDB");
        } catch (err) {
          console.error("❌ MongoDB order save failed:", err);
        }

        await deleteSession(from); // reset
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// ------------------ VERIFY WEBHOOK ------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const tokenParam = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && tokenParam && mode === "subscribe" && tokenParam === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ------------------ START SERVER ------------------
app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ WhatsApp Bot running on port ${process.env.PORT || 3000}`)
);
