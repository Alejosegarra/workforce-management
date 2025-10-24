
import React, { useState, useMemo } from 'react';
import { Empleado, Turno } from '../../types';
import { Download } from 'lucide-react';

interface ReportsProps {
    empleados: Empleado[];
    turnos: Turno[];
}

const Reports: React.FC<ReportsProps> = ({ empleados, turnos }) => {
    const [startDate, setStartDate] = useState('2024-07-29');
    const [endDate, setEndDate] = useState('2024-08-04');

    const filteredData = useMemo(() => {
        return empleados
            .filter(e => e.id !== 'admin-id')
            .map(emp => {
                const empTurnos = turnos.filter(t => 
                    t.fk_empleado === emp.id &&
                    t.fecha >= startDate &&
                    t.fecha <= endDate
                );

                const duracionTurno = (turno: Turno) => {
                    if (!turno.hora_inicio || !turno.hora_fin) return 0;
                    const [startH, startM] = turno.hora_inicio.split(':').map(Number);
                    const [endH, endM] = turno.hora_fin.split(':').map(Number);
                    let duration = (endH + endM / 60) - (startH + startM / 60);
                    if (duration < 0) duration += 24;
                    return duration;
                };

                const horasPlanificadas = empTurnos.reduce((acc, turno) => acc + duracionTurno(turno), 0);
                const diferencia = horasPlanificadas - emp.horas_contrato_semanales;

                return {
                    ...emp,
                    horasPlanificadas,
                    diferencia,
                };
            });
    }, [empleados, turnos, startDate, endDate]);

    const handleExportCSV = () => {
        const headers = ["ID Empleado", "Nombre Completo", "Email", "Horas Contratadas", "Horas Planificadas", "Diferencia"];
        const rows = filteredData.map(emp => [
            emp.id,
            emp.nombre_completo,
            emp.email,
            emp.horas_contrato_semanales,
            emp.horasPlanificadas.toFixed(2),
            emp.diferencia.toFixed(2)
        ].join(','));
        
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_horas_${startDate}_a_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">Reporte de Horas</h2>
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <label htmlFor="start-date" className="text-sm font-medium dark:text-gray-300">Desde:</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"/>
                     </div>
                     <div className="flex items-center gap-2">
                        <label htmlFor="end-date" className="text-sm font-medium dark:text-gray-300">Hasta:</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-md bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"/>
                     </div>
                     <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                        <Download size={18} />
                        Exportar a CSV
                    </button>
                </div>
            </div>
             <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
                            <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contratadas</th>
                            <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Planificadas</th>
                            <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Diferencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(emp => (
                            <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="py-4 px-4 border-b dark:border-gray-600">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{emp.nombre_completo}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{emp.email}</div>
                                </td>
                                <td className="py-4 px-4 border-b dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 font-medium">{emp.horas_contrato_semanales.toFixed(1)}h</td>
                                <td className="py-4 px-4 border-b dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 font-medium">{emp.horasPlanificadas.toFixed(1)}h</td>
                                <td className={`py-4 px-4 border-b dark:border-gray-600 text-sm font-bold ${emp.diferencia >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {emp.diferencia.toFixed(1)}h
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reports;