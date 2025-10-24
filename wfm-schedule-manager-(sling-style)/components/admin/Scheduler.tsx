import React, { useMemo, useState } from 'react';
import { Turno, Posicion, Empleado, HorasSemanales, Ausencia, TurnoPlantilla, Sucursal } from '../../types';
import { supabaseService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';
import { User, ClipboardList, Briefcase, Building } from 'lucide-react';

interface SchedulerProps {
  turnos: Turno[];
  posiciones: Posicion[];
  empleados: Empleado[];
  sucursales: Sucursal[];
  horasSemanales: HorasSemanales[];
  ausencias: Ausencia[];
  plantillas: TurnoPlantilla[];
  onDataUpdate: () => void;
}

type SchedulerView = 'posicion' | 'empleado' | 'sucursal';
type SidebarTab = 'empleados' | 'plantillas';

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date('2024-07-29T00:00:00.000Z');
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
});

const isDateInRange = (date: string, startDate: string, endDate: string) => {
    const d = new Date(date);
    return d >= new Date(startDate) && d <= new Date(endDate);
}

const timeToMinutes = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const ShiftCard: React.FC<{ turno: Turno; horas: number; maxHoras: number; onClick: (turno: Turno) => void; }> = ({ turno, horas, maxHoras, onClick }) => {
    // Open Shift
    if (!turno.fk_empleado) {
        return (
            <div className="p-2 h-full rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs shadow-sm transition-colors flex flex-col justify-center items-center">
                <p className="font-semibold text-gray-600 dark:text-gray-300">Turno Abierto</p>
                <p className="text-gray-500 dark:text-gray-400">{turno.hora_inicio} - {turno.hora_fin}</p>
            </div>
        );
    }
    
    // Assigned Shift
    const workloadPercentage = maxHoras > 0 ? (horas / maxHoras) * 100 : 0;
    
    let colorClasses = 'bg-green-100 border-green-500 text-green-900 dark:bg-green-900/40 dark:border-green-700 dark:text-green-200';
    if (workloadPercentage > 100) {
        colorClasses = 'bg-red-100 border-red-500 text-red-900 dark:bg-red-900/40 dark:border-red-700 dark:text-red-200';
    } else if (workloadPercentage > 85) {
        colorClasses = 'bg-yellow-100 border-yellow-500 text-yellow-900 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-200';
    }

    const duration = () => {
        if (!turno.hora_inicio || !turno.hora_fin) return 0;
        const [startH, startM] = turno.hora_inicio.split(':').map(Number);
        const [endH, endM] = turno.hora_fin.split(':').map(Number);
        let d = (endH + endM / 60) - (startH + startM / 60);
        if (d < 0) d += 24;
        return d;
    }

    return (
        <div onClick={() => onClick(turno)} className={`p-2 rounded-lg border text-xs shadow-sm cursor-pointer hover:shadow-md transition-shadow ${colorClasses}`}>
            <p className="font-bold truncate">{turno.empleado?.nombre_completo}</p>
            <p className="font-semibold">{turno.hora_inicio} - {turno.hora_fin} <span className="font-normal opacity-75">({duration().toFixed(1)}h)</span></p>
            <p className="text-xs mt-1 opacity-90">{`Carga: ${horas.toFixed(1)}/${maxHoras}h`}</p>
        </div>
    );
}

const LeaveCard: React.FC<{ ausencia: Ausencia }> = ({ ausencia }) => {
    const getLeaveColor = () => {
        switch(ausencia.tipo) {
            case 'Vacaciones': return 'bg-green-100 border-green-400 dark:bg-green-900/50 dark:border-green-700';
            case 'Enfermedad': return 'bg-purple-100 border-purple-400 dark:bg-purple-900/50 dark:border-purple-700';
            case 'Personal': return 'bg-orange-100 border-orange-400 dark:bg-orange-900/50 dark:border-orange-700';
        }
    }
    return (
         <div className={`p-2 rounded-lg border text-xs shadow-sm ${getLeaveColor()}`}>
            <p className="font-bold dark:text-gray-100">{ausencia.empleado?.nombre_completo}</p>
            <p className="text-gray-600 dark:text-gray-300">{ausencia.tipo}</p>
        </div>
    );
};

