
import React, { useState, useEffect } from 'react';
import { Empleado, Posicion, Sucursal } from '../../types';
import { supabaseService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';

interface EmployeeManagerProps {
    initialEmpleados: Empleado[];
    posiciones: Posicion[];
    sucursales: Sucursal[];
    onDataUpdate: () => void;
}

const EmployeeManager: React.FC<EmployeeManagerProps> = ({ initialEmpleados, posiciones, sucursales, onDataUpdate }) => {
    const [empleados, setEmpleados] = useState(initialEmpleados);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Partial<Empleado> & { password?: string } | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        setEmpleados(initialEmpleados.filter(e => e.role !== 'admin'));
    }, [initialEmpleados]);

    const openModal = (emp: Partial<Empleado> | null = null) => {
        setEditingEmployee(emp ? { ...emp } : { nombre_completo: '', email: '', fk_posicion_principal: 0, fk_sucursal_base: 0, horas_contrato_semanales: 40, password: '' });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEmployee(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editingEmployee) return;
        const { name, value } = e.target;
        setEditingEmployee({ ...editingEmployee, [name]: name.startsWith('fk_') || name.endsWith('semanales') ? parseInt(value) : value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmployee) return;

        try {
            if (editingEmployee.id) {
                const { id, password, ...updateData } = editingEmployee;
                await supabaseService.updateEmpleado(id, updateData);
                addToast('Empleado actualizado!', 'success');
            } else {
                if (!editingEmployee.password || editingEmployee.password.length < 6) {
                    addToast('La contraseña debe tener al menos 6 caracteres.', 'error');
                    return;
                }
                await supabaseService.addEmpleado(editingEmployee as Empleado & { password?: string });
                addToast('Empleado agregado! Se ha creado su cuenta para iniciar sesión.', 'success');
            }
            onDataUpdate();
            closeModal();
        } catch (error: any) {
            console.error(error);
            addToast(error.message || 'Error guardando empleado', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if(window.confirm('¿Estás seguro? Esto eliminará al empleado y su acceso al sistema.')) {
            try {
                await supabaseService.deleteEmpleado(id);
                addToast('Empleado eliminado', 'success');
                onDataUpdate();
            } catch(error: any) {
                addToast(error.message || 'Error eliminando empleado', 'error');
            }
        }
    }
    
    // The calculation for weekly hours will be done in the Reports section
    // as it requires fetching all shifts which can be intensive.

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Gestionar Empleados</h2>
                <button onClick={() => openModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Agregar Empleado
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
                            <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Posición</th>
                            <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Horas Contratadas</th>
                            <th className="py-3 px-4 border-b dark:border-gray-600 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empleados.map(emp => (
                                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="py-4 px-4 border-b dark:border-gray-600">
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{emp.nombre_completo}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{emp.email}</div>
                                    </td>
                                    <td className="py-4 px-4 border-b dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">{emp.posicion?.nombre_posicion}</td>
                                    <td className="py-4 px-4 border-b dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">{emp.horas_contrato_semanales}h</td>
                                    <td className="py-4 px-4 border-b dark:border-gray-600 text-sm">
                                        <button onClick={() => openModal(emp)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4">Editar</button>
                                        <button onClick={() => handleDelete(emp.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Eliminar</button>
                                    </td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && editingEmployee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-6">{editingEmployee.id ? 'Editar' : 'Agregar'} Empleado</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" name="nombre_completo" value={editingEmployee.nombre_completo} onChange={handleChange} placeholder="Nombre Completo" className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                            <input type="email" name="email" value={editingEmployee.email} onChange={handleChange} placeholder="Email" className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" disabled={!!editingEmployee.id} required />
                            {!editingEmployee.id &&
                                <input type="password" name="password" value={editingEmployee.password} onChange={handleChange} placeholder="Contraseña Temporal" className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                            }
                            <select name="fk_posicion_principal" value={editingEmployee.fk_posicion_principal} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                                <option value="">Seleccionar Posición</option>
                                {posiciones.map(p => <option key={p.id} value={p.id}>{p.nombre_posicion}</option>)}
                            </select>
                            <select name="fk_sucursal_base" value={editingEmployee.fk_sucursal_base} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                                 <option value="">Seleccionar Sucursal</option>
                                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                            <input type="number" name="horas_contrato_semanales" value={editingEmployee.horas_contrato_semanales} onChange={handleChange} placeholder="Horas por semana" className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
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

export default EmployeeManager;
