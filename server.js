import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import redis from "redis";
import mongoose from "mongoose";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const token = process.env.WHATSAPP_TOKEN;
const verifyToken = process.env.VERIFY_TOKEN;
const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOSTNAME,
    port: Number(process.env.REDIS_PORT),
  },
  password: process.env.REDIS_PASSWORD,
});

redisClient.on("error", (err) => console.error("Redis Client Error:", err));
async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log("✅ Connected to Redis");
    } catch (err) {
      console.error("❌ Redis Connection Error:", err.message);
      process.exit(1);
    }
  }
}
connectRedis();

mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// Updated schema with phoneNumber field
const orderSchema = new mongoose.Schema(
  {
    phoneNumber: String,    // WhatsApp user phone
    customer: String,       // customer name
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

async function sendTextMessage(to, text) {
  try {
    console.log(`Sending text message to ${to}: "${text}"`);
    const resp = await axios.post(
      `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: text },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Message sent response:", resp.data);
  } catch (error) {
    console.error(`Error sending text message to ${to}:`, error.response?.data || error.message);
  }
}

async function sendInteractiveButtons(to, body, buttons) {
  try {
    console.log(`Sending interactive buttons to ${to}: ${body}`);
    const resp = await axios.post(
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
    console.log("Interactive buttons sent response:", resp.data);
  } catch (error) {
    console.error(`Error sending interactive buttons to ${to}:`, error.response?.data || error.message);
  }
}

async function sendInteractiveList(to, header, body, options) {
  try {
    console.log(`Sending interactive list to ${to}: ${body}`);
    const resp = await axios.post(
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
    console.log("Interactive list sent response:", resp.data);
  } catch (error) {
    console.error(`Error sending interactive list to ${to}:`, error.response?.data || error.message);
  }
}

async function getSession(userId) {
  try {
    const data = await redisClient.get(`session:${userId}`);
    console.log(`Retrieved session for ${userId}:`, data);
    return data ? JSON.parse(data) : { step: 0, data: {} };
  } catch (err) {
    console.error(`Error fetching session for ${userId}:`, err.message);
    return { step: 0, data: {} };
  }
}

async function setSession(userId, session) {
  try {
    await redisClient.set(`session:${userId}`, JSON.stringify(session));
    console.log(`Session set for ${userId}:`, session);
  } catch (err) {
    console.error(`Error setting session for ${userId}:`, err.message);
  }
}

async function deleteSession(userId) {
  try {
    await redisClient.del(`session:${userId}`);
    console.log(`Session deleted for ${userId}`);
  } catch (err) {
    console.error(`Error deleting session for ${userId}:`, err.message);
  }
}

async function sendWelcomeFlow(to) {
  try {
    await sendTextMessage(to, "🤝 Yagya waste solutions welcome you on board!\nIf you want to cancel at any time, type 'cancel'.");
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
    console.log(`Welcome flow sent to ${to}`);
  } catch (err) {
    console.error(`Error during welcome flow for ${to}:`, err.message);
  }
}

app.get("/", (req, res) => {
  res.send(`
    <h2>✅ Yagya WhatsApp Bot Server</h2>
    <p>Status: Running</p>
    <p>Current Time (UTC): ${new Date().toISOString()}</p>
  `);
});

app.post("/webhook", async (req, res) => {
  try {
    console.log("Received webhook payload:", JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages?.[0];

    if (messages) {
      const from = messages.from;
      const type = messages.type;

      let session = await getSession(from);
      const userText = messages.text?.body?.trim().toLowerCase() || "";
      console.log(`Message from ${from} of type ${type} with text: "${userText}" and session:`, session);

      if (userText === "cancel") {
        await deleteSession(from);
        await sendTextMessage(from, "❌ Your order has been cancelled.");
        await sendWelcomeFlow(from);
        session = { step: 1, data: {} };
        await setSession(from, session);
        return res.sendStatus(200);
      }

      if (session.step === 0) {
        await sendWelcomeFlow(from);
        session.step = 1;
        await setSession(from, session);
        return res.sendStatus(200);
      }

      let selection = null;
      if (type === "interactive") {
        if (messages.interactive.type === "button_reply") {
          selection = messages.interactive.button_reply.id;
        } else if (messages.interactive.type === "list_reply") {
          selection = messages.interactive.list_reply.id;
        }
      }

      try {
        if (session.step === 1 && selection) {
          session.data.category = selection;
          await sendInteractiveButtons(from, "Choose pickup vehicle:", [
            { id: "bike", title: "Bike" },
            { id: "van", title: "Van" },
            { id: "truck", title: "Truck" },
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

          // Ask for customer name next
          await sendTextMessage(from, "Please enter your full name:");
          session.step = 4.5;
          await setSession(from, session);
        } else if (session.step === 4.5 && messages.text) {
          session.data.customerName = messages.text.body;

          // Prepare date buttons based on vehicle
          if (session.data.vehicle === "van" || session.data.vehicle === "truck") {
            // Find next Saturday and Sunday dates
            const today = new Date();
            const nextSat = new Date(today);
            while (nextSat.getDay() !== 6) {
              nextSat.setDate(nextSat.getDate() + 1);
            }
            const nextSun = new Date(nextSat);
            nextSun.setDate(nextSat.getDate() + 1);

            await sendInteractiveButtons(
              from,
              "Select pickup date:",
              [
                { id: nextSat.toISOString().slice(0, 10), title: "Saturday" },
                { id: nextSun.toISOString().slice(0, 10), title: "Sunday" },
              ]
            );
          } else {
            // Normal 3 sequential days for bike or others
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const dayAfter = new Date(today);
            dayAfter.setDate(today.getDate() + 2);

            await sendInteractiveButtons(
              from,
              "Select pickup date:",
              [
                { id: today.toISOString().slice(0, 10), title: "Today" },
                { id: tomorrow.toISOString().slice(0, 10), title: "Tomorrow" },
                { id: dayAfter.toISOString().slice(0, 10), title: "Day After" },
              ]
            );
          }

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

          await sendTextMessage(
            from,
            `✅ Booking Confirmed!\n\n📌 Category: ${session.data.category}\n🚚 Vehicle: ${session.data.vehicle}\n⚖️ Weight: ${session.data.weight}kg\n🏠 Address: ${session.data.address}\n👤 Customer Name: ${session.data.customerName}\n📅 Date: ${session.data.date}\n⏰ Time: ${session.data.time}\n💰 Payment: ${session.data.payment}\n\nThank you for using Yagya ♻️`
          );

          const newOrder = new Order({
            phoneNumber: from,
            customer: session.data.customerName || "",
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
            console.error("❌ MongoDB order save failed:", err.message);
          }

          await deleteSession(from);
        } else if (messages.text && session.step > 0) {
          console.log(`Received free text "${messages.text.body}" at step ${session.step}, sending help message.`);
          await sendTextMessage(from, "I didn't understand that. Please select an option from the menu or type 'cancel' to start over.");
        }
      } catch (err) {
        console.error("Error processing booking flow:", err.message);
      }


      return res.sendStatus(200);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook handler error:", err.response?.data || err.message);
    if (!res.headersSent) {
      res.sendStatus(500);
    }
  }
});

// Webhook verification endpoint
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const tokenParam = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && tokenParam && mode === "subscribe" && tokenParam === verifyToken) {
    console.log("Webhook verified");
    res.status(200).send(challenge);
  } else {
    console.warn("Webhook verification failed");
    res.sendStatus(403);
  }
});

// Admin API: Get orders with optional date filter ?date=YYYY-MM-DD
app.get("/api/orders", async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {};
    if (date) {
      filter.date = date;
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Failed to fetch orders:", err.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ WhatsApp Bot running on port ${process.env.PORT || 3000}`)
);



