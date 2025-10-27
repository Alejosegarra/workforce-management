
import React, { useState, useEffect, useCallback } from 'react';
import { User, Empleado, Turno, Posicion, HorasSemanales, Sucursal, Ausencia, CambioPendiente, TurnoPlantilla } from '../../types';
import { supabaseService } from '../../services/supabase';
import Header from '../layout/Header';
import Scheduler from './Scheduler';
import SwapRequests from './SwapRequests';
import EmployeeManager from './EmployeeManager';
import LocationManager from './LocationManager';
import LeaveRequests from './LeaveRequests';
import HomeDashboard from './HomeDashboard';
import TemplateManager from './TemplateManager';
import Reports from './Reports';
import AdminSettings from './AdminSettings';

interface AdminDashboardProps {
  user: User;
}

type AdminView = 'home' | 'schedule' | 'employees' | 'locations' | 'leave' | 'templates' | 'reports' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [view, setView] = useState<AdminView>('home');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [cambios, setCambios] = useState<CambioPendiente[]>([]);
  const [plantillas, setPlantillas] = useState<TurnoPlantilla[]>([]);
  const [horas, setHoras] = useState<HorasSemanales[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // FIX: Fetch data for the entire week to align with the Scheduler's view.
      const weekStart = new Date('2024-07-29T00:00:00.000Z');
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const [empleadosData, turnosData, posicionesData, sucursalesData, ausenciasData, cambiosData, plantillasData] = await Promise.all([
        supabaseService.getEmpleados(),
        supabaseService.getTurnos(weekStart, weekEnd),
        supabaseService.getPosiciones(),
        supabaseService.getSucursales(),
        supabaseService.getAusencias(),
        supabaseService.getCambiosPendientes(),
        supabaseService.getTurnoPlantillas(),
      ]);
      setEmpleados(empleadosData);
      setTurnos(turnosData);
      setPosiciones(posicionesData);
      setSucursales(sucursalesData);
      setAusencias(ausenciasData);
      setCambios(cambiosData);
      setPlantillas(plantillasData);

      const horasPromises = empleadosData.map(e => supabaseService.calcularHorasSemanales(e.id, weekStart, weekEnd));
      const horasData = await Promise.all(horasPromises);
      setHoras(horasData);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderView = () => {
    switch(view) {
        case 'home':
            return <HomeDashboard 
                        turnos={turnos}
                        ausencias={ausencias}
                        cambios={cambios}
                        empleados={empleados}
                        horas={horas}
                    />;
        case 'schedule':
            return (
                 <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3">
                        <Scheduler
                            turnos={turnos}
                            posiciones={posiciones}
                            empleados={empleados}
                            sucursales={sucursales}
                            horasSemanales={horas}
                            ausencias={ausencias}
                            plantillas={plantillas}
                            onDataUpdate={fetchData}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <SwapRequests onUpdateRequest={fetchData} />
                    </div>
                </div>
            );
        case 'employees':
            return <EmployeeManager 
                initialEmpleados={empleados}
                horasSemanales={horas}
                posiciones={posiciones}
                sucursales={sucursales}
                onDataUpdate={fetchData} 
            />;
        case 'locations':
            return <LocationManager initialSucursales={sucursales} onDataUpdate={fetchData} />;
        case 'leave':
            return <LeaveRequests initialAusencias={ausencias} onDataUpdate={fetchData} />;
        case 'templates':
            return <TemplateManager initialPlantillas={plantillas} onDataUpdate={fetchData} />;
        case 'reports':
            return <Reports empleados={empleados} turnos={turnos} />;
        case 'settings':
            return <AdminSettings />;
    }
  }
  
  const NavButton: React.FC<{
    targetView: AdminView,
    children: React.ReactNode,
    }> = ({targetView, children}) => (
        <button 
            onClick={() => setView(targetView)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${view === targetView ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
        >
            {children}
        </button>
    );

  if (loading) {
    return (
      <>
        <Header user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-4 text-lg">Cargando Panel...</p>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header user={user} />
      <main className="max-w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm flex items-center space-x-2 overflow-x-auto">
            <NavButton targetView="home">Inicio</NavButton>
            <NavButton targetView="schedule">Planificador</NavButton>
            <NavButton targetView="employees">Empleados</NavButton>
            <NavButton targetView="locations">Sucursales</NavButton>
            <NavButton targetView="leave">Ausencias</NavButton>
            <NavButton targetView="templates">Plantillas</NavButton>
            <NavButton targetView="reports">Reportes</NavButton>
            <NavButton targetView="settings">Configuración</NavButton>
        </div>
        {renderView()}
      </main>
    </div>
  );
};

export default AdminDashboard;
