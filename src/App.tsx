import React, { useState, useEffect, useMemo } from 'react';
import { Bot, CarTaxiFront, Database, FileCode2, Search, CheckCircle2, Circle, Users, X, Car as CarIcon, IdCard, Edit, Calendar, AlertTriangle, CalendarDays } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, parseISO, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { schemaSql, botPy, requirementsTxt } from './templates';
import type { Shift, Driver, Car, PlannedShift, AppEvent } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'shifts' | 'fleet' | 'code' | 'calendar' | 'events'>('shifts');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [plannedShifts, setPlannedShifts] = useState<PlannedShift[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  // Calendar states
  const [calendarCarId, setCalendarCarId] = useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isSelectDriverModalOpen, setIsSelectDriverModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  // Modal states
  const [isAddCarModalOpen, setIsAddCarModalOpen] = useState(false);
  const [newCarModel, setNewCarModel] = useState('');
  const [newCarPlate, setNewCarPlate] = useState('');
  const [newCarFuel, setNewCarFuel] = useState('');
  const [newCarMaintenance, setNewCarMaintenance] = useState('');

  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [editCarModel, setEditCarModel] = useState('');
  const [editCarPlate, setEditCarPlate] = useState('');
  const [editCarFuel, setEditCarFuel] = useState('');
  const [editCarMaintenance, setEditCarMaintenance] = useState('');

  // Events modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventsCalendarMonth, setEventsCalendarMonth] = useState(new Date());
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverTgId, setNewDriverTgId] = useState('');
  const [newDriverPassportSeries, setNewDriverPassportSeries] = useState('');
  const [newDriverPassportNumber, setNewDriverPassportNumber] = useState('');
  const [newDriverIdNumber, setNewDriverIdNumber] = useState('');
  const [newDriverPassportIssueDate, setNewDriverPassportIssueDate] = useState('');
  const [newDriverPassportIssuedBy, setNewDriverPassportIssuedBy] = useState('');
  
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editDriverTgId, setEditDriverTgId] = useState('');
  const [editDriverPassportSeries, setEditDriverPassportSeries] = useState('');
  const [editDriverPassportNumber, setEditDriverPassportNumber] = useState('');
  const [editDriverIdNumber, setEditDriverIdNumber] = useState('');
  const [editDriverPassportIssueDate, setEditDriverPassportIssueDate] = useState('');
  const [editDriverPassportIssuedBy, setEditDriverPassportIssuedBy] = useState('');

  const [selectedDriverPassport, setSelectedDriverPassport] = useState<Driver | null>(null);

  // Fetch simulated data from our node backend
  useEffect(() => {
    Promise.all([
      fetch('/api/shifts').then(res => res.json()),
      fetch('/api/drivers').then(res => res.json()),
      fetch('/api/cars').then(res => res.json()),
      fetch('/api/planned-shifts').then(res => res.json()),
      fetch('/api/events').then(res => res.json())
    ])
    .then(([shiftsData, driversData, carsData, plannedShiftsData, eventsData]) => {
      setShifts(shiftsData);
      setDrivers(driversData);
      setCars(carsData);
      setPlannedShifts(plannedShiftsData);
      setEvents(eventsData);
    })
    .catch(err => console.error("Error fetching data:", err))
    .finally(() => setLoading(false));
  }, []);

  const toggleShiftCheck = async (id: number, currentChecked: boolean) => {
    try {
      const res = await fetch(`/api/shifts/${id}/check`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_checked: !currentChecked })
      });
      if (res.ok) {
        setShifts(shifts.map(s => s.id === id ? { ...s, is_checked: !currentChecked } : s));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Скопировано в буфер обмена!');
  };

  const handleAddCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCarModel || !newCarPlate) return;
    try {
      const res = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: newCarModel, plate_number: newCarPlate, fuel_consumption: parseFloat(newCarFuel) || undefined, maintenance_limit: parseInt(newCarMaintenance) || undefined })
      });
      if (res.ok) {
        const addedCar = await res.json();
        setCars([...cars, addedCar]);
        setIsAddCarModalOpen(false);
        setNewCarModel('');
        setNewCarPlate('');
        setNewCarFuel('');
        setNewCarMaintenance('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCarOpen = (car: Car) => {
    setEditingCar(car);
    setEditCarModel(car.model);
    setEditCarPlate(car.plate_number);
    setEditCarFuel(car.fuel_consumption ? car.fuel_consumption.toString() : '');
    setEditCarMaintenance(car.maintenance_limit ? car.maintenance_limit.toString() : '');
  };

  const handleEditCarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCar || !editCarModel || !editCarPlate) return;
    try {
      const res = await fetch(`/api/cars/${editingCar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: editCarModel, plate_number: editCarPlate, fuel_consumption: parseFloat(editCarFuel) || undefined, maintenance_limit: parseInt(editCarMaintenance) || undefined })
      });
      if (res.ok) {
        const data = await res.json();
        setCars(cars.map(c => c.id === editingCar.id ? data.car : c));
        setEditingCar(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCar = async (id: number) => {
    if (confirm('Удалить эту машину?')) {
      try {
        const res = await fetch(`/api/cars/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setCars(cars.filter(c => c.id !== id));
          if (editingCar?.id === id) setEditingCar(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleOpenEventModal = (event?: AppEvent) => {
    if (event) {
      setEditingEvent(event);
      setEventDate(event.date);
      setEventTitle(event.title);
      setEventCategory(event.category);
      setEventDescription(event.description);
    } else {
      setEditingEvent(null);
      setEventDate(format(new Date(), 'yyyy-MM-dd'));
      setEventTitle('');
      setEventCategory('ТО автомобиля');
      setEventDescription('');
    }
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate || !eventCategory) return;
    
    const body = JSON.stringify({ date: eventDate, title: eventTitle, category: eventCategory, description: eventDescription });
    try {
      if (editingEvent) {
        const res = await fetch(`/api/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(events.map(ev => ev.id === editingEvent.id ? data.event : ev));
        }
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });
        if (res.ok) {
          const data = await res.json();
          setEvents([...events, data]);
        }
      }
      setIsEventModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (confirm('Удалить это событие?')) {
      try {
        const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setEvents(events.filter(e => e.id !== id));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedCalendarDate(date);
    setIsSelectDriverModalOpen(true);
  };

  const handleAssignDriverToDate = async (driverId: number) => {
    if (!calendarCarId || !selectedCalendarDate) return;
    const dateStr = format(selectedCalendarDate, 'yyyy-MM-dd');
    
    // Check if shift already exists
    const existing = plannedShifts.find(p => p.car_id === calendarCarId && p.driver_id === driverId && p.date === dateStr);
    
    try {
      const res = await fetch('/api/planned-shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ car_id: calendarCarId, driver_id: driverId, date: dateStr })
      });
      if (res.ok) {
        const data = await res.json();
        if (!existing) {
          setPlannedShifts([...plannedShifts, data]);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setIsSelectDriverModalOpen(false);
  };

  const handleRemovePlannedShift = async (id: number) => {
    if (confirm('Очистить смену?')) {
      try {
        const res = await fetch(`/api/planned-shifts/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setPlannedShifts(plannedShifts.filter(p => p.id !== id));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverPhone) return;
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          full_name: newDriverName, 
          phone_number: newDriverPhone, 
          telegram_id: newDriverTgId,
          passport_series: newDriverPassportSeries,
          passport_number: newDriverPassportNumber,
          id_number: newDriverIdNumber,
          passport_issue_date: newDriverPassportIssueDate,
          passport_issued_by: newDriverPassportIssuedBy
        })
      });
      if (res.ok) {
        const addedDriver = await res.json();
        setDrivers([...drivers, addedDriver]);
        setIsAddDriverModalOpen(false);
        setNewDriverName('');
        setNewDriverPhone('');
        setNewDriverTgId('');
        setNewDriverPassportSeries('');
        setNewDriverPassportNumber('');
        setNewDriverIdNumber('');
        setNewDriverPassportIssueDate('');
        setNewDriverPassportIssuedBy('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditDriverOpen = (driver: Driver) => {
    setEditingDriver(driver);
    setEditDriverName(driver.full_name || '');
    setEditDriverPhone(driver.phone_number || '');
    setEditDriverTgId(driver.telegram_id || '');
    setEditDriverPassportSeries(driver.passport_series || '');
    setEditDriverPassportNumber(driver.passport_number || '');
    setEditDriverIdNumber(driver.id_number || '');
    setEditDriverPassportIssueDate(driver.passport_issue_date || '');
    setEditDriverPassportIssuedBy(driver.passport_issued_by || '');
  };

  const handleEditDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver || !editDriverName || !editDriverPhone) return;
    try {
      const res = await fetch(`/api/drivers/${editingDriver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          full_name: editDriverName, 
          phone_number: editDriverPhone, 
          telegram_id: editDriverTgId,
          passport_series: editDriverPassportSeries,
          passport_number: editDriverPassportNumber,
          id_number: editDriverIdNumber,
          passport_issue_date: editDriverPassportIssueDate,
          passport_issued_by: editDriverPassportIssuedBy
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDrivers(drivers.map(d => d.id === editingDriver.id ? data.driver : d));
        setEditingDriver(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDriver = async (id: number) => {
    if (confirm('Удалить этого водителя?')) {
      try {
        const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setDrivers(drivers.filter(d => d.id !== id));
          if (editingDriver?.id === id) setEditingDriver(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const searchLower = driverSearch.toLowerCase();
    return driver.full_name.toLowerCase().includes(searchLower) ||
      String(driver.phone_number).includes(searchLower) ||
      String(driver.telegram_id).includes(searchLower);
  });

  const chartData = useMemo(() => {
    if (shifts.length === 0) return [];
    
    const dailyData: Record<string, { date: string; 'Диспетчер 1': number; 'Диспетчер 2': number }> = {};
    const sortedShifts = [...shifts].sort((a, b) => new Date(a.shift_start).getTime() - new Date(b.shift_start).getTime());
    
    const mostRecentDate = new Date(sortedShifts[sortedShifts.length - 1].shift_start);
    mostRecentDate.setHours(0,0,0,0);
    
    const startDate = new Date(mostRecentDate);
    startDate.setDate(startDate.getDate() - 6);

    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        dailyData[dateStr] = { date: dateStr, 'Диспетчер 1': 0, 'Диспетчер 2': 0 };
    }

    shifts.forEach(shift => {
        const shiftDate = new Date(shift.shift_start);
        if (shiftDate >= startDate) {
            const dateStr = shiftDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
            if (dailyData[dateStr]) {
                dailyData[dateStr]['Диспетчер 1'] += shift.revenue_disp_1;
                dailyData[dateStr]['Диспетчер 2'] += shift.revenue_disp_2;
            }
        }
    });

    return Object.values(dailyData);
  }, [shifts]);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 text-xl font-medium tracking-tight">
            <CarTaxiFront className="text-amber-400" />
            <span>ТаксиПарк</span>
          </div>
          <p className="text-slate-400 text-sm mt-1">Обертка бота & БД</p>
        </div>
        
        <nav className="flex flex-col gap-2 px-4 mt-6">
          <button 
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'shifts' ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <Database size={20} />
            <span>Смены (Отчеты)</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors ${activeTab === 'fleet' ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <CarIcon size={20} />
            <span className="text-left w-full">Парк (Машины и Водители)</span>
          </button>

          <button 
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors ${activeTab === 'calendar' ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <Calendar size={20} />
            <span className="text-left w-full">Календарь смен</span>
          </button>

          <button 
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors ${activeTab === 'events' ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <CalendarDays size={20} />
            <span className="text-left w-full">Календарь событий</span>
          </button>

          <button 
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors ${activeTab === 'code' ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <Bot size={20} />
            <span className="text-left w-full">Бот и MySQL Данные</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50/50">
        <header className="bg-white border-b border-gray-200 px-8 py-5">
          <h1 className="text-2xl font-medium">
            {activeTab === 'shifts' && 'Реестр отчетов за смены'}
            {activeTab === 'fleet' && 'Автопарк: Машины и Водители'}
            {activeTab === 'calendar' && 'Календарь рабочих смен'}
            {activeTab === 'events' && 'Календарь событий'}
            {activeTab === 'code' && 'Архитектура: Скрипты для развертывания'}
          </h1>
        </header>

        <main className="p-8 max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center p-20 text-gray-500">Загрузка данных...</div>
          ) : (
            <>
              {/* SHIFTS TAB */}
              {activeTab === 'shifts' && (
                <div className="space-y-6">
                  {/* Chart Section */}
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 overflow-hidden">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">Выручка за последние 7 дней (по сменам)</h3>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value} ₽`} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`${value} ₽`, undefined]} 
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                          <Line type="monotone" dataKey="Диспетчер 1" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="Диспетчер 2" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Table Section */}
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-max">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                      <tr>
                        <th className="px-6 py-4 font-medium">Водитель & Авто</th>
                        <th className="px-6 py-4 font-medium">Начало / Конец</th>
                        <th className="px-6 py-4 font-medium">Показатели (КМ/Расход)</th>
                        <th className="px-6 py-4 font-medium">Касса (Диспетчер 1)</th>
                        <th className="px-6 py-4 font-medium">Касса (Диспетчер 2)</th>
                        <th className="px-6 py-4 font-medium">Пометки</th>
                        <th className="px-6 py-4 font-medium text-center">Проверено</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {shifts.map((shift) => (
                        <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{shift.driver_name}</div>
                            <div className="text-gray-500 text-xs mt-0.5">{shift.car_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{new Date(shift.shift_start).toLocaleString('ru-RU')}</div>
                            <div className="text-gray-500 text-xs mt-0.5">{new Date(shift.shift_end).toLocaleString('ru-RU')}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900">{shift.mileage} км</div>
                            <div className="text-gray-500 text-xs mt-0.5">{shift.avg_fuel_consumption} л/100км</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900">{shift.revenue_disp_1} ₽</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-900">{shift.revenue_disp_2} ₽</div>
                          </td>
                          <td 
                            className="px-6 py-4 cursor-pointer hover:bg-amber-50 group transition-colors"
                            onClick={() => shift.special_notes ? setSelectedNote(shift.special_notes) : null}
                          >
                            <p className="text-gray-600 max-w-[200px] truncate group-hover:text-amber-900" title="Нажмите, чтобы прочитать полностью">
                                {shift.special_notes || '—'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => toggleShiftCheck(shift.id, shift.is_checked)}
                              className="w-full flex justify-center hover:scale-110 transition-transform"
                            >
                              {shift.is_checked 
                                ? <CheckCircle2 className="text-green-500" /> 
                                : <Circle className="text-gray-300" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {shifts.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-gray-500">Нет данных о сменах</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                  </div>
                </div>
              )}

              {/* FLEET TAB */}
              {activeTab === 'fleet' && (
                <div className="space-y-10">
                  {/* Cars Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-medium text-gray-900">Мои автомобили</h3>
                      <button 
                        onClick={() => setIsAddCarModalOpen(true)}
                        className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm"
                      >
                        + Добавить машину
                      </button>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-max">
                          <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                            <tr>
                              <th className="px-6 py-4 font-medium w-16">ID</th>
                              <th className="px-6 py-4 font-medium">Модель</th>
                              <th className="px-6 py-4 font-medium">Госномер</th>
                              <th className="px-6 py-4 font-medium">Средний расход (л/100км)</th>
                              <th className="px-6 py-4 font-medium">Пробег (Одометр)</th>
                              <th className="px-6 py-4 font-medium">Лимит до ТО (км)</th>
                              <th className="px-6 py-4 font-medium">Действия</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {cars.map((car) => {
                              const carMileage = shifts.filter(s => s.car_id === car.id).reduce((sum, s) => sum + s.mileage, 0);
                              const limitWarning = car.maintenance_limit && (car.maintenance_limit - carMileage) <= 700;
                              return (
                                <tr key={car.id} className={`transition-colors ${limitWarning ? 'bg-red-50 hover:bg-red-100/80' : 'hover:bg-gray-50'}`}>
                                  <td className={`px-6 py-4 font-mono text-xs ${limitWarning ? 'text-red-500' : 'text-gray-500'}`}>{car.id}</td>
                                  <td className={`px-6 py-4 font-medium ${limitWarning ? 'text-red-900' : 'text-gray-900'}`}>{car.model}</td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-mono font-medium border ${limitWarning ? 'bg-red-100/50 text-red-800 border-red-200' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                      {car.plate_number}
                                    </span>
                                  </td>
                                  <td className={`px-6 py-4 ${limitWarning ? 'text-red-700' : 'text-gray-700'}`}>
                                    {car.fuel_consumption ? `${car.fuel_consumption} л` : '—'}
                                  </td>
                                  <td className={`px-6 py-4 font-medium ${limitWarning ? 'text-red-700' : 'text-gray-700'}`}>
                                    {carMileage > 0 ? `${carMileage.toLocaleString('ru-RU')} км` : '—'}
                                  </td>
                                  <td className={`px-6 py-4 ${limitWarning ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                                    {car.maintenance_limit ? `${car.maintenance_limit.toLocaleString('ru-RU')} км` : '—'}
                                  </td>
                                  <td className="px-6 py-4 space-x-2">
                                    <button 
                                      onClick={() => handleEditCarOpen(car)}
                                      className={`${limitWarning ? 'text-red-500 hover:text-red-700' : 'text-gray-400 hover:text-amber-500'} transition-colors`}
                                      title="Редактировать"
                                    >
                                      <Edit size={16} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {cars.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Нет данных об автомобилях</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Drivers Section */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                         <h3 className="text-xl font-medium text-gray-900">Мои водители</h3>
                         <button 
                           onClick={() => setIsAddDriverModalOpen(true)}
                           className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm whitespace-nowrap"
                         >
                           + Добавить водителя
                         </button>
                      </div>
                      <div className="flex items-center bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm w-full sm:max-w-sm focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-400 transition-all">
                        <Search className="text-gray-400 mr-3 shrink-0" size={20} />
                        <input 
                          type="text" 
                          placeholder="Поиск по ФИО, телефону или ID..."
                          className="flex-1 outline-none text-sm bg-transparent placeholder-gray-400 min-w-0"
                          value={driverSearch}
                          onChange={(e) => setDriverSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-max">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                          <tr>
                            <th className="px-6 py-4 font-medium">ID (Telegram)</th>
                            <th className="px-6 py-4 font-medium">ФИО</th>
                            <th className="px-6 py-4 font-medium">Телефон</th>
                            <th className="px-6 py-4 font-medium">Статус</th>
                            <th className="px-6 py-4 font-medium">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredDrivers.map((driver) => (
                            <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-mono text-xs text-gray-500">{driver.telegram_id}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{driver.full_name}</span>
                                  <button 
                                    onClick={() => setSelectedDriverPassport(driver)}
                                    className="text-gray-400 hover:text-amber-500 transition-colors"
                                    title="Паспортные данные"
                                  >
                                    <IdCard size={16} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-700">{driver.phone_number}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${driver.is_approved ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'}`}>
                                  {driver.is_approved ? 'Допущен' : 'Ожидает модерации'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <button 
                                  onClick={() => handleEditDriverOpen(driver)}
                                  className="text-gray-400 hover:text-amber-500 transition-colors"
                                  title="Редактировать"
                                >
                                  <Edit size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredDrivers.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Ничего не найдено</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CALENDAR TAB */}
              {activeTab === 'calendar' && (
                <div className="space-y-6 pb-10">
                  {!calendarCarId ? (
                    <div>
                      <h3 className="text-xl font-medium text-gray-900 mb-4">Выберите автомобиль</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cars.map(car => (
                          <div 
                            key={car.id} 
                            onClick={() => setCalendarCarId(car.id)}
                            className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:ring-2 hover:ring-amber-500 hover:border-amber-500 hover:-translate-y-1 cursor-pointer transition-all duration-300"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
                                <CarIcon size={24} />
                              </div>
                              <span className="font-mono text-gray-600 text-sm bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg">{car.plate_number}</span>
                            </div>
                            <div className="font-medium text-gray-900 text-xl">{car.model}</div>
                            {car.fuel_consumption !== undefined && (
			      <div className="text-gray-500 text-sm mt-2">Расход: {car.fuel_consumption} л/100км</div>
			    )}
                          </div>
                        ))}
                      </div>
                      {cars.length === 0 && (
                        <div className="p-10 text-center text-gray-500 bg-white rounded-3xl shadow-sm border border-gray-200">
                          Машины не найдены
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <button onClick={() => setCalendarCarId(null)} className="text-gray-500 hover:text-amber-500 font-medium transition-colors text-sm mb-2 inline-flex items-center gap-1">
                            ← Назад к выбору машин
                          </button>
                          <h3 className="text-2xl font-medium text-gray-900 flex items-center gap-2">
                             Календарь смен 
                             <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-xl text-lg font-mono text-gray-700">
                               {cars.find(c => c.id === calendarCarId)?.plate_number}
                             </span>
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
                          <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">Пред.</button>
                          <div className="px-6 font-medium text-gray-900 capitalize min-w-[140px] text-center">
                            {format(calendarMonth, 'LLLL yyyy', { locale: ru })}
                          </div>
                          <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">След.</button>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
                          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                            <div key={day} className="py-4 text-center text-sm font-medium text-gray-500">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7">
                          {(() => {
                            const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
                            const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
                            const days = eachDayOfInterval({ start, end });
                            
                            return days.map((day, i) => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                              const isToday = isSameDay(day, new Date());
                              
                              const dayPlannedShifts = plannedShifts.filter(p => p.car_id === calendarCarId && p.date === dateStr);
                              const dayActualShifts = shifts.filter(s => s.car_id === calendarCarId && s.shift_start.startsWith(dateStr));
                              
                              return (
                                <div 
                                  key={dateStr} 
                                  onClick={() => handleDateClick(day)}
                                  className={`min-h-[140px] p-3 border-r border-b border-gray-100/80 cursor-pointer transition-colors relative group
                                  hover:bg-amber-50/50 
                                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/50 text-gray-400'} 
                                  ${i % 7 === 6 ? 'border-r-0' : ''}`}
                                >
                                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium mb-2 ${isToday ? 'bg-amber-500 text-white shadow-sm' : ''} ${!isToday && !isCurrentMonth ? 'text-gray-400' : ''} ${!isToday && isCurrentMonth ? 'text-gray-800' : ''}`}>
                                    {format(day, 'd')}
                                  </div>

                                  <div className="space-y-1.5 focus-within:ring-0">
                                    {dayActualShifts.map(s => {
                                      const driverName = drivers.find(d => String(d.id) === s.driver_id || d.telegram_id === s.driver_id)?.full_name || s.driver_name || 'Неизвестный водитель';
                                      return (
                                        <div key={`actual-${s.id}`} className="text-xs p-2 rounded-lg bg-green-50 text-green-800 border border-green-200/60 shadow-sm transition-all" title="Отчет сдан в эту смену">
                                          <div className="font-semibold mb-0.5 flex items-center gap-1"><CheckCircle2 size={12}/> Отработал:</div>
                                          <div className="truncate">{driverName}</div>
                                        </div>
                                      );
                                    })}
                                    
                                    {dayPlannedShifts.filter(ps => !dayActualShifts.some(as => as.driver_id === String(ps.driver_id) || drivers.find(d => d.telegram_id === as.driver_id)?.id === ps.driver_id)).map(ps => {
                                      const driverName = drivers.find(d => d.id === ps.driver_id)?.full_name || `ID ${ps.driver_id}`;
                                      return (
                                        <div key={`planned-${ps.id}`} className="text-xs p-2 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/60 shadow-sm flex flex-col relative overflow-hidden group/item" title="Водитель запланирован на смену">
                                          <div className="font-semibold mb-0.5">В плане:</div>
                                          <div className="truncate">{driverName}</div>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleRemovePlannedShift(ps.id); }} 
                                            className="absolute top-1 right-1 p-1 bg-blue-100 text-blue-600 hover:bg-red-100 hover:text-red-600 rounded opacity-0 group-hover/item:opacity-100 transition-all"
                                            title="Удалить смену"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                    
                                    {/* Empty state add button visible on hover */}
                                    <div className="opacity-0 group-hover:opacity-100 mt-2 text-center text-amber-500 font-medium text-xs">
                                      + Добавить
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      <div className="mt-8 flex flex-wrap gap-6 text-sm text-gray-700 bg-white p-5 rounded-3xl border border-gray-200 shadow-sm inline-flex">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center shadow-sm"></div> 
                          <span>Запланированная смена</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-lg bg-green-50 border border-green-200/60 flex items-center justify-center shadow-sm"></div>
                          <span>Смена отработана (сдан отчет)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EVENTS TAB */}
              {activeTab === 'events' && (
                <div className="space-y-6 pb-10">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-medium text-gray-900 flex items-center gap-2">
                       Календарь событий
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
                        <button onClick={() => setEventsCalendarMonth(subMonths(eventsCalendarMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">Пред.</button>
                        <div className="px-6 font-medium text-gray-900 capitalize min-w-[140px] text-center">
                          {format(eventsCalendarMonth, 'LLLL yyyy', { locale: ru })}
                        </div>
                        <button onClick={() => setEventsCalendarMonth(addMonths(eventsCalendarMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">След.</button>
                      </div>
                      <button 
                        onClick={() => handleOpenEventModal()}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
                      >
                        + Добавить
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
                      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                        <div key={day} className="py-4 text-center text-sm font-medium text-gray-500">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {(() => {
                        const start = startOfWeek(startOfMonth(eventsCalendarMonth), { weekStartsOn: 1 });
                        const end = endOfWeek(endOfMonth(eventsCalendarMonth), { weekStartsOn: 1 });
                        const days = eachDayOfInterval({ start, end });
                        
                        return days.map((day, i) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const isCurrentMonth = day.getMonth() === eventsCalendarMonth.getMonth();
                          const isToday = isSameDay(day, new Date());
                          
                          const dayEvents = events.filter(e => e.date === dateStr);
                          
                          return (
                            <div 
                              key={dateStr} 
                              onClick={() => {
                                setEventDate(dateStr);
                                setEventTitle('');
                                setEventCategory('ТО автомобиля');
                                setEventDescription('');
                                setEditingEvent(null);
                                setIsEventModalOpen(true);
                              }}
                              className={`min-h-[140px] p-3 border-r border-b border-gray-100/80 cursor-pointer transition-colors relative group
                              hover:bg-amber-50/50 
                              ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/50 text-gray-400'} 
                              ${i % 7 === 6 ? 'border-r-0' : ''}`}
                            >
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium mb-2 ${isToday ? 'bg-amber-500 text-white shadow-sm' : ''} ${!isToday && !isCurrentMonth ? 'text-gray-400' : ''} ${!isToday && isCurrentMonth ? 'text-gray-800' : ''}`}>
                                {format(day, 'd')}
                              </div>

                              <div className="space-y-1.5 focus-within:ring-0">
                                {dayEvents.map(event => (
                                    <div key={event.id} onClick={(e) => { e.stopPropagation(); handleOpenEventModal(event); }} className={`text-xs p-2 rounded-lg border shadow-sm relative overflow-hidden group/item
                                      ${event.category === 'ТО автомобиля' ? 'bg-blue-50 text-blue-800 border-blue-200/60' : 
                                        event.category === 'Штраф' ? 'bg-red-50 text-red-800 border-red-200/60' : 
                                        event.category === 'ДТП' ? 'bg-orange-50 text-orange-800 border-orange-200/60' :
                                        event.category === 'Выплата зарплаты' ? 'bg-green-50 text-green-800 border-green-200/60' : 
                                        'bg-gray-50 text-gray-800 border-gray-200/60'}`}
                                      title={event.description || event.title}
                                    >
                                      <div className="font-semibold mb-0.5">{event.category}</div>
                                      <div className="truncate">{event.title}</div>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }} 
                                        className="absolute top-1 right-1 p-1 hover:bg-black/10 rounded opacity-0 group-hover/item:opacity-100 transition-all"
                                        title="Удалить"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                ))}
                                
                                {/* Empty state add button visible on hover */}
                                <div className="opacity-0 group-hover:opacity-100 mt-2 text-center text-amber-500 font-medium text-xs">
                                  + Добавить
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* CODE TAB */}
              {activeTab === 'code' && (
                <div className="space-y-8 pb-10">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                    <h3 className="text-blue-900 font-medium flex items-center gap-2 text-lg">
                      <FileCode2 className="text-blue-500" />
                      Инструкция по запуску
                    </h3>
                    <p className="text-blue-800 mt-2 leading-relaxed">
                      Здесь находятся файлы для локального запуска вашего Telegram-бота и структуры базы данных.
                      Для запуска вам потребуется сервер (советуем Ubuntu Linux) или локальный ПК с установленным Python 3.10+ и сервером MySQL.
                      Скопируйте файлы ниже к себе в папку проекта.
                    </p>
                  </div>

                  {/* Schema */}
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                      <div className="font-medium text-gray-900">1. schema.sql (База данных MySQL)</div>
                      <button onClick={() => copyToClipboard(schemaSql)} className="text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">Скопировать код</button>
                    </div>
                    <div className="p-6 bg-slate-50/50">
                      <pre className="text-xs sm:text-sm font-mono text-slate-700 whitespace-pre-wrap">{schemaSql}</pre>
                    </div>
                  </div>

                  {/* Python Req */}
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                      <div className="font-medium text-gray-900">2. requirements.txt (Библиотеки Python)</div>
                      <button onClick={() => copyToClipboard(requirementsTxt)} className="text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">Скопировать код</button>
                    </div>
                    <div className="p-6 bg-slate-50/50">
                      <pre className="text-xs sm:text-sm font-mono text-slate-700 whitespace-pre-wrap">{requirementsTxt}</pre>
                      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                        Команда для установки: <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded">pip install -r requirements.txt</code>
                      </div>
                    </div>
                  </div>

                  {/* Python Bot */}
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                      <div className="font-medium text-gray-900">3. bot.py (Основной код Telegram-бота)</div>
                      <button onClick={() => copyToClipboard(botPy)} className="text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">Скопировать код</button>
                    </div>
                    <div className="p-6 bg-slate-50/50 overflow-x-auto">
                      <pre className="text-xs sm:text-sm font-mono text-slate-700">{botPy}</pre>
                    </div>
                    <div className="px-6 py-4 bg-yellow-50 border-t border-yellow-100 text-sm text-yellow-800">
                      <strong>Важно:</strong> Не забудьте создать файл <code>.env</code> в корне вашего проекта и указать данные: <code>BOT_TOKEN=ваш_токен</code>, <code>DB_PASS=ваш_пароль_mysql</code>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

          {/* Modal Overlay for Special Notes */}
          {selectedNote !== null && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedNote(null)}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Особые пометки</h3>
                  <button 
                    onClick={() => setSelectedNote(null)} 
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1.5 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedNote}
                  </div>
                  <div className="mt-8 flex justify-end">
                     <button 
                       onClick={() => setSelectedNote(null)} 
                       className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-sm"
                     >
                       Закрыть
                     </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Modal Add Car */}
          {isAddCarModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddCarModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleAddCar}>
                  <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Добавить машину</h3>
                    <button type="button" onClick={() => setIsAddCarModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1.5 rounded-lg transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Модель автомобиля</label>
                      <input required type="text" value={newCarModel} onChange={e => setNewCarModel(e.target.value)} placeholder="Например: Kia Rio" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Госномер</label>
                      <input required type="text" value={newCarPlate} onChange={e => setNewCarPlate(e.target.value)} placeholder="Например: А123АА178" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Средний расход (л/100км)</label>
                      <input type="number" step="0.1" value={newCarFuel} onChange={e => setNewCarFuel(e.target.value)} placeholder="Например: 7.5" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Лимит пробега до ТО (км)</label>
                      <input type="number" step="1" value={newCarMaintenance} onChange={e => setNewCarMaintenance(e.target.value)} placeholder="Например: 15000" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                       <button type="button" onClick={() => setIsAddCarModalOpen(false)} className="text-gray-600 px-4 py-2 rounded-xl font-medium hover:bg-gray-100 transition-colors">Отмена</button>
                       <button type="submit" className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-sm">Добавить</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Edit Car */}
          {editingCar !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingCar(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleEditCarSubmit}>
                  <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Редактировать машину</h3>
                    <button type="button" onClick={() => setEditingCar(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1.5 rounded-lg transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Модель автомобиля</label>
                      <input required type="text" value={editCarModel} onChange={e => setEditCarModel(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Госномер</label>
                      <input required type="text" value={editCarPlate} onChange={e => setEditCarPlate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Средний расход (л/100км)</label>
                      <input type="number" step="0.1" value={editCarFuel} onChange={e => setEditCarFuel(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Лимит пробега до ТО (км)</label>
                      <input type="number" step="1" value={editCarMaintenance} onChange={e => setEditCarMaintenance(e.target.value)} placeholder="Например: 15000" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div className="mt-8 flex justify-between items-center">
                       <button type="button" onClick={() => handleDeleteCar(editingCar.id)} className="text-red-500 hover:text-red-700 px-4 py-2 rounded-xl font-medium hover:bg-red-50 transition-colors">Удалить</button>
                       <div className="flex gap-3">
                         <button type="button" onClick={() => setEditingCar(null)} className="text-gray-600 px-4 py-2 rounded-xl font-medium hover:bg-gray-100 transition-colors">Отмена</button>
                         <button type="submit" className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-sm">Сохранить</button>
                       </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Add Driver */}
          {isAddDriverModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAddDriverModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleAddDriver}>
                  <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Добавить водителя</h3>
                    <button type="button" onClick={() => setIsAddDriverModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1.5 rounded-lg transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ФИО полностью <span className="text-red-500">*</span></label>
                      <input required type="text" value={newDriverName} onChange={e => setNewDriverName(e.target.value)} placeholder="Например: Иванов Иван Иванович" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Номер телефона <span className="text-red-500">*</span></label>
                      <input required type="text" value={newDriverPhone} onChange={e => setNewDriverPhone(e.target.value)} placeholder="+79001234567" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Telegram (опционально)</label>
                      <input type="text" value={newDriverTgId} onChange={e => setNewDriverTgId(e.target.value)} placeholder="Например: 123456789" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-mono" />
                    </div>
                    <div className="pt-4 mt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2"><IdCard size={18}/> Паспортные данные</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Серия</label>
                          <input type="text" value={newDriverPassportSeries} onChange={e => setNewDriverPassportSeries(e.target.value)} placeholder="1234" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Номер</label>
                          <input type="text" value={newDriverPassportNumber} onChange={e => setNewDriverPassportNumber(e.target.value)} placeholder="567890" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Идентификационный номер</label>
                        <input type="text" value={newDriverIdNumber} onChange={e => setNewDriverIdNumber(e.target.value)} placeholder="123456789012" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-mono" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Дата выдачи</label>
                          <input type="date" value={newDriverPassportIssueDate} onChange={e => setNewDriverPassportIssueDate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Кем выдан</label>
                          <input type="text" value={newDriverPassportIssuedBy} onChange={e => setNewDriverPassportIssuedBy(e.target.value)} placeholder="ГУ МВД России..." className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-3 sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                       <button type="button" onClick={() => setIsAddDriverModalOpen(false)} className="text-gray-600 px-4 py-2 rounded-xl font-medium hover:bg-gray-100 transition-colors">Отмена</button>
                       <button type="submit" className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-sm">Добавить</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Modal Edit Driver */}
          {editingDriver !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingDriver(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleEditDriverSubmit}>
                  <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Редактировать водителя</h3>
                    <button type="button" onClick={() => setEditingDriver(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1.5 rounded-lg transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ФИО полностью <span className="text-red-500">*</span></label>
                      <input required type="text" value={editDriverName} onChange={e => setEditDriverName(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Номер телефона <span className="text-red-500">*</span></label>
                      <input required type="text" value={editDriverPhone} onChange={e => setEditDriverPhone(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Telegram (опционально)</label>
                      <input type="text" value={editDriverTgId} onChange={e => setEditDriverTgId(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-mono" />
                    </div>
                    <div className="pt-4 mt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2"><IdCard size={18}/> Паспортные данные</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Серия</label>
                          <input type="text" value={editDriverPassportSeries} onChange={e => setEditDriverPassportSeries(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Номер</label>
                          <input type="text" value={editDriverPassportNumber} onChange={e => setEditDriverPassportNumber(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Идентификационный номер</label>
                        <input type="text" value={editDriverIdNumber} onChange={e => setEditDriverIdNumber(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-mono" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Дата выдачи</label>
                          <input type="date" value={editDriverPassportIssueDate} onChange={e => setEditDriverPassportIssueDate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Кем выдан</label>
                          <input type="text" value={editDriverPassportIssuedBy} onChange={e => setEditDriverPassportIssuedBy(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 flex justify-between items-center sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                       <button type="button" onClick={() => handleDeleteDriver(editingDriver.id)} className="text-red-500 hover:text-red-700 px-4 py-2 rounded-xl font-medium hover:bg-red-50 transition-colors">Удалить</button>
                       <div className="flex gap-3">
                         <button type="button" onClick={() => setEditingDriver(null)} className="text-gray-600 px-4 py-2 rounded-xl font-medium hover:bg-gray-100 transition-colors">Отмена</button>
                         <button type="submit" className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-sm">Сохранить</button>
                       </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Modal View Passport */}
          {selectedDriverPassport !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedDriverPassport(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2"><IdCard size={20} className="text-amber-500" /> Паспортные данные</h3>
                  <button onClick={() => setSelectedDriverPassport(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1.5 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-1">Водитель</p>
                    <p className="text-lg font-medium text-gray-900">{selectedDriverPassport.full_name}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Серия</p>
                        <p className="text-gray-900 font-mono">{selectedDriverPassport.passport_series || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Номер</p>
                        <p className="text-gray-900 font-mono">{selectedDriverPassport.passport_number || '—'}</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Идентификационный номер</p>
                      <p className="text-gray-900 font-mono">{selectedDriverPassport.id_number || '—'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Дата выдачи</p>
                        <p className="text-gray-900">
                           {selectedDriverPassport.passport_issue_date ? new Date(selectedDriverPassport.passport_issue_date).toLocaleDateString('ru-RU') : '—'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Кем выдан</p>
                        <p className="text-gray-900 leading-relaxed">{selectedDriverPassport.passport_issued_by || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                     <button onClick={() => setSelectedDriverPassport(null)} className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-sm">
                       Закрыть
                     </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Select Driver for Calendar */}
          {isSelectDriverModalOpen && selectedCalendarDate && calendarCarId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsSelectDriverModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Назначить смену ({format(selectedCalendarDate, 'dd.MM.yyyy')})
                  </h3>
                  <button onClick={() => setIsSelectDriverModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1.5 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                  {drivers.length > 0 ? (
                    <div className="space-y-2">
                      {drivers.map(driver => (
                        <button
                          key={driver.id}
                          onClick={() => handleAssignDriverToDate(driver.id)}
                          className="w-full text-left p-3 rounded-xl hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-gray-900">{driver.full_name}</div>
                            <div className="text-sm text-gray-500">ID: {driver.telegram_id} • Тел: {driver.phone_number}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-6">Нет водителей для назначения</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Add/Edit Event */}
          {isEventModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEventModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSaveEvent}>
                  <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">{editingEvent ? 'Редактировать событие' : 'Добавить событие'}</h3>
                    <button type="button" onClick={() => setIsEventModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 p-1.5 rounded-lg transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                      <input required type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                      <select required value={eventCategory} onChange={e => setEventCategory(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white">
                        <option value="ТО автомобиля">ТО автомобиля</option>
                        <option value="Штраф">Штраф</option>
                        <option value="ДТП">ДТП</option>
                        <option value="Выплата зарплаты">Выплата зарплаты</option>
                        <option value="Другое">Другое</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Название / Краткая суть</label>
                      <input required type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Например: ТО Kia Rio" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Описание (необязательно)</label>
                      <textarea value={eventDescription} onChange={e => setEventDescription(e.target.value)} placeholder="Детали события..." rows={3} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all resize-none"></textarea>
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                       <button type="button" onClick={() => setIsEventModalOpen(false)} className="text-gray-600 px-4 py-2 rounded-xl font-medium hover:bg-gray-100 transition-colors">Отмена</button>
                       <button type="submit" className="bg-amber-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition-colors shadow-sm">Сохранить</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

