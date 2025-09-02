import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());

const token = process.env.WHATSAPP_TOKEN;
const verifyToken = process.env.VERIFY_TOKEN;

const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER; // best practice


// 🔹 Session memory
let userSessions = {};

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
        action: { buttons: buttons.map(b => ({ type: "reply", reply: b })) },
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
              rows: options.map(o => ({
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
  res.send("Hello Guys CHATBOT chalne ko ready hai!!")
})
// ------------------ MAIN LOGIC ------------------
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages?.[0];

    if (messages) {
      const from = messages.from;
      const type = messages.type;

      // Ensure session exists
      if (!userSessions[from]) {
        userSessions[from] = { step: 0, data: {} };
      }

      const session = userSessions[from];

      // ---- HANDLE INTERACTIVE REPLIES ----
      let selection = null;
      if (type === "interactive") {
        if (messages.interactive.type === "button_reply") {
          selection = messages.interactive.button_reply.id;
        } else if (messages.interactive.type === "list_reply") {
          selection = messages.interactive.list_reply.id;
        }
      }

      // ---- FLOW STEPS ----
      if (session.step === 0) {
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
      }

      else if (session.step === 1 && selection) {
        session.data.category = selection;
        await sendInteractiveButtons(from, "Choose your pickup vehicle:", [
          { id: "bike", title: "🏍️ Bike" },
          { id: "van", title: "🚐 Van" },
          { id: "truck", title: "🚛 Truck" },
        ]);
        session.step = 2;
      }

      else if (session.step === 2 && selection) {
        session.data.vehicle = selection;
        await sendTextMessage(from, "Enter the approximate weight (in kg):");
        session.step = 3;
      }

      else if (session.step === 3 && messages.text) {
        session.data.weight = messages.text.body;
        await sendTextMessage(from, "Please enter your pickup address:");
        session.step = 4;
      }

      else if (session.step === 4 && messages.text) {
        session.data.address = messages.text.body;
        await sendTextMessage(from, "Enter preferred pickup date (DD-MM-YYYY):");
        session.step = 5;
      }

      else if (session.step === 5 && messages.text) {
        session.data.date = messages.text.body;
        await sendInteractiveButtons(from, "Select a pickup time slot:", [
          { id: "slot1", title: "10AM–12PM" },
          { id: "slot2", title: "12PM–4PM" },
          { id: "slot3", title: "4PM–7PM" },
        ]);
        session.step = 6;
      }

      else if (session.step === 6 && selection) {
        session.data.time = selection;
        await sendInteractiveButtons(from, "Choose a payment method:", [
          { id: "upi", title: "💳 UPI" },
          { id: "cod", title: "💵 Cash on Pickup" },
        ]);
        session.step = 7;
      }

      else if (session.step === 7 && selection) {
        session.data.payment = selection;

        await sendTextMessage(
          from,
          `✅ Booking Confirmed!\n\n📌 Category: ${session.data.category}\n🚚 Vehicle: ${session.data.vehicle}\n⚖️ Weight: ${session.data.weight} kg\n🏠 Address: ${session.data.address}\n📅 Date: ${session.data.date}\n⏰ Time: ${session.data.time}\n💰 Payment: ${session.data.payment}\n\nThank you for using Yagya ♻️`
        );

        await sendTextMessage(
          ownerNumber,
          `🔔 New Order Received!\n\nCustomer: ${from}\nCategory: ${session.data.category}\nVehicle: ${session.data.vehicle}\nWeight: ${session.data.weight} kg\nAddress: ${session.data.address}\nDate: ${session.data.date}\nTime: ${session.data.time}\nPayment: ${session.data.payment}`
        );

        delete userSessions[from]; // reset session
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
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ------------------ START SERVER ------------------
app.listen(3000, () => console.log("✅ WhatsApp Bot running on port 3000"));