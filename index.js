const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

// MiddleWere
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.USER_PASS}@cluster0.8ejzr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();

    // Services collection
    const serviceCollection = client
      .db("doctors_portal")
      .collection("services");

    // Booked appoint collection
    const bookedAppointmentCollection = client
      .db("doctors_portal")
      .collection("bookedAppointments");

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // Setting the booked appoint
    app.post("/bookAppointment", async (req, res) => {
      const bookedAppointment = req.body;
      const result = await bookedAppointmentCollection.insertOne(
        bookedAppointment
      );
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("This is doc, from backend");
});

app.listen(port, () => {
  console.log("Responding to", port);
});
