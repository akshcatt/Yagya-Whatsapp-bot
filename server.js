// import express from "express";
// import axios from "axios";
// import bodyParser from "body-parser";
// import dotenv from "dotenv";
// import redis from "redis";

// dotenv.config();
// const app = express();
// app.use(bodyParser.json());

// const token = process.env.WHATSAPP_TOKEN;
// const verifyToken = process.env.VERIFY_TOKEN;
// const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER; // best practice

// // Redis client setup for Redis Cloud
// const redisClient = redis.createClient({
//   socket: {
//     host: process.env.REDIS_HOSTNAME,
//     port: Number(process.env.REDIS_PORT),
//   },
//   password: process.env.REDIS_PASSWORD,
// });

// redisClient.on("error", (err) => console.error("Redis Client Error", err));

// async function connectRedis() {
//   if (!redisClient.isOpen) {
//     await redisClient.connect();
//   }
// }
// await connectRedis();

// // Helper functions
// async function sendTextMessage(to, text) {
//   await axios.post(
//     `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
//     {
//       messaging_product: "whatsapp",
//       to,
//       text: { body: text },
//     },
//     { headers: { Authorization: `Bearer ${token}` } }
//   );
// }

// async function sendInteractiveButtons(to, body, buttons) {
//   await axios.post(
//     `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
//     {
//       messaging_product: "whatsapp",
//       to,
//       type: "interactive",
//       interactive: {
//         type: "button",
//         body: { text: body },
//         action: { buttons: buttons.map((b) => ({ type: "reply", reply: b })) },
//       },
//     },
//     { headers: { Authorization: `Bearer ${token}` } }
//   );
// }

// async function sendInteractiveList(to, header, body, options) {
//   await axios.post(
//     `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
//     {
//       messaging_product: "whatsapp",
//       to,
//       type: "interactive",
//       interactive: {
//         type: "list",
//         header: { type: "text", text: header },
//         body: { text: body },
//         action: {
//           button: "Choose",
//           sections: [
//             {
//               title: "Available Options",
//               rows: options.map((o) => ({
//                 id: o.id,
//                 title: o.title,
//               })),
//             },
//           ],
//         },
//       },
//     },
//     { headers: { Authorization: `Bearer ${token}` } }
//   );
// }

// app.get("/", (req, res) => {
//   res.send("Hello Guys CHATBOT chalne ko ready hai!!");
// });

// async function getSession(userId) {
//   const data = await redisClient.get(`session:${userId}`);
//   return data ? JSON.parse(data) : { step: 0, data: {} };
// }

// async function setSession(userId, session) {
//   await redisClient.set(`session:${userId}`, JSON.stringify(session));
// }

// async function deleteSession(userId) {
//   await redisClient.del(`session:${userId}`);
// }

// async function sendWelcomeFlow(to) {
//   await sendTextMessage(to, "Yagya waste solutions welcome you on board 🤝. If you want to cancel the order at any time, type 'cancel'.");
//   await sendInteractiveList(
//     to,
//     "♻️ Yagya E-Waste Service",
//     "Select the type of waste:",
//     [
//       { id: "electronics", title: "Electronics" },
//       { id: "plastic", title: "Plastic" },
//       { id: "glass", title: "Glass" },
//       { id: "metal", title: "Metal" },
//       { id: "paper", title: "Paper & Cardboard" },
//       { id: "multiple", title: "Multiple Types" },
//     ]
//   );
// }

// app.post("/webhook", async (req, res) => {
//   try {
//     const entry = req.body.entry?.[0];
//     const changes = entry?.changes?.[0];
//     const messages = changes?.value?.messages?.[0];

//     if (messages) {
//       const from = messages.from;
//       const type = messages.type;

//       let session = await getSession(from);

//       const userText = messages.text?.body?.trim().toLowerCase() || "";

//       const greetings = ["hi", "hello", "hey", "start", "hii"];
//       if (greetings.includes(userText)) {
//         await deleteSession(from);
//         await sendWelcomeFlow(from);
//         session = { step: 1, data: {} };
//         await setSession(from, session);
//         return res.sendStatus(200);
//       }

//       if (userText === "cancel") {
//         await deleteSession(from);
//         await sendTextMessage(from, "Your order has been cancelled. Starting over...");
//         await sendWelcomeFlow(from);
//         session = { step: 1, data: {} };
//         await setSession(from, session);
//         return res.sendStatus(200);
//       }

//       if (session.step === 0) {
//         await sendWelcomeFlow(from);
//         session.step = 1;
//         await setSession(from, session);
//         return res.sendStatus(200);
//       }

//       let selection = null;
//       if (type === "interactive") {
//         if (messages.interactive.type === "button_reply") {
//           selection = messages.interactive.button_reply.id;
//         } else if (messages.interactive.type === "list_reply") {
//           selection = messages.interactive.list_reply.id;
//         }
//       }

