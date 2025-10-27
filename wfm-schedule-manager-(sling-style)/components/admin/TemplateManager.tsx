
import React, { useState } from 'react';
import { TurnoPlantilla } from '../../types';
import { supabaseService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

interface TemplateManagerProps {
    initialPlantillas: TurnoPlantilla[];
    onDataUpdate: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ initialPlantillas, onDataUpdate }) => {
    const [plantillas, setPlantillas] = useState(initialPlantillas);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Partial<TurnoPlantilla> | null>(null);
    const { addToast } = useToast();

    const openModal = (p: Partial<TurnoPlantilla> | null = null) => {
        setEditingTemplate(p ? { ...p } : { nombre: '', hora_inicio: '09:00', hora_fin: '17:00' });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTemplate(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingTemplate) return;
        setEditingTemplate({ ...editingTemplate, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTemplate || !editingTemplate.nombre) {
            addToast('El nombre de la plantilla es requerido', 'error');
            return;
        }

        try {
            if (editingTemplate.id) {
                await supabaseService.updateTurnoPlantilla(editingTemplate.id, editingTemplate);
                addToast('Plantilla actualizada!', 'success');
            } else {
                await supabaseService.addTurnoPlantilla(editingTemplate as Omit<TurnoPlantilla, 'id'>);
                addToast('Plantilla creada!', 'success');
            }
            onDataUpdate();
            closeModal();
        } catch (error) {
            addToast('Error al guardar la plantilla', 'error');
        }
    };
    
    const handleDelete = async (id: number) => {
         if(window.confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) {
            try {
                await supabaseService.deleteTurnoPlantilla(id);
                addToast('Plantilla eliminada', 'success');
                onDataUpdate();
            } catch(error) {
                addToast('Error al eliminar la plantilla', 'error');
            }
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Gestionar Plantillas de Turnos</h2>
                <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    <PlusCircle size={18} />
                    Crear Plantilla
                </button>
            </div>
            <div className="space-y-3">
                {initialPlantillas.map(p => (
                    <div key={p.id} className="p-4 border dark:border-gray-700 rounded-lg flex justify-between items-center bg-gray-50 dark:bg-gray-700">
                        <div>
                            <h3 className="font-bold">{p.nombre}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{p.hora_inicio} - {p.hora_fin}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => openModal(p)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"><Edit size={18} /></button>
                            <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && editingTemplate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-6">{editingTemplate.id ? 'Editar' : 'Crear'} Plantilla</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" name="nombre" value={editingTemplate.nombre} onChange={handleChange} placeholder="Nombre de la Plantilla" className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
                             <div className="flex space-x-4">
                                <div>
                                    <label className="text-sm dark:text-gray-300">Hora de Inicio</label>
                                    <input type="time" name="hora_inicio" value={editingTemplate.hora_inicio} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
                                </div>
                                <div>
                                    <label className="text-sm dark:text-gray-300">Hora de Fin</label>
                                    <input type="time" name="hora_fin" value={editingTemplate.hora_fin} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-2 pt-4">
                                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateManager;