// // import express from "express";
// // // import bodyParser from "body-parser";
// // import dotenv from "dotenv";
// // import axios from "axios";

// // dotenv.config();
// // const app = express();
// // app.use(express.json());


// // const META_WA_API_URL = `https://graph.facebook.com/v22.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`;
// // const META_WA_ACCESS_TOKEN = process.env.META_WA_ACCESS_TOKEN;
// // const OWNER_WA_NUMBER = process.env.OWNER_WA_NUMBER;

// // const sessions = {}; // Simple in-memory sessions

// // async function sendMessage(to, body) {
// //   await axios.post(
// //     META_WA_API_URL,
// //     {
// //       messaging_product: "whatsapp",
// //       to: to.replace(/^whatsapp:/, ""),
// //       type: "text",
// //       text: { body },
// //     },
// //     {
// //       headers: {
// //         Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`,
// //         "Content-Type": "application/json"
// //       },
// //     }
// //   );
// // }

// // async function sendButtons(to, body, buttons) {
// //   await axios.post(
// //     META_WA_API_URL,
// //     {
// //       messaging_product: "whatsapp",
// //       to: to.replace(/^whatsapp:/, ""),
// //       type: "interactive",
// //       interactive: {
// //         type: "button",
// //         body: { text: body },
// //         action: {
// //           buttons: buttons.map(b => ({
// //             type: "reply",
// //             reply: { id: b.id, title: b.title }
// //           }))
// //         }
// //       }
// //     },
// //     {
// //       headers: {
// //         Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`,
// //         "Content-Type": "application/json"
// //       }
// //     }
// //   );
// // }

// // const VEHICLES = [
// //   { id: "vehicle_bike", title: "Bike" },
// //   { id: "vehicle_truck", title: "Truck" },
// //   { id: "vehicle_van", title: "Van" }
// // ];

// // function estimatePayout(kg) {
// //   return Math.max(100, kg * 50);
// // }

// // app.get("/", (req, res) => {
// //   res.send("hello world");
// // })

// // app.get("/whatsapp", (req, res) => {
// //   const VERIFY_TOKEN = "my_verify_token";

// //   const mode = req.query["hub.mode"];
// //   const token = req.query["hub.verify_token"];
// //   const challenge = req.query["hub.challenge"];

// //   if (mode && token) {
// //     if (mode === "subscribe" && token === VERIFY_TOKEN) {
// //       console.log("Webhook verified");
// //       return res.status(200).send(challenge);
// //     } else {
// //       console.log("Verification token mismatch");
// //       return res.sendStatus(403);
// //     }
// //   }
// //   res.sendStatus(400);
// // });

// // app.post("/whatsapp", async (req, res) => {
// //   try {
// //     const entry = req.body.entry?.[0];
// //     const changes = entry?.changes?.[0];
// //     const message = changes?.value?.messages?.[0];
// //     if (!message) return res.sendStatus(200); // ignore non-message events

// //     const from = "whatsapp:" + message.from;

// //     // Extract message text or button reply
// //     let msgRaw = "";
// //     if (message.text?.body) {
// //       msgRaw = message.text.body;
// //     } else if (message.interactive?.button_reply) {
// //       msgRaw = message.interactive.button_reply.id; // button id
// //     }
// //     const msg = msgRaw.trim().toLowerCase();

// //     if (!sessions[from]) sessions[from] = { step: "start" };
// //     let session = sessions[from];


// //     switch (session.step) {
// //       case "start":
// //         await sendMessage(from,
// //           "Welcome to *Yagya* ♻️!\nPlease enter the *items* you want picked up (e.g. plastic bottles, electronics):"
// //         );
// //         session.step = "awaiting_items";
// //         break;

// //       case "awaiting_items":
// //         session.items = msgRaw;
// //         await sendMessage(from, "Enter the *weight* of items (kg):");
// //         session.step = "awaiting_weight";
// //         break;

