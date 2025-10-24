import React, { useState, useEffect, useCallback } from 'react';
import { CambioPendiente } from '../../types';
import { supabaseService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';
import { ArrowRightLeft } from 'lucide-react';

interface SwapRequestsProps {
    onUpdateRequest: () => void;
}

const SwapRequests: React.FC<SwapRequestsProps> = ({ onUpdateRequest }) => {
  const [requests, setRequests] = useState<CambioPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supabaseService.getCambiosPendientes();
      setRequests(data.filter(r => r.estado === 'Pendiente'));
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      addToast('Failed to fetch requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleResponse = async (id: number, approved: boolean) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    try {
      await supabaseService.updateCambioPendiente(id, approved ? 'Aprobado' : 'Rechazado');
      
      if (approved && request.solicitante && request.destino && request.turno) {
          const subject = "Solicitud de Intercambio de Turno Aprobada";
          
          if(request.turno_solicitado) { // Direct Swap
              const bodySolicitante = `Hola ${request.solicitante.nombre_completo},\n\nTu propuesta de intercambio ha sido aprobada. Ahora tienes el turno del día ${request.turno_solicitado.fecha} de ${request.turno_solicitado.hora_inicio} a ${request.turno_solicitado.hora_fin}.`;
              await supabaseService.sendEmailNotification(request.solicitante.email, subject, bodySolicitante);

              const bodyDestino = `Hola ${request.destino.nombre_completo},\n\nEl intercambio de turno propuesto por ${request.solicitante.nombre_completo} ha sido aprobado. Ahora tienes el turno del día ${request.turno.fecha} de ${request.turno.hora_inicio} a ${request.turno.hora_fin}.`;
              await supabaseService.sendEmailNotification(request.destino.email, subject, bodyDestino);
          } else { // Simple Offer
              const bodyDestino = `Hola ${request.destino.nombre_completo},\n\nLa oferta de turno de ${request.solicitante.nombre_completo} ha sido aprobada. Se te ha asignado su turno del día ${request.turno.fecha} de ${request.turno.hora_inicio} a ${request.turno.hora_fin}.`;
              await supabaseService.sendEmailNotification(request.destino.email, subject, bodyDestino);
          }
      }

      addToast(`Solicitud ${approved ? 'aprobada' : 'rechazada'} y notificaciones enviadas.`, 'success');
      onUpdateRequest();
      fetchRequests(); // Re-fetch list
    } catch (error) {
      console.error('Error updating request:', error);
      addToast('Failed to update request', 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 border-b dark:border-gray-700 pb-2">Solicitudes de Cambio</h3>
      {loading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No hay solicitudes pendientes.</p>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {requests.map(req => (
            <div key={req.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600">
              {req.turno_solicitado ? (
                // Direct Swap View
                <div>
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2">Propuesta de Intercambio</p>
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-center">
                        <p className="font-semibold">{req.solicitante?.nombre_completo}</p>
                        <p className="text-gray-600 dark:text-gray-300">{req.turno?.fecha}</p>
                        <p>{req.turno?.hora_inicio}-{req.turno?.hora_fin}</p>
                    </div>
                    <ArrowRightLeft size={18} className="text-gray-500 dark:text-gray-400 mx-2" />
                     <div className="text-center">
                        <p className="font-semibold">{req.destino?.nombre_completo}</p>
                        <p className="text-gray-600 dark:text-gray-300">{req.turno_solicitado?.fecha}</p>
                        <p>{req.turno_solicitado?.hora_inicio}-{req.turno_solicitado?.hora_fin}</p>
                    </div>
                  </div>
                </div>
              ) : (
                // Simple Offer View
                <div>
                   <p className="font-semibold text-sm">
                    {req.solicitante?.nombre_completo ?? 'Unknown'} ofrece su turno a {req.destino?.nombre_completo ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Turno: {req.turno?.fecha} de {req.turno?.hora_inicio} a {req.turno?.hora_fin}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-3">
                <button
                  onClick={() => handleResponse(req.id, true)}
                  className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded hover:bg-green-600"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleResponse(req.id, false)}
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

export default SwapRequests;