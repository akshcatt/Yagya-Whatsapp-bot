import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const API_URL = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

const sessions = {}; // simple in-memory session store

// === Helper: Send text ===
async function sendTextMessage(to, text) {
  try {
    await axios.post(
      API_URL,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("❌ Error sending text:", err.response?.data || err.message);
  }
}

// === Helper: Send list ===
async function sendInteractiveList(to, header, body, rows) {
  try {
    await axios.post(
      API_URL,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          header: { type: "text", text: header },
          body: { text: body },
          action: {
            button: "Choose one",
            sections: [
              {
                title: "Available Categories",
                rows: rows.map((row) => ({
                  id: row.id,
                  title: row.title,
                })),
              },
            ],
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("❌ Error sending list:", err.response?.data || err.message);
  }
}

// === Helper: Send buttons ===
async function sendButtons(to, body, buttons) {
  try {
    await axios.post(
      API_URL,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: {
            buttons: buttons.map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("❌ Error sending buttons:", err.response?.data || err.message);
  }
}

// === Webhook verification ===
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// === Webhook events ===
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    console.log("📩 Incoming webhook:", JSON.stringify(req.body, null, 2));

    // ignore if no message
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const type = message.type;

    if (!sessions[from]) {
      sessions[from] = { step: 0 };
    }
    const session = sessions[from];

    // === STEP 0: Greeting ===
    if (session.step === 0) {
      if (type === "text") {
        await sendTextMessage(from, "👋 Hi! Welcome to *Yagya E-Waste Service* ♻️");
      }
      await sendInteractiveList(
        from,
        "♻️ Yagya E-Waste Service",
        "Please select the category of waste you want to dispose:",
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
      return res.sendStatus(200);
    }

    // === STEP 1: Category ===
    if (session.step === 1 && type === "interactive") {
      const category = message.interactive?.list_reply?.id;
      session.category = category;
      session.step = 2;
      await sendTextMessage(from, `✅ Category selected: *${category}*`);
      await sendTextMessage(from, "Please enter the quantity (e.g., 2kg, 5 items):");
      return res.sendStatus(200);
    }

    // === STEP 2: Quantity ===
    if (session.step === 2 && type === "text") {
      session.quantity = message.text.body;
      session.step = 3;
      await sendTextMessage(from, "📍 Please share your pickup address:");
      return res.sendStatus(200);
    }

    // === STEP 3: Address ===
    if (session.step === 3 && type === "text") {
      session.address = message.text.body;
      session.step = 4;
      await sendButtons(from, "Confirm your pickup request:", [
        { id: "confirm_yes", title: "✅ Confirm" },
        { id: "confirm_no", title: "❌ Cancel" },
      ]);
      return res.sendStatus(200);
    }

    // === STEP 4: Confirmation ===
    if (session.step === 4 && type === "interactive") {
      const choice = message.interactive?.button_reply?.id;
      if (choice === "confirm_yes") {
        await sendTextMessage(
          from,
          `🎉 Pickup Confirmed!\n\n📦 Category: ${session.category}\n📏 Quantity: ${session.quantity}\n🏠 Address: ${session.address}\n\nThank you for choosing Yagya ♻️`
        );
      } else {
        await sendTextMessage(from, "❌ Pickup request cancelled.");
      }
      delete sessions[from];
      return res.sendStatus(200);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

// === Start server ===
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});