// //       case "awaiting_weight":
// //         const kg = parseFloat(msg);
// //         if (isNaN(kg) || kg <= 0) {
// //           await sendMessage(from, "Please enter a valid positive number for weight.");
// //           break;
// //         }
// //         session.weight = kg;
// //         await sendMessage(from, "Enter the *volume* of items in m³ (or type 'skip'):");
// //         session.step = "awaiting_volume";
// //         break;

// //       case "awaiting_volume":
// //         session.volume = msgRaw;
// //         await sendButtons(from, "Choose *vehicle* for pickup:", VEHICLES);
// //         session.step = "awaiting_vehicle";
// //         break;

// //       case "awaiting_vehicle":
// //         const vehicle = VEHICLES.find(v => v.id === msg);
// //         if (!vehicle) {
// //           await sendButtons(from, "Invalid. Select *vehicle*:", VEHICLES);
// //           break;
// //         }
// //         session.vehicle = vehicle.title;
// //         session.payout = estimatePayout(session.weight);
// //         await sendMessage(
// //           from,
// //           `Estimated payout: ₹${session.payout}\nEnter *pickup address*:`
// //         );
// //         session.step = "awaiting_address";
// //         break;

// //       case "awaiting_address":
// //         session.address = msgRaw;
// //         await sendMessage(from, "Enter *pickup date/time* (e.g., 2025-08-26 14:00):");
// //         session.step = "awaiting_datetime";
// //         break;

// //       case "awaiting_datetime":
// //         session.datetime = msgRaw;
// //         await sendMessage(
// //           from,
// //           `Please *confirm* details:\nItems: ${session.items}\nWeight: ${session.weight} kg\nVolume: ${session.volume}\nVehicle: ${session.vehicle}\nPayout: ₹${session.payout}\nAddress: ${session.address}\nPickup: ${session.datetime}\n\nReply 'confirm' to place or 'cancel' to abort.`
// //         );
// //         session.step = "confirm";
// //         break;

// //       case "confirm":
// //         if (msg === "confirm") {
// //           console.log("Order confirmed:", {
// //             customer: from,
// //             items: session.items,
// //             weight: session.weight,
// //             volume: session.volume,
// //             vehicle: session.vehicle,
// //             payout: session.payout,
// //             address: session.address,
// //             datetime: session.datetime,
// //             confirmed_at: new Date().toLocaleString("en-IN")
// //           });

// //           // Notify Owner
// //           const ownerOrderDetails =
// //             `New Order Received:\n\n` +
// //             `From: ${from}\n` +
// //             `Items: ${session.items}\n` +
// //             `Weight: ${session.weight} kg\n` +
// //             `Volume: ${session.volume}\n` +
// //             `Vehicle: ${session.vehicle}\n` +
// //             `Payout: ₹${session.payout}\n` +
// //             `Address: ${session.address}\n` +
// //             `Pickup Date/Time: ${session.datetime}\n` +
// //             `Time: ${new Date().toLocaleString("en-IN")}`;

// //           await sendMessage("whatsapp:" + OWNER_WA_NUMBER, ownerOrderDetails);

// //           await sendMessage(from,
// //             "✅ Pickup confirmed! Your order has been logged. Thank you for choosing *Yagya* ♻️"
// //           );
// //           delete sessions[from];
// //         } else if (msg === "cancel") {
// //           await sendMessage(from, "❌ Order cancelled. Send any message to restart.");
// //           delete sessions[from];
// //         } else {
// //           await sendMessage(from, "Reply 'confirm' to place your order or 'cancel' to abort.");
// //         }
// //         break;

// //       default:
// //         await sendMessage(
// //           from,
// //           "👋 To begin your order, please list the *items* to be picked up."
// //         );
// //         session.step = "awaiting_items";
// //         break;
// //     }

// //     return res.sendStatus(200);
// //   } catch (err) {
// //     console.error("Error in /whatsapp webhook:", err);
// //     res.sendStatus(500);
// //   }
// // });

// // const PORT = process.env.PORT || 3000;
// // app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


// import express from "express";
// import dotenv from "dotenv";
// import axios from "axios";