//       if (session.step === 1 && selection) {
//         session.data.category = selection;
//         await sendInteractiveButtons(from, "Choose your pickup vehicle:", [
//           { id: "bike", title: "🏍️ Bike" },
//           { id: "van", title: "🚐 Van" },
//           { id: "truck", title: "🚛 Truck" },
//         ]);
//         session.step = 2;
//         await setSession(from, session);
//       } else if (session.step === 2 && selection) {
//         session.data.vehicle = selection;
//         await sendTextMessage(from, "Enter the approximate weight (in kg):");
//         session.step = 3;
//         await setSession(from, session);
//       } else if (session.step === 3 && messages.text) {
//         session.data.weight = messages.text.body;
//         await sendTextMessage(from, "Please enter your pickup address:");
//         session.step = 4;
//         await setSession(from, session);
//       } else if (session.step === 4 && messages.text) {
//         session.data.address = messages.text.body;

//         const today = new Date();
//         const tomorrow = new Date();
//         tomorrow.setDate(today.getDate() + 1);
//         const dayAfterTomorrow = new Date();
//         dayAfterTomorrow.setDate(today.getDate() + 2);

//         await sendInteractiveButtons(from, "Select a pickup date:", [
//           {
//             id: today.toISOString().slice(0, 10),
//             title: `Today (${today.toLocaleDateString("en-GB", {
//               month: "2-digit",
//               day: "2-digit",
//             })})`,
//           },
//           {
//             id: tomorrow.toISOString().slice(0, 10),
//             title: `Tomorrow (${tomorrow.toLocaleDateString("en-GB", {
//               month: "2-digit",
//               day: "2-digit",
//             })})`,
//           },
//           {
//             id: dayAfterTomorrow.toISOString().slice(0, 10),
//             title: `Day After (${dayAfterTomorrow.toLocaleDateString("en-GB", {
//               month: "2-digit",
//               day: "2-digit",
//             })})`,
//           },
//         ]);
//         session.step = 5;
//         await setSession(from, session);
//       } else if (session.step === 5 && selection) {
//         session.data.date = selection;
//         await sendInteractiveButtons(from, "Select a pickup time slot:", [
//           { id: "slot1", title: "10AM–12PM" },
//           { id: "slot2", title: "12PM–4PM" },
//           { id: "slot3", title: "4PM–7PM" },
//         ]);
//         session.step = 6;
//         await setSession(from, session);
//       } else if (session.step === 6 && selection) {
//         session.data.time = selection;
//         await sendInteractiveButtons(from, "Choose a payment method:", [
//           { id: "upi", title: "💳 UPI" },
//           { id: "cod", title: "💵 Cash on Pickup" },
//         ]);
//         session.step = 7;
//         await setSession(from, session);
//       } else if (session.step === 7 && selection) {
//         session.data.payment = selection;

//         await sendTextMessage(
//           from,
//           `✅ Booking Confirmed!\n\n📌 Category: ${session.data.category}\n🚚 Vehicle: ${session.data.vehicle}\n⚖️ Weight: ${session.data.weight} kg\n🏠 Address: ${session.data.address}\n📅 Date: ${session.data.date}\n⏰ Time: ${session.data.time}\n💰 Payment: ${session.data.payment}\n\nThank you for using Yagya ♻️`
//         );

//         await sendTextMessage(
//           ownerNumber,
//           `🔔 New Order Received!\n\nCustomer: ${from}\nCategory: ${session.data.category}\nVehicle: ${session.data.vehicle}\nWeight: ${session.data.weight} kg\nAddress: ${session.data.address}\nDate: ${session.data.date}\nTime: ${session.data.time}\nPayment: ${session.data.payment}`
//         );

//         await deleteSession(from);
//       }

//       res.sendStatus(200);
//     } else {
//       res.sendStatus(200);
//     }
//   } catch (error) {
//     console.error("Webhook error:", error.response?.data || error.message);
//     res.sendStatus(500);
//   }
// });

// app.get("/webhook", (req, res) => {
//   const mode = req.query["hub.mode"];
//   const tokenParam = req.query["hub.verify_token"];
//   const challenge = req.query["hub.challenge"];

//   if (mode && tokenParam && mode === "subscribe" && tokenParam === verifyToken) {
//     res.status(200).send(challenge);
//   } else {
//     res.sendStatus(403);
//   }
// });

// app.listen(3000, () => console.log("✅ WhatsApp Bot running on port 3000"));

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

// Redis client setup for Redis Cloud
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
  }
}
await connectRedis();

// Helper functions
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

