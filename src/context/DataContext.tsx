import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Shift, Driver, Car, PlannedShift, AppEvent } from '../types';
import { fetchApi } from '../api';

interface DataContextType {
  shifts: Shift[];
  drivers: Driver[];
  cars: Car[];
  plannedShifts: PlannedShift[];
  events: AppEvent[];
  loading: boolean;
  refreshData: () => Promise<void>;
  updateCar: (car: Car) => void;
  removeCar: (id: number) => void;
  addCar: (car: Car) => void;
  updateDriver: (driver: Driver) => void;
  removeDriver: (id: number) => void;
  addDriver: (driver: Driver) => void;
  updateShift: (shift: Shift) => void;
  addPlannedShift: (ps: PlannedShift) => void;
  removePlannedShift: (id: number) => void;
  addEvent: (e: AppEvent) => void;
  updateEvent: (e: AppEvent) => void;
  removeEvent: (id: number) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};

export const DataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [plannedShifts, setPlannedShifts] = useState<PlannedShift[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [shRes, drRes, crRes, pShRes, evRes] = await Promise.all([
        fetchApi('/api/shifts'),
        fetchApi('/api/drivers'),
        fetchApi('/api/cars'),
        fetchApi('/api/planned-shifts'),
        fetchApi('/api/events')
      ]);
      setShifts(shRes);
      setDrivers(drRes);
      setCars(crRes);
      setPlannedShifts(pShRes);
      setEvents(evRes);
    } catch (err) {
      console.error("Failed to load data", err);
      alert("Ошибка при загрузке данных. Проверьте соединение с БД.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <DataContext.Provider value={{
      shifts, drivers, cars, plannedShifts, events, loading, refreshData,
      updateCar: (c) => setCars(prev => prev.map(x => x.id === c.id ? c : x)),
      removeCar: (id) => setCars(prev => prev.filter(x => x.id !== id)),
      addCar: (c) => setCars(prev => [...prev, c]),
      updateDriver: (d) => setDrivers(prev => prev.map(x => x.id === d.id ? d : x)),
      removeDriver: (id) => setDrivers(prev => prev.filter(x => x.id !== id)),
      addDriver: (d) => setDrivers(prev => [...prev, d]),
      updateShift: (s) => setShifts(prev => prev.map(x => x.id === s.id ? s : x)),
      addPlannedShift: (ps) => setPlannedShifts(prev => [...prev, ps]),
      removePlannedShift: (id) => setPlannedShifts(prev => prev.filter(x => x.id !== id)),
      addEvent: (e) => setEvents(prev => [...prev, e]),
      updateEvent: (e) => setEvents(prev => prev.map(x => x.id === e.id ? e : x)),
      removeEvent: (id) => setEvents(prev => prev.filter(x => x.id !== id)),
    }}>
      {children}
    </DataContext.Provider>
  );
};
