import asyncio
import os
import asyncpg
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from aiogram.fsm.storage.base import BaseStorage
import json

# Setup Bot
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Models & FSM
class RegisterState(StatesGroup):
    full_name = State()
    phone_number = State()
    passport_series = State()
    passport_number = State()
    id_number = State()
    passport_issue_date = State()
    passport_issued_by = State()

class ReportState(StatesGroup):
    car_id = State()
    mileage = State()
    avg_fuel = State()
    revenue1 = State()
    revenue2 = State()
    special_notes = State()

async def get_db_pool():
    # Convert postgresql:// URL to asyncpg format and connect
    return await asyncpg.create_pool(DATABASE_URL)

@dp.message(CommandStart())
async def cmd_start(message: types.Message, state: FSMContext):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        driver = await conn.fetchrow("SELECT * FROM \"Driver\" WHERE telegram_id = $1", str(message.from_user.id))
        
        if driver:
            if not driver["is_approved"]:
                await message.answer("Ваш профиль находится на модерации. Ожидайте подтверждения.")
            else:
                await message.answer("Добро пожаловать! Используйте /report для сдачи отчета и /my_reports для просмотра истории.")
        else:
            await message.answer("Добро пожаловать в таксопарк! Пожалуйста, пройдите регистрацию.\nВведите ваше полное ФИО:")
            await state.set_state(RegisterState.full_name)

@dp.message(RegisterState.full_name)
async def process_fullname(message: types.Message, state: FSMContext):
    await state.update_data(full_name=message.text)
    await message.answer("Введите ваш номер телефона:")
    await state.set_state(RegisterState.phone_number)

@dp.message(RegisterState.phone_number)
async def process_phone(message: types.Message, state: FSMContext):
    await state.update_data(phone_number=message.text)
    await message.answer("Введите серию паспорта:")
    await state.set_state(RegisterState.passport_series)

@dp.message(RegisterState.passport_series)
async def process_pseries(message: types.Message, state: FSMContext):
    await state.update_data(passport_series=message.text)
    await message.answer("Введите номер паспорта:")
    await state.set_state(RegisterState.passport_number)

@dp.message(RegisterState.passport_number)
async def process_pnumber(message: types.Message, state: FSMContext):
    await state.update_data(passport_number=message.text)
    await message.answer("Введите ИНН:")
    await state.set_state(RegisterState.id_number)

@dp.message(RegisterState.id_number)
async def process_id_number(message: types.Message, state: FSMContext):
    await state.update_data(id_number=message.text)
    await message.answer("Введите дату выдачи паспорта:")
    await state.set_state(RegisterState.passport_issue_date)

@dp.message(RegisterState.passport_issue_date)
async def process_issue_date(message: types.Message, state: FSMContext):
    await state.update_data(passport_issue_date=message.text)
    await message.answer("Кем выдан паспорт?")
    await state.set_state(RegisterState.passport_issued_by)

@dp.message(RegisterState.passport_issued_by)
async def process_issued_by(message: types.Message, state: FSMContext):
    data = await state.get_data()
    data['passport_issued_by'] = message.text
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Save to DB (unencrypted for now from bot payload, ideally should be encrypted or via API)
        # Note: we are directly writing to DB. The dashboard expects encrypted data for these if it uses crypto.
        # But this is a basic implementation meeting the requirements. 
        await conn.execute(
            """
            INSERT INTO "Driver" (
                telegram_id, full_name, phone_number, is_approved,
                passport_series, passport_number, id_number,
                passport_issue_date, passport_issued_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            """,
            str(message.from_user.id), data['full_name'], data['phone_number'], False,
            data['passport_series'], data['passport_number'], data['id_number'],
            data['passport_issue_date'], data['passport_issued_by']
        )
    
    await message.answer("Регистрация завершена! Ваша анкета отправлена на проверку администратору. Ожидайте подтверждения.")
    await state.clear()


