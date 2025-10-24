
import React, { useState, useEffect, useCallback } from 'react';
import { User, Ausencia, TipoAusencia } from '../../types';
import { supabaseService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';

interface LeaveRequestModuleProps {
    user: User;
}

const LeaveRequestModule: React.FC<LeaveRequestModuleProps> = ({ user }) => {
    const [myRequests, setMyRequests] = useState<Ausencia[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [newRequest, setNewRequest] = useState({
        tipo: 'Vacaciones' as TipoAusencia,
        fecha_inicio: '',
        fecha_fin: '',
        notas: '',
    });
    const { addToast } = useToast();

    const fetchMyRequests = useCallback(async () => {
        try {
            const data = await supabaseService.getAusenciasByEmpleado(user.id);
            setMyRequests(data.sort((a,b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()));
        } catch (error) {
            console.error(error);
        }
    }, [user.id]);
    
    useEffect(() => {
        fetchMyRequests();
    }, [fetchMyRequests]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setNewRequest({ ...newRequest, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRequest.fecha_inicio || !newRequest.fecha_fin) {
            addToast('Las fechas son obligatorias', 'error');
            return;
        }
        try {
            await supabaseService.createAusencia({ ...newRequest, fk_empleado: user.id });
            addToast('Solicitud enviada', 'success');
            setShowForm(false);
            setNewRequest({ tipo: 'Vacaciones', fecha_inicio: '', fecha_fin: '', notas: '' });
            fetchMyRequests();
        } catch (error) {
            addToast('Error al enviar la solicitud', 'error');
        }
    };
    
    const getStatusColor = (status: Ausencia['estado']) => {
        switch(status) {
            case 'Aprobado': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case 'Rechazado': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            case 'Pendiente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
                <h3 className="text-lg font-semibold">Mis Ausencias</h3>
                <button onClick={() => setShowForm(!showForm)} className="text-sm bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600">
                    {showForm ? 'Cancelar' : 'Nueva Solicitud'}
                </button>
            </div>
            {showForm && (
                <form onSubmit={handleSubmit} className="space-y-3 p-3 mb-4 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600">
                    <select name="tipo" value={newRequest.tipo} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-600 dark:border-gray-500">
                        <option value="Vacaciones">Vacaciones</option>
                        <option value="Enfermedad">Enfermedad</option>
                        <option value="Personal">Personal</option>
                    </select>
                    <div className="flex space-x-2">
                        <input type="date" name="fecha_inicio" value={newRequest.fecha_inicio} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-600 dark:border-gray-500" />
                        <input type="date" name="fecha_fin" value={newRequest.fecha_fin} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-600 dark:border-gray-500" />
                    </div>
                    <textarea name="notas" value={newRequest.notas} onChange={handleChange} placeholder="Notas (opcional)" rows={2} className="w-full p-2 border rounded bg-white dark:bg-gray-600 dark:border-gray-500"></textarea>
                    <button type="submit" className="w-full px-4 py-2 bg-indigo-600 text-white rounded">Enviar</button>
                </form>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
                {myRequests.length > 0 ? myRequests.map(req => (
                     <div key={req.id} className="p-2 border dark:border-gray-700 rounded-md flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-sm">{req.tipo}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{req.fecha_inicio} al {req.fecha_fin}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(req.estado)}`}>{req.estado}</span>
                    </div>
                )) : <p className="text-gray-500 dark:text-gray-400 text-sm">No tienes solicitudes.</p>}
            </div>
        </div>
    );
};

export default LeaveRequestModule;