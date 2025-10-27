
import React, { useState, useEffect } from 'react';
import { Ausencia, EstadoAusencia } from '../../types';
import { supabaseService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';

interface LeaveRequestsProps {
    initialAusencias: Ausencia[];
    onDataUpdate: () => void;
}

const LeaveRequests: React.FC<LeaveRequestsProps> = ({ initialAusencias, onDataUpdate }) => {
    const [requests, setRequests] = useState<Ausencia[]>([]);
    
    useEffect(() => {
        setRequests(initialAusencias.filter(a => a.estado === 'Pendiente'));
    }, [initialAusencias]);

    const { addToast } = useToast();

    const handleResponse = async (id: number, estado: EstadoAusencia) => {
        try {
            await supabaseService.updateAusencia(id, estado);
            addToast(`Solicitud ${estado.toLowerCase()}`, 'success');
            onDataUpdate();
        } catch (error) {
            console.error('Error actualizando solicitud de ausencia:', error);
            addToast('Error al procesar la solicitud', 'error');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Solicitudes de Ausencia</h2>
            {requests.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No hay solicitudes pendientes.</p>
            ) : (
                <div className="space-y-4">
                    {requests.map(req => (
                        <div key={req.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600">
                            <p className="font-semibold">{req.empleado?.nombre_completo}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{req.tipo}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Fechas: {req.fecha_inicio} al {req.fecha_fin}
                            </p>
                            {req.notas && <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-1">"{req.notas}"</p>}
                            <div className="flex justify-end space-x-2 mt-3">
                                <button
                                    onClick={() => handleResponse(req.id, 'Aprobado')}
                                    className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded hover:bg-green-600"
                                >
                                    Aprobar
                                </button>
                                <button
                                    onClick={() => handleResponse(req.id, 'Rechazado')}
                                    className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600"
                                >
                                    Rechazar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LeaveRequests;