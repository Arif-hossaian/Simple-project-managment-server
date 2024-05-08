const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

dotenv.config();

const uri = process.env.DB_CONNECTION;
const database = process.env.DATABASE_NAME;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

let uuid = crypto.randomUUID();

//common return statements
const notHaveAnyData = {
  data: [],
  message: 'No data exists',
  error: true,
};

const unWantedError = {
  data: [],
  message: 'Something went wrong',
  error: true,
};

//db connect
let db = null;
const client = new MongoClient(uri);
try {
  client.connect();
  db = client.db(database);
  console.log('Database connected');
  // return await client
} catch (e) {
  console.error(e);
}

//////////////////////////////////////////////////////

app.post('/process-create', async function (req, res) {
  try {
    let data = {
      pId: uuid,
      createDate: new Date(),
    };

    await db.collection('Process').insertOne(data);

    // Scheduling log creation after 5 seconds
    setTimeout(async () => {
      try {
        await db
          .collection('Logs')
          .insertOne({ pId: data.pId, log: 'Log after 5 seconds' });
        console.log('Log saved to database');
      } catch (err) {
        console.error('Error saving log:', err);
      }
    }, 5000);

    let output = {
      data: data,
      error: false,
      message: 'Process create successful',
    };
    return res.status(201).send(output);
  } catch (error) {
    console.error('Error creating process:', error);
    return res.status(500).send(unWantedError);
  }
});

app.get('/process', async function (req, res) {
  try {
    let data = await db.collection('Process').find({}).toArray();
    let output = {
      data: data,
      error: false,
      message: 'Get all process successfully',
    };
    return res.status(200).send(output);
  } catch (error) {
    return res.status(500).send(unWantedError);
  }
});

app.get('/process/dlt/:id', async function (req, res) {
  try {
    let param = req.params.id;
    await db.collection('Process').remove({ _id: ObjectId(param) });
    // await db.collection('Logs').deleteMany({ pId: param });
    return res.status(200).send({
      data: { success: true },
      error: false,
      message: 'Process deleted successfully',
    });
  } catch (err) {
    return res.status(500).send(unWantedError);
  }
});

//////////////////////////////////////////////////////

//server running on port
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`server is running on port:- ${PORT}`);
});
