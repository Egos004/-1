import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Mock Database for the Admin Dashboard Preview
function generateMockData() {
  const cars = [
    { id: 1, model: "Kia Rio", plate_number: "А123АА178", fuel_consumption: 7.5, maintenance_limit: 15000 },
    { id: 2, model: "Hyundai Solaris", plate_number: "В456ВВ178", fuel_consumption: 8.0, maintenance_limit: 15000 },
    { id: 3, model: "Skoda Octavia", plate_number: "С789СС178", fuel_consumption: 7.2, maintenance_limit: 15000 }
  ];

  const drivers = [
    { id: 1, telegram_id: "123456789", full_name: "Иванов Иван Иванович", phone_number: "+79001234567", is_approved: true, created_at: "2025-05-01T10:00:00Z", passport_series: "1234", passport_number: "567890", id_number: "123456789012", passport_issue_date: "2015-05-10", passport_issued_by: "ГУ МВД России по г. Москве" },
    { id: 2, telegram_id: "987654321", full_name: "Петров Петр Петрович", phone_number: "+79007654321", is_approved: true, created_at: "2025-05-05T12:30:00Z", passport_series: "2345", passport_number: "678901", id_number: "234567890123", passport_issue_date: "2016-06-11", passport_issued_by: "ОВД Района Сокол г. Москвы" },
    { id: 3, telegram_id: "111222333", full_name: "Смирнов Алексей Викторович", phone_number: "+79001112233", is_approved: true, created_at: "2025-05-10T09:15:00Z", passport_series: "3456", passport_number: "789012", id_number: "345678901234", passport_issue_date: "2018-12-20", passport_issued_by: "ТП №1 ОУФМС" },
    { id: 4, telegram_id: "444555666", full_name: "Кузнецов Дмитрий Олегович", phone_number: "+79002223344", is_approved: true, created_at: "2025-06-01T14:20:00Z", passport_series: "4567", passport_number: "890123", id_number: "456789012345", passport_issue_date: "2019-01-15", passport_issued_by: "УМВД по Московской области" },
    { id: 5, telegram_id: "777888999", full_name: "Соколов Максим Игоревич", phone_number: "+79003334455", is_approved: true, created_at: "2025-06-15T10:45:00Z", passport_series: "5678", passport_number: "901234", id_number: "567890123456", passport_issue_date: "2020-02-28", passport_issued_by: "МВД по Республике Татарстан" },
  ];

  const shifts: any[] = [];
  let shiftId = 1;
  const now = new Date();
  
  const notes = [
    "", "", "", "", "", "Всё ок", "", "", 
    "Скрипит передняя правая колодка", 
    "Нужно долить омывайку", 
    "Пассажир забыл зонт", 
    "Заменил лампочку ближнего света", 
    "Грязный салон после прошлого водителя",
    "Пробило колесо, заклеил на шиномонтаже",
    "Иногда троит двигатель на холостых"
  ];

  for (const driver of drivers) {
    let currentDate = new Date(driver.created_at);
    while (currentDate < now) {
      const dayOfWeek = currentDate.getDay();
      // Skip randomly to achieve ~4 days a week on average, giving them weekends off occasionally
      if (dayOfWeek !== 0 && Math.random() > 0.3) { 
        const start = new Date(currentDate);
        start.setUTCHours(Math.floor(Math.random() * 4) + 6); // start between 6:00 and 9:00 UTC
        const end = new Date(start);
        end.setUTCHours(start.getUTCHours() + 10); // 10 hour shift
        
        if (end > now) break;

        const car = cars[Math.floor(Math.random() * cars.length)];
        
        shifts.push({
          id: shiftId++,
          driver_id: driver.telegram_id,
          car_id: car.id,
          shift_start: start.toISOString(),
          shift_end: end.toISOString(),
          mileage: Math.floor(Math.random() * 150) + 150, // 150-300 km
          avg_fuel_consumption: parseFloat((Math.random() * (10 - 7) + 7).toFixed(1)),
          revenue_disp_1: (Math.floor(Math.random() * 40) + 30) * 100, // 3000-7000 
          revenue_disp_2: (Math.floor(Math.random() * 20) + 5) * 100, // 500-2500
          special_notes: notes[Math.floor(Math.random() * notes.length)],
          is_checked: Math.random() > 0.05, // 95% checked
          created_at: end.toISOString(),
          driver_name: driver.full_name,
          car_name: `${car.model} (${car.plate_number})`
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  shifts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { cars, drivers, shifts };
}

const mockData = generateMockData();
let drivers = mockData.drivers;
let cars = mockData.cars;
let shifts = mockData.shifts;
let planned_shifts: any[] = [];
let events: any[] = [
  { id: 1, date: new Date().toISOString().split('T')[0], title: 'ТО - Kia Rio', category: 'ТО автомобиля', description: 'Замена масла и фильтров' }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/drivers", (req, res) => {
    res.json(drivers);
  });

  app.put("/api/drivers/:id/approve", (req, res) => {
    const driver = drivers.find(d => d.id === parseInt(req.params.id));
    if (driver) {
        driver.is_approved = req.body.is_approved;
        res.json({ success: true, driver });
    } else {
        res.status(404).json({ error: "Водитель не найден" });
    }
  });

  app.get("/api/cars", (req, res) => {
    res.json(cars);
  });

  app.post("/api/cars", (req, res) => {
    const { model, plate_number, fuel_consumption } = req.body;
    const newCar = {
      id: cars.length > 0 ? Math.max(...cars.map(c => c.id)) + 1 : 1,
      model,
      plate_number,
      fuel_consumption: fuel_consumption || 0,
      maintenance_limit: req.body.maintenance_limit || undefined
    };
    cars.push(newCar);
    res.json(newCar);
  });

  app.put("/api/cars/:id", (req, res) => {
    const car = cars.find(c => c.id === parseInt(req.params.id));
    if (car) {
        car.model = req.body.model || car.model;
        car.plate_number = req.body.plate_number || car.plate_number;
        if (req.body.fuel_consumption !== undefined) {
            car.fuel_consumption = req.body.fuel_consumption;
        }
        if (req.body.maintenance_limit !== undefined) {
            car.maintenance_limit = req.body.maintenance_limit;
        }
        res.json({ success: true, car });
    } else {
        res.status(404).json({ error: "Автомобиль не найден" });
    }
  });

  app.delete("/api/cars/:id", (req, res) => {
    const index = cars.findIndex(c => c.id === parseInt(req.params.id));
    if (index !== -1) {
      cars.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Автомобиль не найден" });
    }
  });

  app.get("/api/events", (req, res) => {
    res.json(events);
  });

  app.post("/api/events", (req, res) => {
    const { date, title, category, description } = req.body;
    const newEvent = {
        id: events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1,
        date,
        title,
        category,
        description
    };
    events.push(newEvent);
    res.json(newEvent);
  });

  app.put("/api/events/:id", (req, res) => {
    const event = events.find(e => e.id === parseInt(req.params.id));
    if (event) {
        event.date = req.body.date || event.date;
        event.title = req.body.title || event.title;
        event.category = req.body.category || event.category;
        event.description = req.body.description !== undefined ? req.body.description : event.description;
        res.json({ success: true, event });
    } else {
        res.status(404).json({ error: "Событие не найдено" });
    }
  });

  app.delete("/api/events/:id", (req, res) => {
    const index = events.findIndex(e => e.id === parseInt(req.params.id));
    if (index !== -1) {
      events.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Событие не найдено" });
    }
  });

  app.post("/api/drivers", (req, res) => {
    const { telegram_id, full_name, phone_number, passport_series, passport_number, id_number, passport_issue_date, passport_issued_by } = req.body;
    const newDriver = {
      id: drivers.length > 0 ? Math.max(...drivers.map(d => d.id)) + 1 : 1,
      telegram_id: telegram_id || Math.floor(Math.random() * 1000000000).toString(),
      full_name,
      phone_number,
      passport_series,
      passport_number,
      id_number,
      passport_issue_date,
      passport_issued_by,
      is_approved: true,
      created_at: new Date().toISOString()
    };
    drivers.push(newDriver);
    res.json(newDriver);
  });

  app.put("/api/drivers/:id", (req, res) => {
    const driver = drivers.find(d => d.id === parseInt(req.params.id));
    if (driver) {
      if (req.body.telegram_id !== undefined) driver.telegram_id = req.body.telegram_id;
      if (req.body.full_name !== undefined) driver.full_name = req.body.full_name;
      if (req.body.phone_number !== undefined) driver.phone_number = req.body.phone_number;
      if (req.body.passport_series !== undefined) driver.passport_series = req.body.passport_series;
      if (req.body.passport_number !== undefined) driver.passport_number = req.body.passport_number;
      if (req.body.id_number !== undefined) driver.id_number = req.body.id_number;
      if (req.body.passport_issue_date !== undefined) driver.passport_issue_date = req.body.passport_issue_date;
      if (req.body.passport_issued_by !== undefined) driver.passport_issued_by = req.body.passport_issued_by;
      
      res.json({ success: true, driver });
    } else {
      res.status(404).json({ error: "Водитель не найден" });
    }
  });

  app.delete("/api/drivers/:id", (req, res) => {
    const index = drivers.findIndex(d => d.id === parseInt(req.params.id));
    if (index !== -1) {
      drivers.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Водитель не найден" });
    }
  });

  app.get("/api/shifts", (req, res) => {
    // Return shifts with descending order
    res.json([...shifts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  });

  app.get("/api/planned-shifts", (req, res) => {
    res.json(planned_shifts);
  });

  app.post("/api/planned-shifts", (req, res) => {
    const { car_id, driver_id, date } = req.body;
    const existing = planned_shifts.find(p => p.car_id === car_id && p.driver_id === driver_id && p.date === date);
    if (!existing) {
      const newPlanned = {
        id: planned_shifts.length > 0 ? Math.max(...planned_shifts.map(p => p.id)) + 1 : 1,
        car_id,
        driver_id,
        date
      };
      planned_shifts.push(newPlanned);
      res.json(newPlanned);
    } else {
      res.json(existing);
    }
  });

  app.delete("/api/planned-shifts/:id", (req, res) => {
    const index = planned_shifts.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
      planned_shifts.splice(index, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Планируемая смена не найдена" });
    }
  });

  app.put("/api/shifts/:id/check", (req, res) => {
    const shift = shifts.find(s => s.id === parseInt(req.params.id));
    if (shift) {
        shift.is_checked = req.body.is_checked;
        res.json({ success: true, shift });
    } else {
        res.status(404).json({ error: "Смена не найдена" });
    }
  });

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
    // Express 4 uses * for catch-all
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
