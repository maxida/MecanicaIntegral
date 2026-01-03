import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Turno } from '@/redux/slices/turnosSlice';
import { obtenerTurnos } from '@/services/turnosService';
import { RootState } from '@/redux/store';

interface DiaCalendario {
  fecha: string;
  dia: number;
  mes: number;
  año: number;
  estesMes: boolean;
}

interface TurnoConDatos extends Turno {
  nombreCliente?: string;
  nombreMecanico?: string;
}

const CalendarioTurnos = () => {
  const [mesActual, setMesActual] = useState(new Date());
  const [dias, setDias] = useState<DiaCalendario[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [turnos, setTurnos] = useState<TurnoConDatos[]>([]);
  const [loading, setLoading] = useState(false);
  const [turnosDelDia, setTurnosDelDia] = useState<TurnoConDatos[]>([]);

  // Cargar turnos desde Firebase
  useEffect(() => {
    cargarTurnos();
  }, []);

  const cargarTurnos = async () => {
    setLoading(true);
    try {
      const data = await obtenerTurnos();
      setTurnos(data);
      // Seleccionar hoy por defecto
      const hoy = new Date().toISOString().split('T')[0];
      setDiaSeleccionado(hoy);
      filtrarTurnosPorDia(hoy, data);
    } catch (error) {
      console.error('Error cargando turnos:', error);
      Alert.alert('Error', 'No se pudieron cargar los turnos');
    } finally {
      setLoading(false);
    }
  };

  // Generar días del calendario
  useEffect(() => {
    generarCalendario();
  }, [mesActual]);

  const generarCalendario = () => {
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    
    // Primer día del mes y cantidad de días
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasDelMes = ultimoDia.getDate();
    const diaInicio = primerDia.getDay();
    
    const diasArray: DiaCalendario[] = [];
    
    // Días del mes anterior
    const diasMesAnterior = new Date(año, mes, 0).getDate();
    for (let i = diaInicio - 1; i >= 0; i--) {
      diasArray.push({
        fecha: `${año}-${(mes).toString().padStart(2, '0')}-${(diasMesAnterior - i).toString().padStart(2, '0')}`,
        dia: diasMesAnterior - i,
        mes: mes,
        año: año,
        estesMes: false,
      });
    }
    
    // Días del mes actual
    for (let dia = 1; dia <= diasDelMes; dia++) {
      diasArray.push({
        fecha: `${año}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`,
        dia,
        mes: mes + 1,
        año,
        estesMes: true,
      });
    }
    
    // Días del mes siguiente
    const diasRestantes = 42 - diasArray.length;
    for (let dia = 1; dia <= diasRestantes; dia++) {
      diasArray.push({
        fecha: `${año}-${(mes + 2).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`,
        dia,
        mes: mes + 2,
        año: año,
        estesMes: false,
      });
    }
    
    setDias(diasArray);
  };

  const filtrarTurnosPorDia = (fecha: string, turnosData: TurnoConDatos[]) => {
    const turnosFiltrados = turnosData.filter(t => t.fechaReparacion === fecha);
    setTurnosDelDia(turnosFiltrados);
  };

  const handleDiaClick = (dia: DiaCalendario) => {
    if (dia.estesMes) {
      setDiaSeleccionado(dia.fecha);
      filtrarTurnosPorDia(dia.fecha, turnos);
    }
  };

  const getMesNombre = () => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mesActual.getMonth()];
  };

  const getColorEstado = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#60A5FA';
      case 'proceso':
        return '#FACC15';
      case 'completado':
        return '#4ADE80';
      default:
        return '#888';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1))}>
            <MaterialIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getMesNombre()} {mesActual.getFullYear()}</Text>
          <TouchableOpacity onPress={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1))}>
            <MaterialIcons name="chevron-right" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Días de la semana */}
          <View style={styles.weekDaysContainer}>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'].map((dia, idx) => (
              <Text key={idx} style={styles.weekDayLabel}>{dia}</Text>
            ))}
          </View>

          {/* Grid de días */}
          <View style={styles.daysGrid}>
            {dias.map((dia, idx) => {
              const turnosPorDia = turnos.filter(t => t.fechaReparacion === dia.fecha).length;
              const isSelected = diaSeleccionado === dia.fecha;
              const esHoy = new Date().toISOString().split('T')[0] === dia.fecha;

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleDiaClick(dia)}
                  style={[
                    styles.dayButton,
                    !dia.estesMes && styles.dayButtonOtroMes,
                    isSelected && styles.dayButtonSelected,
                    esHoy && styles.dayButtonHoy,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayNumber,
                    !dia.estesMes && styles.dayNumberOtroMes,
                    isSelected && styles.dayNumberSelected,
                  ]}>
                    {dia.dia}
                  </Text>
                  {turnosPorDia > 0 && (
                    <View style={[styles.turnoIndicator, isSelected && styles.turnoIndicatorSelected]}>
                      <Text style={styles.turnoIndicatorText}>{turnosPorDia}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Turnos del día seleccionado */}
          {diaSeleccionado && (
            <View style={styles.turnosSection}>
              <Text style={styles.turnosSectionTitle}>
                Turnos del {new Date(diaSeleccionado).toLocaleDateString('es-AR')}
              </Text>

              {loading ? (
                <ActivityIndicator size="large" color="#60A5FA" />
              ) : turnosDelDia.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="event-busy" size={48} color="#666" />
                  <Text style={styles.emptyStateText}>Sin turnos programados</Text>
                </View>
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={turnosDelDia}
                  keyExtractor={(item) => item.id || Math.random().toString()}
                  renderItem={({ item }) => (
                    <View style={styles.turnoCard}>
                      <View style={[styles.turnoEstadoIndicator, { backgroundColor: getColorEstado(item.estado) }]} />
                      <View style={styles.turnoContent}>
                        <Text style={styles.turnoPatente}>{item.numeroPatente}</Text>
                        <Text style={styles.turnoDescripcion}>{item.descripcion}</Text>
                        <View style={styles.turnoFooter}>
                          <MaterialIcons name="schedule" size={14} color="#888" />
                          <Text style={styles.turnoHora}>{item.horaReparacion}</Text>
                        </View>
                      </View>
                      <View style={[styles.turnoEstadoBadge, { backgroundColor: `${getColorEstado(item.estado)}15` }]}>
                        <Text style={[styles.turnoEstadoText, { color: getColorEstado(item.estado) }]}>
                          {item.estado}
                        </Text>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#888',
    fontWeight: '600',
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dayButtonOtroMes: {
    opacity: 0.3,
  },
  dayButtonSelected: {
    backgroundColor: '#FF4C4C',
  },
  dayButtonHoy: {
    borderWidth: 2,
    borderColor: '#60A5FA',
  },
  dayNumber: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  dayNumberOtroMes: {
    color: '#555',
  },
  dayNumberSelected: {
    color: '#fff',
  },
  turnoIndicator: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#FF4C4C',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnoIndicatorSelected: {
    backgroundColor: '#fff',
  },
  turnoIndicatorText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  turnosSection: {
    marginTop: 20,
  },
  turnosSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  turnoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  turnoEstadoIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 4,
    marginRight: 12,
  },
  turnoContent: {
    flex: 1,
  },
  turnoPatente: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  turnoDescripcion: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  turnoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  turnoHora: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  turnoEstadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  turnoEstadoText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default CalendarioTurnos;
