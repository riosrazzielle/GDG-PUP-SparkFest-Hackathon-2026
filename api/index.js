import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import dns from 'dns';

// Force Node.js to use Google and Cloudflare DNS to bypass local router DNS resolution bugs for mongodb+srv
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI is not defined in the environment variables.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

let db;
const client = new MongoClient(MONGODB_URI);

async function connectDB() {
  try {
    if (db) return db; // reuse connection if already connected
    await client.connect();
    db = client.db('bantaybayan');
    console.log("Successfully connected to MongoDB");
    
    // Seed initial data if collections are empty
    await seedDatabase();
    return db;
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

// Seed helper function
async function seedDatabase() {
  const pinsCount = await db.collection('pins').countDocuments();
  if (pinsCount === 0) {
    const initialPins = [
      {
        type: 'flood', hazardLevel: 'life-threatening',
        lat: 14.6299, lng: 120.9719,
        title: 'Baha sa Tondo Market',
        address: 'Tondo, Manila',
        reportedBy: 'user123', timeAgo: '5 mins ago',
        upvotes: 24,
        description: 'Knee-deep floodwater near the public market. Road is completely impassable. Avoid this area.',
        status: 'acknowledged', threadCount: 7
      },
      {
        type: 'road-work', hazardLevel: 'needs-attention',
        lat: 14.5794, lng: 120.9961,
        title: 'Road construction at Quirino Ave',
        address: 'Paco, Manila',
        reportedBy: 'maryreyes', timeAgo: '23 mins ago',
        upvotes: 12,
        description: 'Ongoing road works causing single-lane traffic. Expect 20–30 minute delays.',
        status: 'in-progress', threadCount: 3
      },
      {
        type: 'fallen-pole', hazardLevel: 'urgent',
        lat: 14.5786, lng: 120.9822,
        title: 'Natumbang Poste, Ermita',
        address: 'Ermita, Manila',
        reportedBy: 'juandelacruz', timeAgo: '41 mins ago',
        upvotes: 35,
        description: "Electric pole down after last night's storm. Live wires on road. DANGER! Keep away.",
        status: 'acknowledged', threadCount: 12
      }
    ];
    await db.collection('pins').insertMany(initialPins);
    console.log("Seeded initial pins data");
  }

  const routesCount = await db.collection('routes').countDocuments();
  if (routesCount === 0) {
    const initialRoutes = [
      {
        name: 'Home → Work',
        from: 'Tondo, Manila',
        to: 'Makati CBD',
        distance: '17.6 km', duration: '45 min',
        lastEdited: 'June 7, 2026',
        nearbyReports: 3,
        routePath: [
          { lat: 14.6299, lng: 120.9719 },
          { lat: 14.5794, lng: 120.9961 }
        ]
      }
    ];
    await db.collection('routes').insertMany(initialRoutes);
    console.log("Seeded initial routes data");
  }

  const reportsCount = await db.collection('reports').countDocuments();
  if (reportsCount === 0) {
    const initialReports = [
      {
        typeName: 'Flood', typeKey: 'flood',
        moreDetails: 'Knee-deep near Tondo Market',
        date: 'June 19, 2026', time: '10:29 AM',
        location: 'Tondo, Manila',
        status: 'confirmed'
      }
    ];
    await db.collection('reports').insertMany(initialReports);
    console.log("Seeded initial reports data");
  }
}

// Middleware to ensure database connection in serverless environment
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

/* ==========================================================================
   PINS ENDPOINTS (/api/pins)
   ========================================================================== */

// Get all pins
app.get('/api/pins', async (req, res) => {
  try {
    const pins = await db.collection('pins').find({}).toArray();
    // Map _id to id for the frontend
    const formatted = pins.map(p => ({ ...p, id: p._id.toString() }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new pin (submit a report on the map)
app.post('/api/pins', async (req, res) => {
  try {
    const newPin = {
      type: req.body.type,
      hazardLevel: req.body.hazardLevel,
      lat: Number(req.body.lat),
      lng: Number(req.body.lng),
      title: req.body.title || 'Reported Hazard',
      address: req.body.address || 'Unknown Location',
      reportedBy: req.body.reportedBy || 'anonymous',
      timeAgo: 'Just now',
      upvotes: 0,
      description: req.body.description || '',
      status: 'pending',
      threadCount: 0,
      createdAt: new Date()
    };

    const result = await db.collection('pins').insertOne(newPin);
    
    // Also save as user's report history
    const userReport = {
      typeName: req.body.title || 'Reported Hazard',
      typeKey: req.body.type,
      moreDetails: req.body.description || '',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      location: req.body.address || 'Unknown Location',
      status: 'pending',
      pinId: result.insertedId
    };
    await db.collection('reports').insertOne(userReport);

    res.status(201).json({ ...newPin, id: result.insertedId.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upvote a pin
app.post('/api/pins/:id/upvote', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.collection('pins').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { upvotes: 1 } },
      { returnDocument: 'after' }
    );
    if (!result) {
      return res.status(404).json({ error: "Pin not found" });
    }
    res.json({ id: result._id.toString(), upvotes: result.upvotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   ROUTES ENDPOINTS (/api/routes)
   ========================================================================== */

// Get all saved routes
app.get('/api/routes', async (req, res) => {
  try {
    const routes = await db.collection('routes').find({}).toArray();
    const formatted = routes.map(r => ({ ...r, id: r._id.toString() }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a route
app.post('/api/routes', async (req, res) => {
  try {
    const newRoute = {
      name: req.body.name,
      from: req.body.from,
      to: req.body.to,
      distance: req.body.distance,
      duration: req.body.duration,
      lastEdited: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      nearbyReports: req.body.nearbyReports || 0,
      routePath: req.body.routePath || []
    };
    const result = await db.collection('routes').insertOne(newRoute);
    res.status(201).json({ ...newRoute, id: result.insertedId.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a saved route
app.delete('/api/routes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.collection('routes').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Route not found" });
    }
    res.json({ success: true, message: "Route deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   REPORTS ENDPOINTS (/api/reports)
   ========================================================================== */

// Get all user reports
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await db.collection('reports').find({}).toArray();
    const formatted = reports.map(r => ({ ...r, id: r._id.toString() }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   ACCOUNTS ENDPOINTS (/api/accounts)
   ========================================================================== */

// Get or create account profile (Mock/Simple Account system)
app.post('/api/accounts/profile', async (req, res) => {
  try {
    const { username, language } = req.body;
    let account = await db.collection('accounts').findOne({ username });
    if (!account) {
      account = {
        username,
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        language: language || 'en',
        createdAt: new Date()
      };
      const result = await db.collection('accounts').insertOne(account);
      account.id = result.insertedId.toString();
    } else {
      account.id = account._id.toString();
    }
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server locally if not in Vercel serverless environment
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  });
}

export default app;
