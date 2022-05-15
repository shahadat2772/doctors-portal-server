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

    // Warning
    // This is not the proper way to query.
    // After learning more mongoDB, use aggregate lookup, pipe line, match, group
    app.get("/available", async (req, res) => {
      // Selected day
      const date = req.query.date || "May 15, 2022";

      // Step-1 Get all services
      const services = await serviceCollection.find({}).toArray();

      // Step-2 Get all booked appointment for that day
      const bookings = await bookedAppointmentCollection
        .find({ date })
        .toArray();

      // Step-3 For each service.
      services.forEach((service) => {
        // Step-4 Find the bookings for that service
        const bookingsForThatService = bookings.filter(
          (b) => b.treatmentName === service.treatmentName
        );

        // Step-5 Get booked slots for that service
        const bookedSlots = bookingsForThatService.map((b) => b.slot);

        // Step-6 Get rest slots for that service
        const availableSlots = service.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );

        // Step-7 set available to slots to make it easier
        service.slots = availableSlots;
      });

      res.send(services);
    });

    /**
     * API Naming Convention
     * app.get('/booking')// get all bookings in this collection or get more then one or by filter
     * app.get('/booking/:id')// get a specific
     * app.post('/booking')// add new booking
     * app.patch('/booking/id')// update a specific booking
     * app.delete('/booking/id')// delete a specific booking.
     * */

    // Setting the booked appoint
    app.post("/bookAppointment", async (req, res) => {
      const bookedAppointment = req.body;
      const query = {
        treatmentName: bookedAppointment.treatmentName,
        date: bookedAppointment.date,
        patientEmail: bookedAppointment?.patientEmail,
      };
      const exists = await bookedAppointmentCollection.findOne(query);

      if (exists) {
        return res.send({ success: false, booking: exists });
      }

      const result = await bookedAppointmentCollection.insertOne(
        bookedAppointment
      );
      res.send({ success: true, result });
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