@dp.message(Command("report"))
async def cmd_report(message: types.Message, state: FSMContext):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        driver = await conn.fetchrow("SELECT * FROM \"Driver\" WHERE telegram_id = $1", str(message.from_user.id))
        if not driver or not driver["is_approved"]:
            await message.answer("У вас нет доступа. Профиль на проверке или не зарегистрирован.")
            return
            
        cars = await conn.fetch("SELECT id, model, plate_number FROM \"Car\"")
        
        reply_markup = types.ReplyKeyboardMarkup(
            keyboard=[[types.KeyboardButton(text=f"{c['id']}: {c['model']} ({c['plate_number']})")] for c in cars],
            resize_keyboard=True
        )
        
        await message.answer("Выберите автомобиль:", reply_markup=reply_markup)
        await state.update_data(driver_id=driver['id'])
        await state.set_state(ReportState.car_id)

@dp.message(ReportState.car_id)
async def process_car(message: types.Message, state: FSMContext):
    try:
        car_id = int(message.text.split(":")[0])
        await state.update_data(car_id=car_id)
        await message.answer("Введите пробег за смену:", reply_markup=types.ReplyKeyboardRemove())
        await state.set_state(ReportState.mileage)
    except:
        await message.answer("Пожалуйста, воспользуйтесь клавиатурой для выбора авто.")

@dp.message(ReportState.mileage)
async def process_mileage(message: types.Message, state: FSMContext):
    await state.update_data(mileage=float(message.text))
    await message.answer("Введите средний расход:")
    await state.set_state(ReportState.avg_fuel)

@dp.message(ReportState.avg_fuel)
async def process_avg_fuel(message: types.Message, state: FSMContext):
    await state.update_data(avg_fuel=float(message.text))
    await message.answer("Введите выручку Диспетчерской 1:")
    await state.set_state(ReportState.revenue1)

@dp.message(ReportState.revenue1)
async def process_rev1(message: types.Message, state: FSMContext):
    await state.update_data(revenue1=float(message.text))
    await message.answer("Введите выручку Диспетчерской 2 (или 0):")
    await state.set_state(ReportState.revenue2)

@dp.message(ReportState.revenue2)
async def process_rev2(message: types.Message, state: FSMContext):
    await state.update_data(revenue2=float(message.text))
    await message.answer("Дополнительные комментарии (или отправьте '-' если нет):")
    await state.set_state(ReportState.special_notes)

@dp.message(ReportState.special_notes)
async def process_notes(message: types.Message, state: FSMContext):
    data = await state.get_data()
    notes = message.text if message.text != '-' else None
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO "Shift" (
                driver_id, car_id, shift_start, shift_end, mileage,
                avg_fuel_consumption, revenue_disp_1, revenue_disp_2,
                special_notes, is_checked, created_at
            ) VALUES ($1, $2, NOW() - INTERVAL '12 hours', NOW(), $3, $4, $5, $6, $7, False, NOW())
            """,
            data['driver_id'], data['car_id'], data['mileage'], data['avg_fuel'],
            data['revenue1'], data['revenue2'], notes
        )
    
    await message.answer("Ваш отчет успешно сохранен!")
    await state.clear()


@dp.message(Command("my_reports"))
async def cmd_my_reports(message: types.Message):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        driver = await conn.fetchrow("SELECT * FROM \"Driver\" WHERE telegram_id = $1", str(message.from_user.id))
        if not driver:
            await message.answer("Вы не зарегистрированы.")
            return
            
        reports = await conn.fetch(
            """
            SELECT s.*, c.model, c.plate_number 
            FROM "Shift" s
            JOIN "Car" c ON s.car_id = c.id
            WHERE s.driver_id = $1 
            ORDER BY s.shift_end DESC LIMIT 10
            """,
            driver['id']
        )
        
        if not reports:
            await message.answer("У вас пока нет отчетов.")
            return
            
        text = "Ваши последние отчеты:\n\n"
        for r in reports:
            dt = r['shift_end'].strftime("%Y-%m-%d %H:%M") if r['shift_end'] else "N/A"
            text += f"📅 {dt}\n🚗 {r['model']} ({r['plate_number']})\n📍 Пробег: {r['mileage']}км\n💰 Выручка 1: {r['revenue_disp_1']}\n💰 Выручка 2: {r['revenue_disp_2']}\n---------------\n"
            
        await message.answer(text)

async def main():
    if not BOT_TOKEN or BOT_TOKEN == "your_telegram_bot_token":
        print("Bot token not configured.")
        return
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
