import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import redis from "redis";

dotenv.config();
const app = express();
app.use(bodyParser.json());

const token = process.env.WHATSAPP_TOKEN;
const verifyToken = process.env.VERIFY_TOKEN;
const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER; // best practice

// Redis client setup
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
await redisClient.connect();

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

app.get("/", (req, res) => {
  res.send("Hello Guys CHATBOT chalne ko ready hai!!");
});

// Helper to get/set session from Redis
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

// ------------------ MAIN LOGIC ------------------
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages?.[0];

    if (messages) {
      const from = messages.from;
      const type = messages.type;

      // Load or initialize session
      let session = await getSession(from);

      // Send welcome and start flow if session step is 0 (new or reset)
      if (session.step === 0) {
        await sendTextMessage(from, "Yagya waste solutions welcome you on board 🤝");
        await sendInteractiveList(
          from,
          "♻️ Yagya E-Waste Service",
          "Select the type of waste:",
          [
            { id: "electronics", title: "Electronics" },
            { id: "plastic", title: "Plastic" },
            { id: "glass", title: "Glass" },
            { id: "metal", title: "Metal" },
            { id: "paper", title: "Paper & Cardboard" },
            { id: "multiple", title: "Multiple Types" },
          ]
        );
        session.step = 1;
        await setSession(from, session);
        return res.sendStatus(200); // End here to wait for user selection
      }

      // Handle interactive replies (buttons or lists)
      let selection = null;
      if (type === "interactive") {
        if (messages.interactive.type === "button_reply") {
          selection = messages.interactive.button_reply.id;
        } else if (messages.interactive.type === "list_reply") {
          selection = messages.interactive.list_reply.id;
        }
      }

      // FLOW STEPS
      if (session.step === 1 && selection) {
        session.data.category = selection;
        await sendInteractiveButtons(from, "Choose your pickup vehicle:", [
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
        await sendTextMessage(from, "Please enter your pickup address:");
        session.step = 4;
        await setSession(from, session);
      } else if (session.step === 4 && messages.text) {
        session.data.address = messages.text.body;
        // Offer next 5 days as pickup dates using buttons (simulated calendar)
        const today = new Date();
        const dateOptions = [];
        for (let i = 0; i < 5; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const id = date.toISOString().slice(0, 10);
          const title = date.toLocaleDateString();
          dateOptions.push({ id, title });
        }
        await sendInteractiveButtons(from, "Select a pickup date:", dateOptions);
        session.step = 5;
        await setSession(from, session);
      } else if (session.step === 5 && selection) {
        session.data.date = selection;
        await sendInteractiveButtons(from, "Select a pickup time slot:", [
          { id: "slot1", title: "10AM–12PM" },
          { id: "slot2", title: "12PM–4PM" },
          { id: "slot3", title: "4PM–7PM" },
        ]);
        session.step = 6;
        await setSession(from, session);
      } else if (session.step === 6 && selection) {
        session.data.time = selection;
        await sendInteractiveButtons(from, "Choose a payment method:", [
          { id: "upi", title: "💳 UPI" },
          { id: "cod", title: "💵 Cash on Pickup" },
        ]);
        session.step = 7;
        await setSession(from, session);
      } else if (session.step === 7 && selection) {
        session.data.payment = selection;

        await sendTextMessage(
          from,
          `✅ Booking Confirmed!\n\n📌 Category: ${session.data.category}\n🚚 Vehicle: ${session.data.vehicle}\n⚖️ Weight: ${session.data.weight} kg\n🏠 Address: ${session.data.address}\n📅 Date: ${session.data.date}\n⏰ Time: ${session.data.time}\n💰 Payment: ${session.data.payment}\n\nThank you for using Yagya ♻️`
        );

        await sendTextMessage(
          ownerNumber,
          `🔔 New Order Received!\n\nCustomer: ${from}\nCategory: ${session.data.category}\nVehicle: ${session.data.vehicle}\nWeight: ${session.data.weight} kg\nAddress: ${session.data.address}\nDate: ${session.data.date}\nTime: ${session.data.time}\nPayment: ${session.data.payment}`
        );

        await deleteSession(from); // reset session
      }

      res.sendStatus(200);
    } else {
      // For any other call without messages
      res.sendStatus(200);
    }
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
app.listen(3000, () => console.log("✅ WhatsApp Bot running on port 3000"));
