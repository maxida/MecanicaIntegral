import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import CalendarioTurnos from '@/components/CalendarioTurnos';
import AsignacionMecanicos from '@/components/AsignacionMecanicos';

export default function TurnosScreen() {
  const rol = useSelector((state: RootState) => state.login.rol);

  // Admin ve la asignación de mecánicos
  if (rol === 'admin') {
    return <AsignacionMecanicos />;
  }

  // Supervisor y Mecánico ven el calendario
  if (rol === 'supervisor' || rol === 'mecanico') {
    return <CalendarioTurnos />;
  }

  // Cliente no tiene acceso
  return null;
}