// dotenv.config();
// const app = express();
// app.use(express.json());

// const META_WA_API_URL = `https://graph.facebook.com/v22.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`;
// const META_WA_ACCESS_TOKEN = process.env.META_WA_ACCESS_TOKEN;
// const OWNER_WA_NUMBER = process.env.OWNER_WA_NUMBER;

// const sessions = {};

// async function sendMessage(to, body) {
//   await axios.post(
//     META_WA_API_URL,
//     {
//       messaging_product: "whatsapp",
//       to: to.replace(/^whatsapp:/, ""),
//       type: "text",
//       text: { body },
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//     }
//   );
// }

// async function sendButtons(to, body, buttons) {
//   await axios.post(
//     META_WA_API_URL,
//     {
//       messaging_product: "whatsapp",
//       to: to.replace(/^whatsapp:/, ""),
//       type: "interactive",
//       interactive: {
//         type: "button",
//         body: { text: body },
//         action: {
//           buttons: buttons.map((b) => ({
//             type: "reply",
//             reply: { id: b.id, title: b.title },
//           })),
//         },
//       },
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//     }
//   );
// }

// const CATEGORY_OPTIONS = [
//   { id: "cat_1", title: "Electronics-Waste" },
//   { id: "cat_2", title: "Plastic Waste" },
//   { id: "cat_3", title: "Glass" },
//   { id: "cat_4", title: "Metal Waste" },
//   { id: "cat_5", title: "Paper and CardBoard" },
//   { id: "cat_6", title: "All or more than one of Above" },
// ];

// const E_WASTE_VOLUME_OPTIONS = [
//   { id: "ewaste_small", title: "Small (Up to 3ft × 3ft box – laptops, CPUs, mobiles)" },
//   { id: "ewaste_medium", title: "Medium (One large item – TV, Fridge, Washing Machine, LED)" },
//   { id: "ewaste_bulk", title: "Bulk (Multiple large items / Office clearance / Industrial)" },
// ];

// const VEHICLE_OPTIONS = [
//   { id: "vehicle_bike", title: "Bike" },
//   { id: "vehicle_van", title: "Pick-up Van" },
//   { id: "vehicle_truck", title: "Big Truck" },
// ];

// const WEIGHT_OPTIONS = [
//   { id: "weight_1_5", title: "1 to 5 Kg" },
//   { id: "weight_5_10", title: "5 to 10 Kg" },
//   { id: "weight_10_20", title: "10 to 20 Kg" },
//   { id: "weight_20_100", title: "20 to 100 Kg" },
//   { id: "weight_200_plus", title: "More than 200 Kg" },
// ];

// const PICKUP_DATE_OPTIONS = [
//   { id: "date_today", title: "Today" },
//   { id: "date_tomorrow", title: "Tomorrow" },
//   { id: "date_weekend_sat", title: "Coming Weekend [Saturday]" },
//   { id: "date_weekend_sun", title: "Coming Weekend [Sunday]" },
// ];

// const TIME_SLOTS = [
//   { id: "time_10_12", title: "10:00 AM to 12:00 Noon" },
//   { id: "time_12_4", title: "12:00 Noon to 04:00 PM" },
//   { id: "time_4_7", title: "04:00 PM to 07:00 PM" },
// ];

// const PAYMENT_METHODS = [
//   { id: "payment_cash", title: "Cash" },
//   { id: "payment_upi", title: "QR Code / UPI" },
//   { id: "payment_account", title: "Account" },
// ];
// app.get("/", (req, res) => {
//   res.send("Hello World");
// })
// app.get("/whatsapp", (req, res) => {
//   const VERIFY_TOKEN = "my_verify_token";

//   const mode = req.query["hub.mode"];
//   const token = req.query["hub.verify_token"];
//   const challenge = req.query["hub.challenge"];

//   if (mode && token) {
//     if (mode === "subscribe" && token === VERIFY_TOKEN) {
//       console.log("Webhook verified");
//       return res.status(200).send(challenge);
//     } else {
//       console.log("Verification token mismatch");
//       return res.sendStatus(403);
//     }
//   }
//   res.sendStatus(400);
// });

