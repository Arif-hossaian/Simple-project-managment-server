const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

dotenv.config();

const connectionString = process.env.DB_CONNECTION;
const dbName = process.env.DATABASE_NAME;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

//let uuid = crypto.randomUUID();

//common return statements
const notHaveAnyData = {
  data: [],
  message: 'No data exists',
  error: false,
};

const notFound = {
  data: null,
  message: 'Data not found',
  error: true,
};

const unWantedError = {
  data: [],
  message: 'Something went wrong',
  error: true,
};

//db connect
let db = null;
const client = new MongoClient(connectionString);
try {
  client.connect();
  db = client.db(dbName);
  console.log('Database connected');
  // return await client
} catch (e) {
  console.error(e);
}

//////////////////////////////////////////////////////

const intervalMap = new Map();

async function logData(data) {
  if (!data) return res.status(500).send(unWantedError);
  try {
    await db
      .collection('Logs')
      .insertOne({ pId: data.pId, creationTime: new Date() });
    console.log('Log saved to database:', data);
  } catch (err) {
    console.error('Error saving log:', err);
  }
}

app.post('/process-create', async function (req, res) {
  try {
     let uuid = crypto.randomUUID();
    let data = {
      pId: uuid,
      creationTime: new Date(),
    };

    await db.collection('Process').insertOne(data);

    // Scheduling log creation after 5 seconds
    const intervalId = setInterval(() => {
      logData(data);
    }, 5000);

    intervalMap.set(data.pId, intervalId);

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

app.get('/get-all', async function (req, res) {
  try {
    let data = await db.collection('Process').find({}).toArray();
    let output = {
      data: data,
      error: false,
      message: 'Get all process successfully',
    };
    if (data.length === 0) {
      return res.status(404).send(notHaveAnyData);
    } else {
      return res.status(200).send(output);
    }
  } catch (error) {
    return res.status(500).send(unWantedError);
  }
});

app.get('/get-single/:id', async function (req, res) {
  try {
    const pId = req.params.id;

    if (!pId) return res.status(500).send(unWantedError);

    const logs = await db.collection('Logs').find({ pId }).toArray();

    return res.status(200).json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/process/dlt/:id', async function (req, res) {
  try {
    let pId = req.params.id;
    if (!pId) return res.status(404).send(unWantedError);

    //await db.collection('Logs').deleteMany({ pId: pId });

    const processData = await db.collection('Process').findOne({ pId });
    //console.log(processData, 'insdie dlt')
    if (!processData) return res.status(404).send(notFound);
    await db.collection('Process').deleteOne({ pId });

    // Stop logging
    const intervalId = intervalMap.get(pId);
    if (intervalId) {
      clearInterval(intervalId);
      intervalMap.delete(pId);
      console.log('Logging stopped for process:', pId);
    }

    return res.status(200).send({
      data: { success: true },
      error: false,
      message: 'Process and associated logs deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting process and logs:', err);
    return res.status(500).send(unWantedError);
  }
});
//////////////////////////////////////////////////////

//server running on port
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`server is running on port:- ${PORT}`);
});
