require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    // set origin of production site
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://clearify-official.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// custom middleware for jwt verify
const verifyJWT = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorize Access" });
  }

  // verify both tokens
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Unauthorize Access" });
    }
    // creating a new property in req object
    req.decodedToken = decoded;
    next();
  });
};

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.rjxsn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // database
    const database = client.db("taskDB");
    const usersCollection = database.collection("usersCollection");
    const tasksCollection = database.collection("tasksCollection");

    // jwt token generate (only for personal info based route)
    app.post("/jwt", (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ login: true });
    });

    // jwt token remove
    app.post("/jwtRemove", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ logout: true });
    });

    // verify token in private info route ( Demo )
    app.get("/privateInfo/:email", verifyJWT, (req, res) => {
      const email = req.params.email;

      // verify token email
      if (req.decodedToken.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      res.send("Sent Database Data based on paramas email");
    });

    // read Operation
    app.get("/", (req, res) => {
      res.send("Server Connected Successfully");
    });

    // tasksTodo
    app.get("/tasksTodo", async (req, res) => {
      const { email, category } = req.query;
      const result = await tasksCollection.find({ email, category }).toArray();
      res.send(result);
    });

    // tasksProgress
    app.get("/tasksProgress", async (req, res) => {
      const { email, category } = req.query;
      const result = await tasksCollection.find({ email, category }).toArray();
      res.send(result); 
    });

    // tasksCompleted
    app.get("/tasksCompleted", async (req, res) => {
      const { email, category } = req.query;
      const result = await tasksCollection.find({ email, category }).toArray();
      res.send(result); 
    });




    // create Operation (create User)
    app.post("/users", async (req, res) => {
      const user = req.body;

      // validate existing user
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User Already Exist", insertedId: null });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // task
    app.post("/tasks", async (req, res) => {
      const task = req.body;
      const result = await tasksCollection.insertOne(task);
      res.send(result);
    });

    // update Operation
    app.patch("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const title = req.body.title;
      const query = { _id: new ObjectId(id) };
      const updatedTitle = {
        $set: { title },
      };

      const result = await tasksCollection.updateOne(query, updatedTitle);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.log);

// port running on
app.listen(port, () => {
  console.log(`Server Running on... : ${port}`);
});
