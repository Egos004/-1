import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes
const IV_LENGTH = 16;
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || "secret_admin_token_123";

function encrypt(text: string | null): string | null {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string | null): string | null {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}

// Authentication middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Wait for request body and handle zod errors
  const asyncHandler = (fn: express.RequestHandler) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch((err) => {
          if (err instanceof z.ZodError) {
              return res.status(400).json({ error: "Validation failed", details: err.errors });
          }
          console.error(err);
          res.status(500).json({ error: "Internal server error" });
      });
  };

  // Drivers
  
  const driverSchema = z.object({
    telegram_id: z.string().optional(),
    full_name: z.string().min(1, "Имя обязательно"),
    phone_number: z.string().optional(),
    passport_series: z.string().optional(),
    passport_number: z.string().optional(),
    id_number: z.string().optional(),
    passport_issue_date: z.string().optional(),
    passport_issued_by: z.string().optional()
  });

  app.get("/api/drivers", authMiddleware, asyncHandler(async (req, res) => {
    const drivers = await prisma.driver.findMany();
    // Decrypt fields
    const formattedDrivers = drivers.map(d => ({
      ...d,
      passport_series: decrypt(d.passport_series),
      passport_number: decrypt(d.passport_number),
      id_number: decrypt(d.id_number)
    }));
    res.json(formattedDrivers);
  }));

  app.put("/api/drivers/:id/approve", authMiddleware, asyncHandler(async (req, res) => {
    const { is_approved } = z.object({ is_approved: z.boolean() }).parse(req.body);
    const driver = await prisma.driver.update({
      where: { id: parseInt(req.params.id) },
      data: { is_approved }
    });
    res.json({ success: true, driver });
  }));

  app.post("/api/drivers", authMiddleware, asyncHandler(async (req, res) => {
    const data = driverSchema.parse(req.body);
    const driver = await prisma.driver.create({
      data: {
        telegram_id: data.telegram_id || Math.floor(Math.random() * 1000000000).toString(),
        full_name: data.full_name,
        phone_number: data.phone_number,
        is_approved: true,
        passport_series: encrypt(data.passport_series || null),
        passport_number: encrypt(data.passport_number || null),
        id_number: encrypt(data.id_number || null),
        passport_issue_date: data.passport_issue_date,
        passport_issued_by: data.passport_issued_by
      }
    });
    res.json(driver);
  }));

  app.put("/api/drivers/:id", authMiddleware, asyncHandler(async (req, res) => {
    const data = driverSchema.parse(req.body);
    
    // Only encrypt if values are provided (partial updates)
    const updateData: any = {
      telegram_id: data.telegram_id,
      full_name: data.full_name,
      phone_number: data.phone_number,
      passport_issue_date: data.passport_issue_date,
      passport_issued_by: data.passport_issued_by
    };
    if (data.passport_series !== undefined) updateData.passport_series = encrypt(data.passport_series || null);
    if (data.passport_number !== undefined) updateData.passport_number = encrypt(data.passport_number || null);
    if (data.id_number !== undefined) updateData.id_number = encrypt(data.id_number || null);

    const driver = await prisma.driver.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    res.json({ success: true, driver });
  }));

  app.delete("/api/drivers/:id", authMiddleware, asyncHandler(async (req, res) => {
    await prisma.driver.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  }));

  // Cars
  
  const carSchema = z.object({
    model: z.string().min(1, "Модель обязательна"),
    plate_number: z.string().min(1, "Номер обязателен"),
    fuel_consumption: z.coerce.number().optional(),
    maintenance_limit: z.coerce.number().optional()
  });

  app.get("/api/cars", authMiddleware, asyncHandler(async (req, res) => {
    const cars = await prisma.car.findMany();
    res.json(cars);
  }));

  app.post("/api/cars", authMiddleware, asyncHandler(async (req, res) => {
    const data = carSchema.parse(req.body);
    const car = await prisma.car.create({ data });
    res.json(car);
  }));

  app.put("/api/cars/:id", authMiddleware, asyncHandler(async (req, res) => {
    const data = carSchema.parse(req.body);
    const car = await prisma.car.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json({ success: true, car });
  }));

  app.post("/api/cars/:id/maintenance", authMiddleware, asyncHandler(async (req, res) => {
    const { current_mileage } = req.body;
    const car = await prisma.car.update({
        where: { id: parseInt(req.params.id) },
        data: { last_maintenance_mileage: current_mileage || 0 }
    });
    res.json({ success: true, car });
  }));

  app.delete("/api/cars/:id", authMiddleware, asyncHandler(async (req, res) => {
    await prisma.car.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  }));

  // Events
  
  const eventSchema = z.object({
    date: z.string(),
    title: z.string(),
    category: z.string(),
    description: z.string().optional()
  });

  app.get("/api/events", authMiddleware, asyncHandler(async (req, res) => {
    const events = await prisma.appEvent.findMany();
    res.json(events);
  }));

  app.post("/api/events", authMiddleware, asyncHandler(async (req, res) => {
    const data = eventSchema.parse(req.body);
    const event = await prisma.appEvent.create({ data });
    res.json(event);
  }));

  app.put("/api/events/:id", authMiddleware, asyncHandler(async (req, res) => {
    const data = eventSchema.parse(req.body);
    const event = await prisma.appEvent.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json({ success: true, event });
  }));

  app.delete("/api/events/:id", authMiddleware, asyncHandler(async (req, res) => {
    await prisma.appEvent.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  }));

  // Shifts
  app.get("/api/shifts", authMiddleware, asyncHandler(async (req, res) => {
    const shifts = await prisma.shift.findMany({
      orderBy: { created_at: 'desc' },
      include: { driver: true, car: true }
    });
    
    // Map to include driver_name and car_name for frontend compatibility
    const mappedShifts = shifts.map(s => ({
      ...s,
      driver_name: s.driver?.full_name || 'Н/Д',
      car_name: s.car ? `${s.car.model} (${s.car.plate_number})` : 'Н/Д',
    }));
    res.json(mappedShifts);
  }));

  app.put("/api/shifts/:id/check", authMiddleware, asyncHandler(async (req, res) => {
    const { is_checked } = z.object({ is_checked: z.boolean() }).parse(req.body);
    const shift = await prisma.shift.update({
      where: { id: parseInt(req.params.id) },
      data: { is_checked }
    });
    res.json({ success: true, shift });
  }));

  // Planned Shifts
  app.get("/api/planned-shifts", authMiddleware, asyncHandler(async (req, res) => {
    const pshifts = await prisma.plannedShift.findMany();
    res.json(pshifts);
  }));

  app.post("/api/planned-shifts", authMiddleware, asyncHandler(async (req, res) => {
    const pSchema = z.object({
        car_id: z.number(),
        driver_id: z.number(),
        date: z.string(),
        time_from: z.string().optional(),
        time_to: z.string().optional()
    });
    const data = pSchema.parse(req.body);
    
    const count = await prisma.plannedShift.count({ where: data });
    if (count > 0) {
        return res.status(400).json({ error: "Shift already planned" });
    }
    
    const ps = await prisma.plannedShift.create({ data });
    res.json(ps);
  }));

  app.delete("/api/planned-shifts/:id", authMiddleware, asyncHandler(async (req, res) => {
    await prisma.plannedShift.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  }));

  return app;
}

async function boot() {
  const app = startServer();
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

boot();
