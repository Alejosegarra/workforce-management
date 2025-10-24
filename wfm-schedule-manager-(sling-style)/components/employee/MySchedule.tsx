
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Turno, Empleado } from '../../types';
import { supabaseService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';

interface MyScheduleProps {
  user: User;
}

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date('2024-07-29T00:00:00.000Z');
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
});

const MySchedule: React.FC<MyScheduleProps> = ({ user }) => {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [allTurnos, setAllTurnos] = useState<Turno[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null);
  const [selectedSwap, setSelectedSwap] = useState<{ turnoId: number, empleadoId: string } | null>(null);

  const { addToast } = useToast();

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const [turnosData, empleadosData, allTurnosData] = await Promise.all([
        supabaseService.getTurnosByEmpleado(user.id),
        supabaseService.getEmpleados(),
        supabaseService.getTurnos(new Date(), new Date()), // Fetch all shifts for swapping
      ]);
      setTurnos(turnosData);
      setEmpleados(empleadosData.filter(e => e.id !== user.id));
      setAllTurnos(allTurnosData);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);
  
  const handleSwapClick = (turno: Turno) => {
    setSelectedTurno(turno);
    setShowModal(true);
  };

  const compatibleShifts = useMemo(() => {
      if (!selectedTurno) return [];
      return allTurnos.filter(t => 
        t.fk_empleado && // must be assigned
        t.fk_empleado !== user.id && // must not be mine
        t.fk_posicion_requerida === selectedTurno.fk_posicion_requerida // must be same position
      )
  }, [selectedTurno, allTurnos, user.id]);

  const handleSubmit = async () => {
    if (!selectedTurno || !selectedSwap) {
        addToast('Please select a shift to swap with', 'error');
        return;
    }
    try {
        await supabaseService.createCambioPendiente({
            fk_turno_original: selectedTurno.id,
            fk_empleado_solicitante: user.id,
            fk_empleado_destino: selectedSwap.empleadoId,
            fk_turno_solicitado: selectedSwap.turnoId
        });
        addToast('Swap proposal sent!', 'success');
        setShowModal(false);
        setSelectedTurno(null);
        setSelectedSwap(null);
    } catch (error) {
        addToast('Failed to send proposal', 'error');
        console.error(error);
    }
  }

  const turnosPorDia = useMemo(() => {
    const grouped: { [key: string]: Turno[] } = {};
    turnos.forEach(turno => {
        if (!grouped[turno.fecha]) {
            grouped[turno.fecha] = [];
        }
        grouped[turno.fecha].push(turno);
    });
    return grouped;
  }, [turnos]);

  return (
    <>
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Mi Calendario Semanal</h2>
      {loading ? (
        <p>Cargando horario...</p>
      ) : (
        <div className="grid grid-cols-7 border-t border-l dark:border-gray-700">
            {diasSemana.map((dia, index) => (
                <div key={dia} className="p-2 border-b border-r dark:border-gray-700 text-center font-semibold bg-gray-50 dark:bg-gray-700">
                    {dia} <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">{weekDates[index].substring(5)}</span>
                </div>
            ))}
            {weekDates.map(date => (
                <div key={date} className="border-b border-r dark:border-gray-700 min-h-[120px] p-1 space-y-1 bg-gray-50/50 dark:bg-black/10">
                    {turnosPorDia[date]?.map(turno => (
                        <div key={turno.id} className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-xs border border-blue-300 dark:border-blue-700">
                             <p className="font-bold text-blue-800 dark:text-blue-200">{turno.hora_inicio} - {turno.hora_fin}</p>
                             <p className="text-gray-700 dark:text-gray-300">{turno.sucursal?.nombre}</p>
                             <p className="text-gray-500 dark:text-gray-400 italic">{turno.posicion?.nombre_posicion}</p>
                             <button
                                onClick={() => handleSwapClick(turno)}
                                className="mt-2 w-full bg-indigo-500 text-white px-2 py-1 rounded text-xs hover:bg-indigo-600"
                             >
                                Proponer Intercambio
                             </button>
                        </div>
                    ))}
                </div>
            ))}
        </div>
      )}
      </div>
      {showModal && selectedTurno && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h3 className="text-lg font-bold mb-4">Proponer Intercambio de Turno</h3>
                <p className="mb-4 text-sm">Selecciona un turno de un compañero para intercambiar con tu turno del <span className="font-semibold">{selectedTurno.fecha} ({selectedTurno.hora_inicio}-{selectedTurno.hora_fin})</span>.</p>
                
                <div className="max-h-64 overflow-y-auto border dark:border-gray-700 rounded-lg p-2 space-y-2 bg-gray-50 dark:bg-gray-900">
                    {compatibleShifts.length > 0 ? compatibleShifts.map(turno => (
                        <div 
                            key={turno.id} 
                            onClick={() => setSelectedSwap({ turnoId: turno.id, empleadoId: turno.fk_empleado! })}
                            className={`p-3 rounded-md cursor-pointer border-2 ${selectedSwap?.turnoId === turno.id ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/70' : 'border-transparent bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                        >
                           <p className="font-semibold">{turno.empleado?.nombre_completo}</p>
                           <p className="text-sm text-gray-600 dark:text-gray-300">{turno.fecha} | {turno.hora_inicio} - {turno.hora_fin} | {turno.sucursal?.nombre}</p>
                        </div>
                    )) : <p className="text-center text-gray-500 dark:text-gray-400 p-4">No hay turnos compatibles para intercambiar.</p>}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded">Cancelar</button>
                    <button onClick={handleSubmit} disabled={!selectedSwap} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-indigo-300">Enviar Propuesta</button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default MySchedule;