const DraggableItem: React.FC<{
    type: 'employee' | 'template';
    item: Empleado | TurnoPlantilla;
    horas?: number;
    maxHoras?: number;
}> = ({ type, item, horas=0, maxHoras=0 }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('type', type);
        e.dataTransfer.setData('itemId', String(item.id));
    };

    if (type === 'employee') {
        const emp = item as Empleado;
        const workloadPercentage = maxHoras > 0 ? (horas / maxHoras) * 100 : 0;
        let progressBarColor = 'bg-green-500';
        if (workloadPercentage > 100) progressBarColor = 'bg-red-500';
        else if (workloadPercentage > 85) progressBarColor = 'bg-yellow-500';

        return (
            <div draggable onDragStart={handleDragStart} className={`p-2 rounded-lg border dark:border-gray-700 shadow-sm cursor-grab bg-white dark:bg-gray-700 mb-2`}>
                <p className="font-semibold text-sm dark:text-gray-100">{emp.nombre_completo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{emp.posicion?.nombre_posicion}</p>
                <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                        <span>Carga</span>
                        <span>{`${horas.toFixed(1)} / ${maxHoras} h`}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                        <div className={progressBarColor} style={{ width: `${Math.min(workloadPercentage, 100)}%`, height: '100%', borderRadius: 'inherit' }}></div>
                    </div>
                </div>
            </div>
        );
    } else {
        const plantilla = item as TurnoPlantilla;
        return (
            <div draggable onDragStart={handleDragStart} className="p-2 rounded-lg border dark:border-gray-700 shadow-sm cursor-grab bg-blue-50 dark:bg-blue-900/50 mb-2">
                <p className="font-semibold text-sm dark:text-gray-200">{plantilla.nombre}</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">{plantilla.hora_inicio} - {plantilla.hora_fin}</p>
            </div>
        )
    }
}

