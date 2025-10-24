import React, { useMemo } from 'react';
import { Turno, Ausencia, CambioPendiente, Empleado, HorasSemanales } from '../../types';
import { Users, Calendar, AlertTriangle, Clock } from 'lucide-react'; // Using a placeholder for icons

interface MetricCardProps {
    title: string;
    value: number | string;
    icon?: React.ReactNode;
    color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => (
    <div className={`p-6 rounded-lg shadow-lg flex items-center ${color}`}>
        <div className="mr-4">{icon}</div>
        <div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-sm text-white opacity-90">{title}</p>
        </div>
    </div>
);

interface HomeDashboardProps {
    turnos: Turno[];
    ausencias: Ausencia[];
    cambios: CambioPendiente[];
    empleados: Empleado[];
    horas: HorasSemanales[];
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ turnos, ausencias, cambios, empleados, horas }) => {
    
    const today = new Date('2024-07-29T00:00:00.000Z').toISOString().split('T')[0];

    const openShiftsToday = useMemo(() => {
        return turnos.filter(t => t.fecha === today && !t.fk_empleado).length;
    }, [turnos, today]);

    const pendingLeaveRequests = useMemo(() => {
        return ausencias.filter(a => a.estado === 'Pendiente').length;
    }, [ausencias]);

    const pendingSwapRequests = useMemo(() => {
        return cambios.filter(c => c.estado === 'Pendiente').length;
    }, [cambios]);

    const overloadedEmployees = useMemo(() => {
        return empleados.filter(emp => {
            const planned = horas.find(h => h.fk_empleado === emp.id)?.total_horas ?? 0;
            return planned > emp.horas_contrato_semanales;
        });
    }, [empleados, horas]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Panel de Control</h1>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Turnos Abiertos Hoy" value={openShiftsToday} color="bg-blue-500" icon={<Calendar size={32} color="white" />} />
                <MetricCard title="Solicitudes de Ausencia" value={pendingLeaveRequests} color="bg-yellow-500" icon={<AlertTriangle size={32} color="white" />} />
                <MetricCard title="Solicitudes de Cambio" value={pendingSwapRequests} color="bg-purple-500" icon={<Users size={32} color="white" />} />
                <MetricCard title="Empleados con Sobrecarga" value={overloadedEmployees.length} color="bg-red-500" icon={<Clock size={32} color="white" />} />
            </div>

            {/* Overloaded Employees List */}
            {overloadedEmployees.length > 0 && (
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-red-700 dark:text-red-400">Atención Requerida: Empleados con Sobrecarga de Horas</h2>
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {overloadedEmployees.map(emp => {
                            const planned = horas.find(h => h.fk_empleado === emp.id)?.total_horas ?? 0;
                            return (
                                 <li key={emp.id} className="py-3 flex justify-between items-center">
                                    <span className="font-medium">{emp.nombre_completo}</span>
                                    <span className="text-sm text-red-600 font-semibold">{`Planificadas: ${planned.toFixed(1)}h / Contrato: ${emp.horas_contrato_semanales}h`}</span>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default HomeDashboard;