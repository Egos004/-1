import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes for aes-256-cbc
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function main() {
  console.log('Seeding database...');
  
  await prisma.car.createMany({
    data: [
      { model: "Kia Rio", plate_number: "А123АА178", fuel_consumption: 7.5, maintenance_limit: 15000 },
      { model: "Hyundai Solaris", plate_number: "В456ВВ178", fuel_consumption: 8.0, maintenance_limit: 15000 },
      { model: "Skoda Octavia", plate_number: "С789СС178", fuel_consumption: 7.2, maintenance_limit: 15000 }
    ],
    skipDuplicates: true
  });

  const cars = await prisma.car.findMany();

  const driversData = [
    { telegram_id: "123456789", full_name: "Иванов Иван Иванович", phone_number: "+79001234567", is_approved: true, passport_series: "1234", passport_number: "567890", id_number: "123456789012", passport_issue_date: "2015-05-10", passport_issued_by: "ГУ МВД России по г. Москве" },
    { telegram_id: "987654321", full_name: "Петров Петр Петрович", phone_number: "+79007654321", is_approved: true, passport_series: "2345", passport_number: "678901", id_number: "234567890123", passport_issue_date: "2016-06-11", passport_issued_by: "ОВД Района Сокол г. Москвы" },
  ];

  for (const drv of driversData) {
    const existing = await prisma.driver.findUnique({ where: { telegram_id: drv.telegram_id } });
    if (!existing) {
      await prisma.driver.create({
        data: {
          telegram_id: drv.telegram_id,
          full_name: drv.full_name,
          phone_number: drv.phone_number,
          is_approved: drv.is_approved,
          passport_series: encrypt(drv.passport_series),
          passport_number: encrypt(drv.passport_number),
          id_number: encrypt(drv.id_number),
          passport_issue_date: drv.passport_issue_date,
          passport_issued_by: drv.passport_issued_by
        }
      });
    }
  }

  await prisma.appEvent.create({
    data: {
      date: new Date().toISOString().split('T')[0],
      title: 'ТО - Kia Rio',
      category: 'ТО автомобиля',
      description: 'Замена масла и фильтров'
    }
  });

  console.log('Seed completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
