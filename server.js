import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const META_WA_API_URL = `https://graph.facebook.com/v19.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`;
const META_WA_ACCESS_TOKEN = process.env.META_WA_ACCESS_TOKEN;
const OWNER_WA_NUMBER = process.env.OWNER_WA_NUMBER;

const sessions = {}; // Simple in-memory sessions

async function sendMessage(to, body) {
  await axios.post(
    META_WA_API_URL,
    {
      messaging_product: "whatsapp",
      to: to.replace(/^whatsapp:/, ""),
      type: "text",
      text: { body },
    },
    {
      headers: {
        Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
    }
  );
}

async function sendButtons(to, body, buttons) {
  await axios.post(
    META_WA_API_URL,
    {
      messaging_product: "whatsapp",
      to: to.replace(/^whatsapp:/, ""),
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: buttons.map(b => ({
            type: "reply",
            reply: { id: b.id, title: b.title }
          }))
        }
      }
    },
    {
      headers: {
        Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

const VEHICLES = [
  { id: "vehicle_bike", title: "Bike" },
  { id: "vehicle_truck", title: "Truck" },
  { id: "vehicle_van", title: "Van" }
];

function estimatePayout(kg) {
  return Math.max(100, kg * 50);
}

app.post("/whatsapp", async (req, res) => {
  try {
    const from = req.body.From;
    const msgRaw = req.body.Body || "";
    const msg = msgRaw.trim().toLowerCase();

    if (!sessions[from]) sessions[from] = { step: "start" };
    let session = sessions[from];

    switch (session.step) {
      case "start":
        await sendMessage(from,
          "Welcome to *Yagya* ♻️!\nPlease enter the *items* you want picked up (e.g. plastic bottles, electronics):"
        );
        session.step = "awaiting_items";
        break;

      case "awaiting_items":
        session.items = msgRaw;
        await sendMessage(from, "Enter the *weight* of items (kg):");
        session.step = "awaiting_weight";
        break;

      case "awaiting_weight":
        const kg = parseFloat(msg);
        if (isNaN(kg) || kg <= 0) {
          await sendMessage(from, "Please enter a valid positive number for weight.");
          break;
        }
        session.weight = kg;
        await sendMessage(from, "Enter the *volume* of items in m³ (or type 'skip'):");
        session.step = "awaiting_volume";
        break;

      case "awaiting_volume":
        session.volume = msgRaw;
        await sendButtons(from, "Choose *vehicle* for pickup:", VEHICLES);
        session.step = "awaiting_vehicle";
        break;

      case "awaiting_vehicle":
        const vehicle = VEHICLES.find(v => v.id === msg);
        if (!vehicle) {
          await sendButtons(from, "Invalid. Select *vehicle*:", VEHICLES);
          break;
        }
        session.vehicle = vehicle.title;
        session.payout = estimatePayout(session.weight);
        await sendMessage(
          from,
          `Estimated payout: ₹${session.payout}\nEnter *pickup address*:`
        );
        session.step = "awaiting_address";
        break;

      case "awaiting_address":
        session.address = msgRaw;
        await sendMessage(from, "Enter *pickup date/time* (e.g., 2025-08-26 14:00):");
        session.step = "awaiting_datetime";
        break;

      case "awaiting_datetime":
        session.datetime = msgRaw;
        await sendMessage(
          from,
          `Please *confirm* details:\nItems: ${session.items}\nWeight: ${session.weight} kg\nVolume: ${session.volume}\nVehicle: ${session.vehicle}\nPayout: ₹${session.payout}\nAddress: ${session.address}\nPickup: ${session.datetime}\n\nReply 'confirm' to place or 'cancel' to abort.`
        );
        session.step = "confirm";
        break;

      case "confirm":
        if (msg === "confirm") {
          console.log("Order confirmed:", {
            customer: from,
            items: session.items,
            weight: session.weight,
            volume: session.volume,
            vehicle: session.vehicle,
            payout: session.payout,
            address: session.address,
            datetime: session.datetime,
            confirmed_at: new Date().toLocaleString("en-IN")
          });

          // Notify Owner
          const ownerOrderDetails =
            `New Order Received:\n\n` +
            `From: ${from}\n` +
            `Items: ${session.items}\n` +
            `Weight: ${session.weight} kg\n` +
            `Volume: ${session.volume}\n` +
            `Vehicle: ${session.vehicle}\n` +
            `Payout: ₹${session.payout}\n` +
            `Address: ${session.address}\n` +
            `Pickup Date/Time: ${session.datetime}\n` +
            `Time: ${new Date().toLocaleString("en-IN")}`;

          await sendMessage("whatsapp:" + OWNER_WA_NUMBER, ownerOrderDetails);

          await sendMessage(from,
            "✅ Pickup confirmed! Your order has been logged. Thank you for choosing *Yagya* ♻️"
          );
          delete sessions[from];
        } else if (msg === "cancel") {
          await sendMessage(from, "❌ Order cancelled. Send any message to restart.");
          delete sessions[from];
        } else {
          await sendMessage(from, "Reply 'confirm' to place your order or 'cancel' to abort.");
        }
        break;

      default:
        await sendMessage(
          from,
          "👋 To begin your order, please list the *items* to be picked up."
        );
        session.step = "awaiting_items";
        break;
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("Error in /whatsapp webhook:", err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
