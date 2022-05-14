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

    // app.get("/available", async (req, res) => {
    //   const date = req.query.date || "May 14, 2022";

    //   // Step 1: Get all services.
    //   const services = await serviceCollection.find({}).toArray();

    //   // Step 2: Get the bookings of that day.

    //   const query = { date };

    //   const bookingsOnSelectedDay = await bookedAppointmentCollection
    //     .find(query)
    //     .toArray();

    //   // Step 3: For each service, find bookings for that service.

    //   services.forEach((service) => {
    //     const serviceBookings = bookingsOnSelectedDay.filter(
    //       (b) => b.treatmentName === service.treatmentName
    //     );
    //     // const booked = serviceBookings.map((s) => s.slot);
    //     // service.booked = booked

    //     service.booked = serviceBookings.map((s) => s.slot);
    //   });

    //   res.send(serviceBookings);
    // });

    // app.get("/available", async (req, res) => {
    //   const date = req.query.date || "May 14, 2022";

    //   // Step 1: Get all services
    //   const services = await serviceCollection.find({}).toArray();

    //   // Step 2: Get all the bookings of that day.
    //   const bookings = await bookedAppointmentCollection
    //     .find({ date })
    //     .toArray();

    //   // Step 3: For each service, find bookings for that service
    //   services.forEach((service) => {
    //     const serviceBookings = bookings.filter(
    //       (b) => b.treatmentName === service.treatmentName
    //     );

    //     // const bookedSlots = serviceBookings.map((s) => s.slot);
    //     // services.bookedSlots = bookedSlots;

    //     const bookedSlots = serviceBookings.map((s) => s.slot);
    //     // const allSlots = service.slots;

    //     const availableSlots = service.slots.filter(
    //       (slot) => !bookedSlots.includes(slot)
    //     );

    //     service.availableSlots = availableSlots;
    //   });
    //   res.send(services);
    // });

    app.get("/available", async (req, res) => {
      const date = req.query.date || "May 14, 2022";

      // Step-1: GET all services
      const services = await serviceCollection.find({}).toArray();

      // Step-2: Get all booked services
      const bookedServices = await bookedAppointmentCollection
        .find({ date })
        .toArray();

      // Get all bookings for each service

      services.forEach((service) => {
        const bookingsForThisService = bookedServices.filter(
          (b) => b.treatmentName === service.treatmentName
        );

        const bookedSlots = bookingsForThisService.map((s) => s.slot);

        const availableSlots = service.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );

        service.availableSlots = availableSlots;
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