// app.post("/whatsapp", async (req, res) => {
//   try {
//     const entry = req.body.entry?.[0];
//     const changes = entry?.changes?.[0];
//     const message = changes?.value?.messages?.[0];
//     if (!message) return res.sendStatus(200);

//     const from = "whatsapp:" + message.from;
//     let msgRaw = "";

//     if (message.text?.body) {
//       msgRaw = message.text.body;
//     } else if (message.interactive?.button_reply) {
//       msgRaw = message.interactive.button_reply.id;
//     }

//     if (!sessions[from]) sessions[from] = { step: "start" };
//     const session = sessions[from];

//     switch (session.step) {
//       case "start":
//         await sendMessage(
//           from,
//           "👋 Welcome to *Yagya* ♻️ — your e-waste solution partner.\nPlease choose Category of Waste you want pick up:"
//         );
//         await sendButtons(from, "Choose Category:", CATEGORY_OPTIONS);
//         session.step = "awaiting_category";
//         break;

//       case "awaiting_category":
//         {
//           const category = CATEGORY_OPTIONS.find((c) => c.id === msgRaw);
//           if (!category) {
//             await sendButtons(from, "Invalid choice. Please choose a category:", CATEGORY_OPTIONS);
//             break;
//           }
//           session.category = category.title;

//           if (category.id === "cat_1") {
//             await sendButtons(from, "Please choose the size of your e-waste:", E_WASTE_VOLUME_OPTIONS);
//             session.step = "awaiting_ewaste_volume";
//           } else {
//             await sendButtons(from, "Please choose vehicle fit for your waste pick up:", VEHICLE_OPTIONS);
//             session.step = "awaiting_vehicle";
//           }
//         }
//         break;

//       case "awaiting_ewaste_volume":
//         {
//           const volume = E_WASTE_VOLUME_OPTIONS.find((v) => v.id === msgRaw);
//           if (!volume) {
//             await sendButtons(from, "Invalid. Please select e-waste size:", E_WASTE_VOLUME_OPTIONS);
//             break;
//           }
//           session.volume = volume.title;
//           await sendButtons(from, "Tentative weight of waste requested for pick up:", WEIGHT_OPTIONS);
//           session.step = "awaiting_weight";
//         }
//         break;

//       case "awaiting_vehicle":
//         {
//           const vehicle = VEHICLE_OPTIONS.find((v) => v.id === msgRaw);
//           if (!vehicle) {
//             await sendButtons(from, "Invalid. Please choose vehicle:", VEHICLE_OPTIONS);
//             break;
//           }
//           session.vehicle = vehicle.title;
//           await sendButtons(from, "Tentative weight of waste requested for pick up:", WEIGHT_OPTIONS);
//           session.step = "awaiting_weight";
//         }
//         break;

//       case "awaiting_weight":
//         {
//           const weight = WEIGHT_OPTIONS.find((w) => w.id === msgRaw);
//           if (!weight) {
//             await sendButtons(from, "Invalid. Please select weight:", WEIGHT_OPTIONS);
//             break;
//           }
//           session.weight = weight.title;
//           await sendMessage(from, "Please share your complete pickup address with PIN code.");
//           session.step = "awaiting_address";
//         }
//         break;

//       case "awaiting_address":
//         session.address = msgRaw;
//         await sendButtons(from, "When would you like us to pick up your e-waste?", PICKUP_DATE_OPTIONS);
//         session.step = "awaiting_pickup_date";
//         break;

//       case "awaiting_pickup_date":
//         {
//           const date = PICKUP_DATE_OPTIONS.find((d) => d.id === msgRaw);
//           if (!date) {
//             await sendButtons(from, "Invalid. Please select pickup date:", PICKUP_DATE_OPTIONS);
//             break;
//           }
//           session.pickupDate = date.title;
//           await sendButtons(from, "Time Slot convenient for pick up:", TIME_SLOTS);
//           session.step = "awaiting_pickup_time";
//         }
//         break;

