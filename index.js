const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const jwt = require("jsonwebtoken");

// MiddleWere
app.use(express.json());
app.use(cors());

// Verify a token:
function verifyJWT(req, res, next) {
  // const
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const accessToken = authHeader.split(" ")[1];

  jwt.verify(accessToken, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

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

    // USERS collection
    const userCollection = client.db("doctors_portal").collection("users");

    // USERS collection
    const doctorCollection = client.db("doctors_portal").collection("doctors");

    // MiddleWere to check the admin status:
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;

      const requesterAccount = await userCollection.findOne({
        email: requester,
      });

      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    };

    // Get booked appointments for particular user

    app.get("/bookings", verifyJWT, async (req, res) => {
      const patientEmail = req.query?.email;
      const { email } = req.decoded;

      if (patientEmail !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      } else {
        const bookings = await bookedAppointmentCollection
          .find({ patientEmail })
          .toArray();
        res.send(bookings);
      }
    });

    // Get all user
    app.get("/users", verifyJWT, async (req, res) => {
      const users = await userCollection.find({}).toArray();

      res.send(users);
    });

    // Entry or update user

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;

      const filter = { email: email };
      const options = { upsert: true };

      const updateDoc = {
        $set: user,
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);

      const accessToken = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });

      res.send({ result, accessToken });
    });

    // Providing a role for a user

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Getting admin status of and user:
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });

      const isAdmin = user.role === "admin";

      res.send({ admin: isAdmin });
    });

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection
        .find(query)
        .project({ treatmentName: 1 });
      const services = await cursor.toArray();
      res.send(services);
    });

    // Warning
    // This is not the proper way to query.
    // After learning more mongoDB, use aggregate lookup, pipe line, match, group
    app.get("/available", async (req, res) => {
      // Selected day
      const date = req?.query?.date;

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
     * app.put('/booking:id')// Update if available or entry newly.|upSert ==> update (if exists) or insert (if not exists)|
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

    // Adding doctor
    app.post("/doctor", verifyJWT, verifyAdmin, async (req, res) => {
      const doctor = req.body;
      const result = await doctorCollection.insertOne(doctor);
      res.send(result);
    });

    // GEt doctors
    app.get("/doctor", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await doctorCollection.find({}).toArray();
      res.send(result);
    });

    // DELETE a doc:
    app.delete("/doctor/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await doctorCollection.deleteOne(filter);
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
