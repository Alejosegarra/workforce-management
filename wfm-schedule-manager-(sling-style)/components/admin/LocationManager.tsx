
import React, { useState } from 'react';
import { Sucursal } from '../../types';
import { supabaseService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';

interface LocationManagerProps {
    initialSucursales: Sucursal[];
    onDataUpdate: () => void;
}

const LocationManager: React.FC<LocationManagerProps> = ({ initialSucursales, onDataUpdate }) => {
    const [sucursales, setSucursales] = useState(initialSucursales);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSucursal, setEditingSucursal] = useState<Partial<Sucursal> | null>(null);
    const { addToast } = useToast();

    const openModal = (suc: Partial<Sucursal> | null = null) => {
        setEditingSucursal(suc ? { ...suc } : { nombre: '', direccion: '', horario_apertura: '09:00', horario_cierre: '21:00' });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSucursal(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingSucursal) return;
        setEditingSucursal({ ...editingSucursal, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSucursal) return;

        try {
            if (editingSucursal.id) {
                await supabaseService.updateSucursal(editingSucursal.id, editingSucursal);
                addToast('Sucursal actualizada!', 'success');
            } else {
                await supabaseService.addSucursal(editingSucursal as Omit<Sucursal, 'id'>);
                addToast('Sucursal agregada!', 'success');
            }
            onDataUpdate();
            closeModal();
        } catch (error) {
            addToast('Error guardando sucursal', 'error');
        }
    };
    
    const handleDelete = async (id: number) => {
         if(window.confirm('Are you sure? Deleting a location may affect assigned shifts.')) {
            try {
                await supabaseService.deleteSucursal(id);
                addToast('Sucursal eliminada', 'success');
                onDataUpdate();
            } catch(error) {
                addToast('Error eliminando sucursal', 'error');
            }
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Gestionar Sucursales</h2>
                <button onClick={() => openModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Agregar Sucursal
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sucursales.map(suc => (
                    <div key={suc.id} className="p-4 border dark:border-gray-700 rounded-lg">
                        <h3 className="font-bold">{suc.nombre}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{suc.direccion}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Horario: {suc.horario_apertura} - {suc.horario_cierre}</p>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => openModal(suc)} className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm">Editar</button>
                            <button onClick={() => handleDelete(suc.id)} className="text-red-600 dark:text-red-400 hover:underline text-sm">Eliminar</button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && editingSucursal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-6">{editingSucursal.id ? 'Editar' : 'Agregar'} Sucursal</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" name="nombre" value={editingSucursal.nombre} onChange={handleChange} placeholder="Nombre" className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
                            <input type="text" name="direccion" value={editingSucursal.direccion} onChange={handleChange} placeholder="Dirección" className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
                             <div className="flex space-x-4">
                                <input type="time" name="horario_apertura" value={editingSucursal.horario_apertura} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
                                <input type="time" name="horario_cierre" value={editingSucursal.horario_cierre} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600" required />
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

export default LocationManager;