//       case "awaiting_pickup_time":
//         {
//           const time = TIME_SLOTS.find((t) => t.id === msgRaw);
//           if (!time) {
//             await sendButtons(from, "Invalid. Please select time slot:", TIME_SLOTS);
//             break;
//           }
//           session.pickupTime = time.title;
//           await sendButtons(from, "How would you like to collect the value for your waste?", PAYMENT_METHODS);
//           session.step = "awaiting_payment_method";
//         }
//         break;

//       case "awaiting_payment_method":
//         {
//           const payment = PAYMENT_METHODS.find((p) => p.id === msgRaw);
//           if (!payment) {
//             await sendButtons(from, "Invalid. Please select payment method:", PAYMENT_METHODS);
//             break;
//           }
//           session.paymentMethod = payment.title;
//           if (msgRaw === "payment_upi") {
//             await sendMessage(from, "Please enter your UPI ID:");
//             session.step = "awaiting_upi_id";
//           } else if (msgRaw === "payment_account") {
//             await sendMessage(from, "Please enter your Account details (Account No, IFSC, Name, Mobile No):");
//             session.step = "awaiting_account_details";
//           } else {
//             session.paymentDetails = "Cash";
//             session.step = "confirm";
//             await sendBookingSummary(from, session);
//           }
//         }
//         break;

//       case "awaiting_upi_id":
//         session.paymentDetails = msgRaw;
//         session.step = "confirm";
//         await sendBookingSummary(from, session);
//         break;

//       case "awaiting_account_details":
//         session.paymentDetails = msgRaw;
//         session.step = "confirm";
//         await sendBookingSummary(from, session);
//         break;

//       case "confirm":
//         if (msgRaw === "confirm") {
//           const summaryMessage = `Here’s your booking summary:
// 📦 Items: ${session.category}${session.volume ? ` (${session.volume})` : ""}
// ⚖️ Weight Category: ${session.weight}
// 🚚 Vehicle: ${session.vehicle || "N/A"}
// 📍 Address: ${session.address}
// 📅 Pickup: ${session.pickupDate}, ${session.pickupTime}
// 💰 Payment: ${session.paymentMethod}
// 💵 Payment Details: ${session.paymentDetails || "N/A"}

// ✅ Pickup confirmed! Your order has been logged. Thank you for choosing Yagya ♻️
// `;
//           await sendMessage(from, summaryMessage);
//           await sendMessage("whatsapp:" + OWNER_WA_NUMBER, "New booking:\n" + summaryMessage);
//           delete sessions[from];
//         } else if (msgRaw === "cancel") {
//           await sendMessage(from, "❌ Order cancelled. Send any message to restart.");
//           delete sessions[from];
//         } else {
//           await sendMessage(from, "Reply 'confirm' to place your order or 'cancel' to abort.");
//         }
//         break;

//       default:
//         await sendMessage(from, "👋 Welcome! Please select category:");
//         await sendButtons(from, "Choose Category:", CATEGORY_OPTIONS);
//         session.step = "awaiting_category";
//     }

//     return res.sendStatus(200);
//   } catch (error) {
//     console.error("Error in /whatsapp webhook:", error);
//     res.sendStatus(500);
//   }
// });

// async function sendBookingSummary(to, session) {
//   const summary = `Here’s your booking summary:
// 📦 Items: ${session.category}${session.volume ? ` (${session.volume})` : ""}
// ⚖️ Weight Category: ${session.weight}
// 🚚 Vehicle: ${session.vehicle || "N/A"}
// 📍 Address: ${session.address}
// 📅 Pickup: ${session.pickupDate}, ${session.pickupTime}
// 💰 Payment Method: ${session.paymentMethod}
// 💵 Payment Details: ${session.paymentDetails || "N/A"}

// Reply *confirm* to place your order or *cancel* to abort.
// `;
//   await sendMessage(to, summary);
// }

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));


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