const Scheduler: React.FC<SchedulerProps> = ({ turnos, posiciones, empleados, sucursales, horasSemanales, ausencias, plantillas, onDataUpdate }) => {
  const { addToast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTurno, setEditingTurno] = useState<Turno | null>(null);
  const [newTurnoData, setNewTurnoData] = useState<Omit<Turno, 'id' | 'fk_empleado'> | null>(null);
  const [view, setView] = useState<SchedulerView>('posicion');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('empleados');
  
  const gridRows = useMemo(() => {
    switch(view) {
        case 'empleado': return empleados.filter(e => e.id !== 'admin-id');
        case 'sucursal': return sucursales;
        case 'posicion':
        default: return posiciones;
    }
  }, [view, posiciones, empleados, sucursales]);

  const checkShiftConflict = (
    employeeId: string,
    date: string,
    newStartTime: string,
    newEndTime: string,
    excludeTurnoId?: number
  ): boolean => {
    const newStartMinutes = timeToMinutes(newStartTime);
    const newEndMinutes = timeToMinutes(newEndTime);

    const employeeShiftsOnDay = turnos.filter(
        (turno) =>
            turno.fk_empleado === employeeId &&
            turno.fecha === date &&
            (excludeTurnoId ? turno.id !== excludeTurnoId : true)
    );

    for (const existingTurno of employeeShiftsOnDay) {
        const existingStartMinutes = timeToMinutes(existingTurno.hora_inicio);
        const existingEndMinutes = timeToMinutes(existingTurno.hora_fin);

        // Check for overlap: (StartA < EndB) and (EndA > StartB)
        if (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes) {
            return true; // Conflict found
        }
    }

    return false; // No conflict
  };


  const getRowHeader = (rowItem: any) => {
    switch(view) {
        case 'empleado': return (rowItem as Empleado).nombre_completo;
        case 'sucursal': return (rowItem as Sucursal).nombre;
        case 'posicion':
        default: return (rowItem as Posicion).nombre_posicion;
    }
  }
  
  const getCellKey = (date: string, rowId: number | string) => `${date}-${view}-${rowId}`;

  const gridData = useMemo(() => {
    const data: { [key: string]: { turnos: Turno[], ausencias: Ausencia[] } } = {};
    
    turnos.forEach(turno => {
      const rowId = view === 'empleado' ? turno.fk_empleado : (view === 'sucursal' ? turno.fk_sucursal_asignada : turno.fk_posicion_requerida);
      if (!rowId) return;
      const key = getCellKey(turno.fecha, rowId);
      if (!data[key]) data[key] = { turnos: [], ausencias: [] };
      data[key].turnos.push(turno);
    });
    
    ausencias.forEach(ausencia => {
        if (ausencia.estado !== 'Aprobado' || !ausencia.empleado) return;
        
        for (let d = new Date(ausencia.fecha_inicio); d <= new Date(ausencia.fecha_fin); d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            const rowId = view === 'empleado' ? ausencia.fk_empleado : (view === 'sucursal' ? ausencia.empleado.fk_sucursal_base : ausencia.empleado.fk_posicion_principal);
            const key = getCellKey(dateString, rowId);
            if (!data[key]) data[key] = { turnos: [], ausencias: [] };
            if (!data[key].ausencias.some(a => a.id === ausencia.id)) {
                 data[key].ausencias.push(ausencia);
            }
        }
    });

    return data;
  }, [turnos, ausencias, view]);
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, date: string, rowItem: any) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('type');
    const itemId = e.dataTransfer.getData('itemId');

    if (type === 'template') {
        const plantilla = plantillas.find(p => p.id === Number(itemId));
        if (!plantilla) return;
        const newTurno: Omit<Turno, 'id'> = {
            fecha: date,
            hora_inicio: plantilla.hora_inicio,
            hora_fin: plantilla.hora_fin,
            fk_empleado: null,
            fk_posicion_requerida: view === 'posicion' ? rowItem.id : (view === 'empleado' ? (rowItem as Empleado).fk_posicion_principal : 0),
            fk_sucursal_asignada: view === 'sucursal' ? rowItem.id : (view === 'empleado' ? (rowItem as Empleado).fk_sucursal_base : 0),
            notas_turno: `Creado desde plantilla '${plantilla.nombre}'`
        }
        if (view === 'empleado') {
            const employee = rowItem as Empleado;
            
            const hasLeave = ausencias.some(a => 
                a.fk_empleado === employee.id && 
                a.estado === 'Aprobado' &&
                isDateInRange(date, a.fecha_inicio, a.fecha_fin)
            );

            if (hasLeave) {
                addToast("No se puede crear el turno. El empleado tiene una ausencia aprobada en esta fecha.", 'error');
                return;
            }

            if (checkShiftConflict(employee.id, date, plantilla.hora_inicio, plantilla.hora_fin)) {
                addToast(`${employee.nombre_completo} ya tiene un turno que se solapa en este día.`, 'error');
                return;
            }

            newTurno.fk_empleado = employee.id;
        }

        try {
            await supabaseService.addTurno(newTurno);
            onDataUpdate();
            addToast('Turno creado desde plantilla!', 'success');
        } catch (error) {
            addToast('Error al crear turno', 'error');
        }
    } else if (type === 'employee') {
        const employeeId = itemId;
        const employee = empleados.find(e => e.id === employeeId);
        if (!employee) return;

        const hasLeave = ausencias.some(a => 
            a.fk_empleado === employeeId && 
            a.estado === 'Aprobado' &&
            isDateInRange(date, a.fecha_inicio, a.fecha_fin)
        );

        if (hasLeave) {
            addToast("No se puede crear el turno. El empleado tiene una ausencia aprobada en esta fecha.", 'error');
            return;
        }

        const newShiftStartTime = '09:00';
        const newShiftEndTime = '17:00';

        if (checkShiftConflict(employeeId, date, newShiftStartTime, newShiftEndTime)) {
            addToast(`${employee.nombre_completo} ya tiene un turno que se solapa en este día.`, 'error');
            return;
        }

        const newTurno: Omit<Turno, 'id'> = {
            fecha: date,
            hora_inicio: newShiftStartTime,
            hora_fin: newShiftEndTime,
            fk_empleado: employeeId,
            fk_posicion_requerida: employee.fk_posicion_principal,
            fk_sucursal_asignada: employee.fk_sucursal_base,
            notas_turno: `Creado por arrastre`
        };
        
        if (view === 'posicion') {
            newTurno.fk_posicion_requerida = rowItem.id;
        } else if (view === 'sucursal') {
            newTurno.fk_sucursal_asignada = rowItem.id;
        }

        try {
            await supabaseService.addTurno(newTurno);
            onDataUpdate();
            addToast('Turno creado y asignado!', 'success');
        } catch (error) {
            addToast('Error al crear el turno', 'error');
        }
    }
  };

  const handleShiftDrop = async (e: React.DragEvent<HTMLDivElement>, turnoId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('type');
    if (type !== 'employee') return;
    
    const employeeId = e.dataTransfer.getData('itemId');
    const targetTurno = turnos.find(t => t.id === turnoId);
    if (!employeeId || !targetTurno) return;

    const employee = empleados.find(emp => emp.id === employeeId);
    if (!employee) return;

    const hasLeave = ausencias.some(a => 
        a.fk_empleado === employeeId && 
        a.estado === 'Aprobado' &&
        isDateInRange(targetTurno.fecha, a.fecha_inicio, a.fecha_fin)
    );

    if (hasLeave) {
        addToast("No se puede asignar. El empleado tiene una ausencia aprobada en esta fecha.", 'error');
        return;
    }

    if (checkShiftConflict(employeeId, targetTurno.fecha, targetTurno.hora_inicio, targetTurno.hora_fin)) {
        addToast(`${employee.nombre_completo} ya tiene un turno que se solapa en este día.`, 'error');
        return;
    }

    if (targetTurno.fk_empleado !== employeeId) {
        try {
            await supabaseService.updateTurno(turnoId, { fk_empleado: employeeId });
            
            if(employee) {
                const subject = "Nuevo Turno Asignado";
                const body = `Hola ${employee.nombre_completo},\n\nSe te ha asignado un nuevo turno:\nFecha: ${targetTurno.fecha}\nHorario: ${targetTurno.hora_inicio} - ${targetTurno.hora_fin}\n\nSaludos,\nEquipo de WFM.`;
                await supabaseService.sendEmailNotification(employee.email, subject, body);
            }

            onDataUpdate();
            addToast('Turno asignado y notificación enviada!', 'success');
        } catch (error) {
            console.error("Failed to update turno", error);
            addToast('Error al asignar el turno', 'error');
        }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const getEmpleadoHoras = (empleadoId: string) => {
    return horasSemanales.find(h => h.fk_empleado === empleadoId)?.total_horas ?? 0;
  }

  const handleEditClick = (turno: Turno) => {
    if(!turno.fk_empleado) {
        // Clicking open shifts is handled by the cell click for creation,
        // or drag-and-drop for assignment.
        return;
    }
    setEditingTurno({ ...turno });
    setIsEditModalOpen(true);
  };
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (editingTurno) {
          setEditingTurno({ ...editingTurno, [e.target.name]: e.target.value });
      }
      if (newTurnoData) {
          setNewTurnoData({ ...newTurnoData, [e.target.name]: e.target.value });
      }
  };
  
  const handleSaveTime = async () => {
    if (!editingTurno) return;

    if (
        editingTurno.fk_empleado && 
        checkShiftConflict(
            editingTurno.fk_empleado, 
            editingTurno.fecha, 
            editingTurno.hora_inicio, 
            editingTurno.hora_fin, 
            editingTurno.id
        )
    ) {
        addToast('El nuevo horario entra en conflicto con otro turno para este empleado.', 'error');
        return;
    }

    try {
        await supabaseService.updateTurno(editingTurno.id, {
            hora_inicio: editingTurno.hora_inicio,
            hora_fin: editingTurno.hora_fin,
        });

        if (editingTurno.empleado) {
            const subject = "Actualización de Horario de Turno";
            const body = `Hola ${editingTurno.empleado.nombre_completo},\n\nTu turno del día ${editingTurno.fecha} ha sido modificado.\nNuevo horario: ${editingTurno.hora_inicio} - ${editingTurno.hora_fin}.\n\nSaludos,\nEquipo de WFM.`;
            await supabaseService.sendEmailNotification(editingTurno.empleado.email, subject, body);
        }

        onDataUpdate();
        addToast('Turno actualizado y notificación enviada', 'success');
        setIsEditModalOpen(false);
        setEditingTurno(null);
    } catch (error) {
        console.error("Failed to update shift time", error);
        addToast('Error al actualizar el turno', 'error');
    }
  };
  
  const handleCellClick = (date: string, rowItem: any) => {
    const newTurnoBase: Omit<Turno, 'id' | 'fk_empleado'> = {
        fecha: date,
        fk_posicion_requerida: 0,
        fk_sucursal_asignada: 0,
        hora_inicio: '09:00',
        hora_fin: '17:00',
        notas_turno: ''
    };
    if (view === 'posicion') newTurnoBase.fk_posicion_requerida = rowItem.id;
    if (view === 'sucursal') newTurnoBase.fk_sucursal_asignada = rowItem.id;
    if (view === 'empleado') {
        newTurnoBase.fk_posicion_requerida = (rowItem as Empleado).fk_posicion_principal;
        newTurnoBase.fk_sucursal_asignada = (rowItem as Empleado).fk_sucursal_base;
    }
    setNewTurnoData(newTurnoBase);
    setIsCreateModalOpen(true);
  };

  const handleCreateTurno = async () => {
    if (!newTurnoData) return;
    try {
        await supabaseService.addTurno({ ...newTurnoData, fk_empleado: null });
        onDataUpdate();
        addToast('Nuevo turno creado!', 'success');
        setIsCreateModalOpen(false);
        setNewTurnoData(null);
    } catch (error) {
        addToast('Error al crear el turno', 'error');
    }
  };
  
  const ViewSwitcher: React.FC = () => {
    const baseClasses = "px-3 py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50";
    const activeClasses = "bg-indigo-600 text-white";
    const inactiveClasses = "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600";

    return (
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-3">Ver por:</span>
        <div className="flex items-center rounded-lg shadow-sm border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setView('posicion')}
            className={`${baseClasses} rounded-l-md ${view === 'posicion' ? activeClasses : inactiveClasses}`}
          >
            <Briefcase size={14} /> Posición
          </button>
          <button
            onClick={() => setView('empleado')}
            className={`${baseClasses} border-l border-r border-gray-300 dark:border-gray-600 ${view === 'empleado' ? activeClasses : inactiveClasses}`}
          >
            <User size={14} /> Empleado
          </button>
          <button
            onClick={() => setView('sucursal')}
            className={`${baseClasses} rounded-r-md ${view === 'sucursal' ? activeClasses : inactiveClasses}`}
          >
            <Building size={14} /> Sucursal
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
        <div className="flex bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <div className="w-64 p-2 bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-700 h-[80vh] flex flex-col">
                <div className="flex border-b dark:border-gray-700 mb-2">
                    <button onClick={() => setSidebarTab('empleados')} className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 ${sidebarTab === 'empleados' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        <User size={16} /> Empleados
                    </button>
                    <button onClick={() => setSidebarTab('plantillas')} className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 ${sidebarTab === 'plantillas' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        <ClipboardList size={16} /> Plantillas
                    </button>
                </div>
                <div className="overflow-y-auto flex-1">
                    {sidebarTab === 'empleados' ? (
                         empleados.filter(e => e.id !== 'admin-id').map(emp => (
                            <DraggableItem key={emp.id} type="employee" item={emp} horas={getEmpleadoHoras(emp.id)} maxHoras={emp.horas_contrato_semanales} />
                        ))
                    ) : (
                        plantillas.map(p => (
                            <DraggableItem key={p.id} type="template" item={p} />
                        ))
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-x-auto">
                <div className="flex justify-between items-center mb-4 px-4">
                    <h2 className="text-xl font-bold">Planificador Semanal</h2>
                    <ViewSwitcher />
                </div>
                <div className="grid grid-cols-8 min-w-[1200px]">
                    <div className="font-semibold p-2 border-b border-r dark:border-gray-700 sticky left-0 bg-white dark:bg-gray-800 z-10">Vista</div>
                    {diasSemana.map((dia, index) => (
                        <div key={dia} className="font-semibold p-2 border-b dark:border-gray-700 text-center">
                            {dia}<br/>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{weekDates[index].substring(5)}</span>
                        </div>
                    ))}

                    {gridRows.map(row => (
                        <React.Fragment key={row.id}>
                            <div className="p-2 border-b border-r dark:border-gray-700 font-semibold bg-gray-50 dark:bg-gray-700 sticky left-0 z-10">{getRowHeader(row)}</div>
                            {weekDates.map(date => {
                                const key = getCellKey(date, row.id);
                                const cellData = gridData[key] || { turnos: [], ausencias: [] };
                                return (
                                    <div 
                                        key={key} 
                                        onDrop={(e) => handleDrop(e, date, row)}
                                        onDragOver={handleDragOver}
                                        onClick={() => handleCellClick(date, row)}
                                        className="p-2 border-b border-l dark:border-gray-700 min-h-[100px] space-y-2 bg-gray-50/50 dark:bg-black/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer"
                                    >
                                        {cellData.ausencias.map(ausencia => (
                                            <LeaveCard key={`leave-${ausencia.id}`} ausencia={ausencia} />
                                        ))}
                                        {cellData.turnos.map(turno => (
                                            <div key={turno.id} onClick={(e) => e.stopPropagation()} onDrop={(e) => handleShiftDrop(e, turno.id)} onDragOver={handleDragOver}>
                                                <ShiftCard 
                                                    onClick={handleEditClick}
                                                    turno={turno}
                                                    horas={turno.fk_empleado ? getEmpleadoHoras(turno.fk_empleado) : 0}
                                                    maxHoras={turno.empleado?.horas_contrato_semanales ?? 0}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>

        {isEditModalOpen && editingTurno && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
                    <h3 className="text-lg font-bold mb-4">Editar Horario del Turno</h3>
                    <p className="mb-2 text-sm">Empleado: <span className="font-semibold">{editingTurno.empleado?.nombre_completo}</span></p>
                    <p className="mb-4 text-sm">Fecha: <span className="font-semibold">{editingTurno.fecha}</span></p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="hora_inicio_edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora de Inicio</label>
                            <input
                                type="time"
                                id="hora_inicio_edit"
                                name="hora_inicio"
                                value={editingTurno.hora_inicio}
                                onChange={handleTimeChange}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="hora_fin_edit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora de Fin</label>
                            <input
                                type="time"
                                id="hora_fin_edit"
                                name="hora_fin"
                                value={editingTurno.hora_fin}
                                onChange={handleTimeChange}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-6">
                        <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500">Cancelar</button>
                        <button onClick={handleSaveTime} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Guardar Cambios</button>
                    </div>
                </div>
            </div>
        )}

        {isCreateModalOpen && newTurnoData && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
                    <h3 className="text-lg font-bold mb-4">Crear Nuevo Turno</h3>
                    <p className="mb-4 text-sm">Fecha: <span className="font-semibold">{newTurnoData.fecha}</span></p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="hora_inicio_create" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora de Inicio</label>
                            <input
                                type="time"
                                id="hora_inicio_create"
                                name="hora_inicio"
                                value={newTurnoData.hora_inicio}
                                onChange={handleTimeChange}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="hora_fin_create" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora de Fin</label>
                            <input
                                type="time"
                                id="hora_fin_create"
                                name="hora_fin"
                                value={newTurnoData.hora_fin}
                                onChange={handleTimeChange}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-6">
                        <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500">Cancelar</button>
                        <button onClick={handleCreateTurno} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Crear Turno</button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default Scheduler;
