export const schemaSql = `CREATE DATABASE IF NOT EXISTS taxi_park;
USE taxi_park;

-- Справочник автомобилей
CREATE TABLE cars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model VARCHAR(100) NOT NULL,
    plate_number VARCHAR(20) NOT NULL UNIQUE
);

-- Зарегистрированные водители (из Telegram)
CREATE TABLE drivers (
    telegram_id BIGINT PRIMARY KEY,
    full_name VARCHAR(150),
    phone_number VARCHAR(20),
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Смены (отчеты водителей)
CREATE TABLE shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id BIGINT NOT NULL,
    car_id INT NOT NULL,
    shift_start DATETIME NOT NULL,
    shift_end DATETIME NOT NULL,
    mileage INT NOT NULL,
    avg_fuel_consumption DECIMAL(5, 2) NOT NULL,
    revenue_disp_1 DECIMAL(10, 2) DEFAULT 0,
    revenue_disp_2 DECIMAL(10, 2) DEFAULT 0,
    special_notes TEXT,
    is_checked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(telegram_id),
    FOREIGN KEY (car_id) REFERENCES cars(id)
);

-- Тестовые данные для начала работы
INSERT INTO cars (model, plate_number) VALUES 
('Kia Rio', 'А123АА178'),
('Hyundai Solaris', 'В456ВВ178');
`;

export const botPy = `import asyncio
import logging
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
import aiomysql
from dotenv import load_dotenv

load_dotenv()
API_TOKEN = os.getenv('BOT_TOKEN')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'taxi_park')

logging.basicConfig(level=logging.INFO)

bot = Bot(token=API_TOKEN)
dp = Dispatcher(storage=MemoryStorage())

# FSM Состояния
class Registration(StatesGroup):
    full_name = State()
    phone = State()

class ShiftReport(StatesGroup):
    car_id = State()
    shift_start = State()
    shift_end = State()
    mileage = State()
    fuel = State()
    rev1 = State()
    rev2 = State()
    notes = State()

# Подключение к БД
async def get_db_pool():
    return await aiomysql.create_pool(host=DB_HOST, port=3306, user=DB_USER, password=DB_PASS, db=DB_NAME, autocommit=True)

# Клавиатуры
def main_kb():
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="🚗 Начать отчет за смену")]], 
        resize_keyboard=True
    )

cancel_kb = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text="❌ Отмена")]], resize_keyboard=True
)

@dp.message(Command("start"))
async def cmd_start(message: types.Message, state: FSMContext):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM drivers WHERE telegram_id=%s", (message.from_user.id,))
            driver = await cur.fetchone()
            
            if driver:
                await message.answer(f"С возвращением, {driver['full_name']}! Ждем ваши отчеты.", reply_markup=main_kb())
            else:
                await message.answer("Добро пожаловать! Давайте зарегистрируемся.\\nВведите ваше ФИО полностью (например: Иванов Иван Иванович):")
                await state.set_state(Registration.full_name)
    pool.close()
    await pool.wait_closed()

@dp.message(Registration.full_name)
async def process_name(message: types.Message, state: FSMContext):
    await state.update_data(full_name=message.text)
    await message.answer("Отлично. Теперь отправьте ваш номер телефона (в формате +79991234567):")
    await state.set_state(Registration.phone)

@dp.message(Registration.phone)
async def process_phone(message: types.Message, state: FSMContext):
    data = await state.get_data()
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO drivers (telegram_id, full_name, phone_number, is_approved) VALUES (%s, %s, %s, TRUE)",
                (message.from_user.id, data['full_name'], message.text)
            )
    pool.close()
    await pool.wait_closed()
    
    await state.clear()
    await message.answer("Регистрация завершена! Вы можете отправлять отчеты.", reply_markup=main_kb())

# --- Блок сбора данных за смену (упрощенно) ---

@dp.message(F.text == "🚗 Начать отчет за смену")
async def start_shift_report(message: types.Message, state: FSMContext):
    await message.answer("Ввод отчета за смену. Шаг 1/8.\\nВведите ID или госзнак вашего автомобиля (например: А123АА178):", reply_markup=cancel_kb)
    await state.set_state(ShiftReport.car_id)

@dp.message(ShiftReport.car_id)
async def process_shift_car(message: types.Message, state: FSMContext):
    await state.update_data(car_id=1) # Хардкод для примера (ID 1 = Kia Rio)
    await message.answer("Шаг 2/8. Введите дату и время начала смены (например: 2026-05-21 08:00):")
    await state.set_state(ShiftReport.shift_start)

@dp.message(ShiftReport.shift_start)
async def process_shift_start(message: types.Message, state: FSMContext):
    await state.update_data(shift_start=message.text)
    await message.answer("Шаг 3/8. Введите дату и время окончания смены (например: 2026-05-21 20:00):")
    await state.set_state(ShiftReport.shift_end)

@dp.message(ShiftReport.shift_end)
async def process_shift_end(message: types.Message, state: FSMContext):
    await state.update_data(shift_end=message.text)
    await message.answer("Шаг 4/8. Введите пробег за смену в километрах (например: 250):")
    await state.set_state(ShiftReport.mileage)

@dp.message(ShiftReport.mileage)
async def process_shift_mileage(message: types.Message, state: FSMContext):
    await state.update_data(mileage=int(message.text))
    await message.answer("Шаг 5/8. Средний расход топлива (например: 8.5):")
    await state.set_state(ShiftReport.fuel)

@dp.message(ShiftReport.fuel)
async def process_shift_fuel(message: types.Message, state: FSMContext):
    await state.update_data(fuel=float(message.text.replace(',', '.')))
    await message.answer("Шаг 6/8. Касса по диспетчеру 1 (в рублях):")
    await state.set_state(ShiftReport.rev1)

@dp.message(ShiftReport.rev1)
async def process_shift_rev1(message: types.Message, state: FSMContext):
    await state.update_data(rev1=float(message.text))
    await message.answer("Шаг 7/8. Касса по диспетчеру 2 (в рублях):")
    await state.set_state(ShiftReport.rev2)
    
@dp.message(ShiftReport.rev2)
async def process_shift_rev2(message: types.Message, state: FSMContext):
    await state.update_data(rev2=float(message.text))
    await message.answer("Шаг 8/8. Особые пометки (жалобы, поломки). Если нет - напишите 'Нет':")
    await state.set_state(ShiftReport.notes)

@dp.message(ShiftReport.notes)
async def process_shift_notes(message: types.Message, state: FSMContext):
    notes = message.text
    data = await state.get_data()
    
    # Сохранение в БД
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """INSERT INTO shifts 
                (driver_id, car_id, shift_start, shift_end, mileage, avg_fuel_consumption, revenue_disp_1, revenue_disp_2, special_notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (message.from_user.id, data['car_id'], data['shift_start'], data['shift_end'], 
                 data['mileage'], data['fuel'], data['rev1'], data['rev2'], notes)
            )
    pool.close()
    await pool.wait_closed()
    
    await state.clear()
    await message.answer("✅ Отчет успешно сохранен! Администратор проверит его в панели.", reply_markup=main_kb())

@dp.message(F.text == "❌ Отмена")
async def cancel_handler(message: types.Message, state: FSMContext):
    await state.clear()
    await message.answer("Отменено.", reply_markup=main_kb())

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
`;

export const requirementsTxt = `aiogram>=3.4.0
aiomysql>=0.2.0
python-dotenv>=1.0.1
cryptography>=42.0.0
`;