async function requestLiveLocation(to) {
  await axios.post(
    `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "Please share your live location for accurate pickup (or type your address)." },
        action: {
          buttons: [
            {
              type: "location_request",
              reply: { id: "location_share", title: "Share Location" },
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

async function sendWelcomeFlow(to) {
  await sendTextMessage(to, "Yagya waste solutions welcome you on board 🤝. If you want to cancel the order at any time, type 'cancel'.");
  await sendInteractiveList(
    to,
    "♻️ Yagya E-Waste Service",
    "Select category of waste for pick up:",
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

      const greetings = ["hi", "hello", "hey", "start", "hii"];
      if (greetings.includes(userText)) {
        await deleteSession(from);
        await sendWelcomeFlow(from);
        session = { step: 1, data: {} };
        await setSession(from, session);
        return res.sendStatus(200);
      }

      if (userText === "cancel") {
        await deleteSession(from);
        await sendTextMessage(from, "Your order has been cancelled. Starting over...");
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

      if (session.step === 1 && selection) {
        session.data.category = selection;
        await sendInteractiveButtons(from, "Choose pick up vehicle suitable for your waste quantity:", [
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
        // Request live location instead of address text input
        await requestLiveLocation(from);
        session.step = 4;
        await setSession(from, session);
      } else if (session.step === 4) {
        if (type === "location" && messages.location) {
          // User shared live location
          const { latitude, longitude } = messages.location;
          session.data.location = { latitude, longitude };
          const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

          await sendTextMessage(from, `Received your location. Pickup will be arranged accordingly.`);

          // Send partial order info with location to owner
          await sendTextMessage(
            ownerNumber,
            `🔔 New Order Location Received!\n\nCustomer: ${from}\nLocation: ${mapsLink}\n\nCategory: ${session.data.category}\nVehicle: ${session.data.vehicle}\nWeight: ${session.data.weight} kg`
          );

          // Proceed to pickup date selection
          const today = new Date();
          const tomorrow = new Date();
          tomorrow.setDate(today.getDate() + 1);
          const dayAfterTomorrow = new Date();
          dayAfterTomorrow.setDate(today.getDate() + 2);

          await sendInteractiveButtons(from, "Select a pickup date:", [
            {
              id: today.toISOString().slice(0, 10),
              title: `Today (${today.toLocaleDateString("en-GB", {
                month: "2-digit",
                day: "2-digit",
              })})`,
            },
            {
              id: tomorrow.toISOString().slice(0, 10),
              title: `Tomorrow (${tomorrow.toLocaleDateString("en-GB", {
                month: "2-digit",
                day: "2-digit",
              })})`,
            },
            {
              id: dayAfterTomorrow.toISOString().slice(0, 10),
              title: `Day After (${dayAfterTomorrow.toLocaleDateString("en-GB", {
                month: "2-digit",
                day: "2-digit",
              })})`,
            },
          ]);
          session.step = 5;
          await setSession(from, session);
        } else if (type === "text" && messages.text) {
          // User typed address instead of location
          session.data.address = messages.text.body;
          await sendTextMessage(
            from,
            "For better accuracy, please consider sharing your live location anytime during the chat (or proceed with your typed address)."
          );

          // Let user select the date after providing address
          const today = new Date();
          const tomorrow = new Date();
          tomorrow.setDate(today.getDate() + 1);
          const dayAfterTomorrow = new Date();
          dayAfterTomorrow.setDate(today.getDate() + 2);

          await sendInteractiveButtons(from, "Select a pickup date:", [
            {
              id: today.toISOString().slice(0, 10),
              title: `Today (${today.toLocaleDateString("en-GB", {
                month: "2-digit",
                day: "2-digit",
              })})`,
            },
            {
              id: tomorrow.toISOString().slice(0, 10),
              title: `Tomorrow (${tomorrow.toLocaleDateString("en-GB", {
                month: "2-digit",
                day: "2-digit",
              })})`,
            },
            {
              id: dayAfterTomorrow.toISOString().slice(0, 10),
              title: `Day After (${dayAfterTomorrow.toLocaleDateString("en-GB", {
                month: "2-digit",
                day: "2-digit",
              })})`,
            },
          ]);
          session.step = 5;
          await setSession(from, session);
        }
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
          `✅ Booking Confirmed!\n\n📌 Category: ${session.data.category}\n🚚 Vehicle: ${session.data.vehicle}\n⚖️ Weight: ${session.data.weight} kg\n🏠 Address: ${
            session.data.address || "Location shared"
          }\n📅 Date: ${session.data.date}\n⏰ Time: ${session.data.time}\n💰 Payment: ${session.data.payment}\n\nThank you for using Yagya ♻️`
        );

        // Send order received notification to owner
        let ownerMessage = `🔔 New Order Received!\n\nCustomer: ${from}\nCategory: ${session.data.category}\nVehicle: ${session.data.vehicle}\nWeight: ${session.data.weight} kg\nDate: ${session.data.date}\nTime: ${session.data.time}\nPayment: ${session.data.payment}\n`;
        if (session.data.address) {
          ownerMessage += `Address: ${session.data.address}\n`;
        } else if (session.data.location) {
          ownerMessage += `Location: https://www.google.com/maps?q=${session.data.location.latitude},${session.data.location.longitude}\n`;
        }

        await sendTextMessage(ownerNumber, ownerMessage);

        await deleteSession(from);
      }

      res.sendStatus(200);
    } else {
      res.sendStatus(200);
    }
  } catch (err) {
    console.error("Webhook error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

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

app.listen(3000, () => console.log("✅ WhatsApp Bot running on port 3000"));
