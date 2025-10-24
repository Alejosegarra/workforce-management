
import React, { useState, useEffect } from 'react';
import { subscribeToChanges } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';

interface NotificationFeedProps {
  userId: string;
}

interface Notification {
  id: string;
  message: string;
  timestamp: Date;
}

const NotificationFeed: React.FC<NotificationFeedProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    // Subscribe to changes in shifts assigned to the user
    const turnoSubscription = subscribeToChanges(
        'turnos', 
        `fk_empleado=eq.${userId}`, 
        (payload) => {
            const newTurno = payload.new;
            const message = `Tu turno del ${newTurno.fecha} ha sido actualizado.`;
            const newNotif = { id: `turno-${Date.now()}`, message, timestamp: new Date() };
            setNotifications(prev => [newNotif, ...prev]);
            addToast(message, 'info');
        }
    );

    // Subscribe to changes in swap requests involving the user
    const cambioSubscription = subscribeToChanges(
        'cambios_pendientes', 
        `fk_empleado_solicitante=eq.${userId},fk_empleado_destino=eq.${userId}`, 
        (payload) => {
            const newCambio = payload.new;
            let message = '';
            if (newCambio.fk_empleado_solicitante === userId) {
                message = `Tu solicitud de cambio para el turno del ${newCambio.turno?.fecha} ha sido ${newCambio.estado}.`;
            } else {
                message = `Una solicitud de cambio de ${newCambio.solicitante?.nombre_completo} ha sido ${newCambio.estado}.`
            }
            const newNotif = { id: `cambio-${Date.now()}`, message, timestamp: new Date() };
            setNotifications(prev => [newNotif, ...prev]);
            addToast(message, newCambio.estado === 'Aprobado' ? 'success' : 'error');
        }
    );

    return () => {
      turnoSubscription.unsubscribe();
      cambioSubscription.unsubscribe();
    };
  }, [userId, addToast]);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 border-b dark:border-gray-700 pb-2">Notificaciones</h3>
      {notifications.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No hay notificaciones nuevas.</p>
      ) : (
        <ul className="space-y-3 max-h-96 overflow-y-auto">
          {notifications.map(notif => (
            <li key={notif.id} className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">{notif.message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{notif.timestamp.toLocaleTimeString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationFeed;