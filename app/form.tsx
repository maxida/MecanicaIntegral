import NumberInput from '@/components/NumberInput';
import PriceInput from '@/components/PriceInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useLayoutEffect } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

import { BRAND_TRUCK, DATA_ITEMS, formatNumber, parseInputToNumber } from '../constants';
import { clearFormData, saveInvoiceData } from '../redux/slices/invoiceSlice';
import { FormData, RootStackParamList } from '../types';

const FormScreen = () => {
  const route = useRoute<any>();
  // Recuperamos el tipo de factura si viene como parámetro (A, B, C, M)
  const tipoFactura = route.params?.tipoFactura || null;

  const [formData, setFormData] = useState<FormData>({
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    companyName: 'Mecanica Integral Tucumán',
    companyAddress: 'Los Aguirres',
    companyNIF: '20-35789965-5',
    companyPhone: '3584014717',
    companyEmail: 'mecanicaIntegral@gmail.com',
    validityDays: '30',
    items: [{ description: '', units: 0, price: 0, total: 0 }],
    subtotal: 0,
    discount: 0,
    taxRate: 21,
    total: 0,
    // Campos adicionales para bindear inputs
    Teléfono: '',
    Email: '',
    Marca: '',
    Modelo: '',
    Patente: '',
    Ndemotorchasis: '',
    engineOrChassisNumberDate: ''
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  // Controlamos la selección de item por índice para que cada fila tenga su propio picker lógico si es necesario
  // (Simplificado: usamos estado local temporal, aunque tu lógica original usaba selectedItem global)
  const [selectedItemCategory, setSelectedItemCategory] = useState<{[key:number]: string}>({});
  
  const [errors, setErrors] = useState<{ patente?: string }>({});
  const dispatch = useDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const flagConFactura = useSelector((state: any) => state.invoice.flagConFactura);

  // --- LOGIC HANDLERS (Mantenidos) ---
  const handleChange = <T extends keyof FormData>(name: T, value: FormData[T]) => {
    const newData = { ...formData, [name]: value };
    if (name === 'discount' || name === 'taxRate') {
      const { subtotal, totalWithTax } = calculateTotals(newData);
      newData.subtotal = subtotal;
      newData.total = totalWithTax;
    }
    setFormData(newData);
  };

  const handleItemChange = (index: number, name: string, value: string | number) => {
    // Si cambia la categoría del item (El primer picker)
    if (name === 'ItemCategory') {
      setSelectedItemCategory(prev => ({...prev, [index]: value.toString()}));
      return; 
    }

    const newItems = [...formData.items];
    // @ts-ignore
    newItems[index] = { ...newItems[index], [name]: value };

    const units = typeof newItems[index].units === 'number' ? newItems[index].units : 0;
    const price = typeof newItems[index].price === 'number' ? newItems[index].price : 0;
    newItems[index].total = parseFloat((units * price).toFixed(2));

    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', units: 0, price: 0, total: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = (data = formData) => {
    const subtotal = parseFloat(data.items.reduce((sum, item) => sum + (item?.total || 0), 0).toFixed(2));
    const discountPercentage = data.discount || 0;
    const discountAmount = parseFloat((subtotal * discountPercentage / 100).toFixed(2));
    const taxRate = data.taxRate || 21;
    const totalBeforeTax = parseFloat((subtotal - discountAmount).toFixed(2));
    const totalWithTax = parseFloat((totalBeforeTax * (1 + taxRate / 100)).toFixed(2));
    return { subtotal, discountAmount, totalBeforeTax, totalWithTax };
  };

  const handleSubmit = () => {
    if (!formData.Patente?.trim()) {
      setErrors({ patente: "La patente es obligatoria" });
      Alert.alert("Atención", "Por favor ingrese la patente del vehículo.");
      return;
    }
    setErrors({});
    const { subtotal, discountAmount, totalWithTax } = calculateTotals();
    const invoiceData = { ...formData, subtotal, total: totalWithTax, discount: discountAmount, tipoFactura }; // Guardamos tipoFactura
    dispatch(saveInvoiceData(invoiceData));
    navigation.navigate('preview');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({
        ...formData,
        engineOrChassisNumberDate: selectedDate.toISOString().split('T')[0]
      });
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, gestureEnabled: false });
    return () => { dispatch(clearFormData()); };
  }, [navigation, dispatch]);

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={['#000000', '#121212']} style={styles.gradient}>
        
        {/* HEADER CON SAFE AREA */}
        <View style={styles.headerWrapper}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{alignItems: 'center'}}>
                    <Text style={styles.headerTitle}>
                        {flagConFactura ? `Nueva Factura ${tipoFactura ? '"'+tipoFactura+'"' : ''}` : 'Nuevo Presupuesto'}
                    </Text>
                    <Text style={styles.headerSubtitle}>Complete los datos requeridos</Text>
                </View>
                <View style={{width: 24}} /> 
            </View>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>

            {/* --- SECCIÓN 1: CLIENTE --- */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <MaterialIcons name="person" size={20} color="#FF4C4C" />
                    <Text style={styles.cardTitle}>Datos del Cliente</Text>
                </View>
                
                <View style={styles.inputGroup}>
                    <MaterialIcons name="badge" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Apellido y Nombre"
                        placeholderTextColor="#666"
                        value={formData.clientName}
                        onChangeText={(text) => handleChange('clientName', text)}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, {flex: 1, marginRight: 10}]}>
                        <MaterialIcons name="phone" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Teléfono"
                            placeholderTextColor="#666"
                            keyboardType="phone-pad"
                            value={formData.Teléfono}
                            onChangeText={(text) => handleChange('Teléfono', text)}
                        />
                    </View>
                    <View style={[styles.inputGroup, {flex: 1}]}>
                        <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#666"
                            keyboardType="email-address"
                            value={formData.Email}
                            onChangeText={(text) => handleChange('Email', text)}
                        />
                    </View>
                </View>
            </View>

            {/* --- SECCIÓN 2: VEHÍCULO --- */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <FontAwesome5 name="truck" size={18} color="#FF4C4C" />
                    <Text style={styles.cardTitle}>Datos del Vehículo</Text>
                </View>

                {/* Picker Marca */}
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={formData.Marca}
                        style={styles.picker}
                        dropdownIconColor="#fff"
                        onValueChange={(itemValue) => handleChange('Marca', itemValue)}
                        mode='dropdown'
                    >
                        <Picker.Item label="Seleccione Marca..." value="" style={{color: '#aaa'}} />
                        {BRAND_TRUCK.map((brand) => (
                            <Picker.Item key={brand} label={brand} value={brand} style={{color: '#000'}} />
                        ))}
                    </Picker>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, {flex: 1, marginRight: 10}]}>
                        <TextInput
                            style={styles.inputNoIcon}
                            placeholder="Modelo"
                            placeholderTextColor="#666"
                            value={formData.Modelo}
                            onChangeText={(text) => handleChange('Modelo', text)}
                        />
                    </View>
                    <View style={[styles.inputGroup, {flex: 1}]}>
                         <TextInput
                            style={[styles.inputNoIcon, errors.patente && styles.inputError]}
                            placeholder="Patente *"
                            placeholderTextColor="#666"
                            value={formData.Patente}
                            autoCapitalize="characters"
                            onChangeText={(text) => {
                                handleChange('Patente', text);
                                if (errors.patente) setErrors({});
                            }}
                        />
                    </View>
                </View>
                {errors.patente && <Text style={styles.errorText}>{errors.patente}</Text>}

                <View style={styles.inputGroup}>
                    <MaterialIcons name="qr-code" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="N° Motor / Chasis"
                        placeholderTextColor="#666"
                        value={formData.Ndemotorchasis}
                        onChangeText={(text) => handleChange('Ndemotorchasis', text)}
                    />
                </View>

                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                    <MaterialIcons name="calendar-today" size={20} color="#FF4C4C" />
                    <Text style={styles.dateText}>
                        {formData.engineOrChassisNumberDate ? formData.engineOrChassisNumberDate : 'Fecha de Ingreso'}
                    </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(formData.engineOrChassisNumberDate || new Date())}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}
            </View>

            {/* --- SECCIÓN 3: ÍTEMS --- */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <MaterialIcons name="playlist-add" size={24} color="#FF4C4C" />
                    <Text style={styles.cardTitle}>Detalle del Trabajo</Text>
                </View>

                {formData.items?.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                        {/* Header del Item (Nro y Botón Eliminar) */}
                        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 5}}>
                            <Text style={styles.itemIndex}>#{index + 1}</Text>
                            <TouchableOpacity onPress={() => removeItem(index)}>
                                <MaterialIcons name="delete-outline" size={22} color="#800000" />
                            </TouchableOpacity>
                        </View>

                        {/* Pickers */}
                        <View style={styles.pickerWrapperSmall}>
                            <Picker
                                selectedValue={selectedItemCategory[index] || ""}
                                style={styles.pickerSmall}
                                dropdownIconColor="#fff"
                                onValueChange={(val) => handleItemChange(index, 'ItemCategory', val)}
                            >
                                <Picker.Item label="Categoría..." value="" style={{color:'#888'}}/>
                                {Object.keys(DATA_ITEMS).map((k) => (
                                    <Picker.Item key={k} label={k} value={k} style={{color:'#000'}} />
                                ))}
                            </Picker>
                        </View>

                        {/* Mostrar segundo picker solo si hay categoría */}
                        {selectedItemCategory[index] && DATA_ITEMS[selectedItemCategory[index]] && (
                            <View style={styles.pickerWrapperSmall}>
                                <Picker
                                    selectedValue={item.description}
                                    style={styles.pickerSmall}
                                    dropdownIconColor="#fff"
                                    onValueChange={(val) => handleItemChange(index, 'description', val)}
                                >
                                    <Picker.Item label="Servicio..." value="" style={{color:'#888'}} />
                                    {DATA_ITEMS[selectedItemCategory[index]].map((brand: string) => (
                                        <Picker.Item key={brand} label={brand} value={brand} style={{color:'#000'}} />
                                    ))}
                                </Picker>
                            </View>
                        )}

                        {/* Unidades y Precio */}
                        <View style={styles.row}>
                            <View style={{flex: 1, marginRight: 10}}>
                                <Text style={styles.miniLabel}>Cant.</Text>
                                <NumberInput
                                    value={item.units}
                                    onChangeText={(value) => handleItemChange(index, 'units', parseInt(value, 10) || 0)}
                                    style={styles.inputMini}
                                    decimalPlaces={0}
                                    placeholder="0"
                                />
                            </View>
                            <View style={{flex: 1.5}}>
                                <Text style={styles.miniLabel}>Precio Unit.</Text>
                                <PriceInput
                                    value={item.price}
                                    onChangeText={(value) => handleItemChange(index, 'price', value)}
                                    decimalPlaces={0}
                                    style={styles.inputMini}
                                />
                            </View>
                        </View>

                        <Text style={styles.itemTotal}>
                           Subtotal: $ {formatNumber(item.total)}
                        </Text>
                    </View>
                ))}

                <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
                    <MaterialIcons name="add" size={20} color="#fff" />
                    <Text style={styles.addItemText}>Agregar Ítem</Text>
                </TouchableOpacity>
            </View>

            {/* --- SECCIÓN 4: TOTALES --- */}
            <View style={[styles.card, {borderColor: '#FF4C4C', borderWidth: 1}]}>
                <View style={styles.row}>
                    <Text style={styles.totalLabel}>Descuento (%):</Text>
                    <NumberInput
                        style={[styles.inputMini, {width: 80, textAlign: 'center'}]}
                        value={formData.discount}
                        onChangeText={(value) => handleChange('discount', Math.min(parseFloat(value) || 0, 100))}
                        decimalPlaces={0}
                        placeholder="0"
                    />
                </View>

                {flagConFactura && (
                     <View style={[styles.row, {marginTop: 10}]}>
                        <Text style={styles.totalLabel}>IVA (%):</Text>
                        <TextInput
                            style={[styles.inputMini, {width: 80, textAlign: 'center'}]}
                            keyboardType="numeric"
                            value={formData.taxRate.toString()}
                            onChangeText={(text) => handleChange('taxRate', parseInputToNumber(text))}
                        />
                    </View>
                )}

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                    <Text style={styles.totalLabelSmall}>Subtotal:</Text>
                    <Text style={styles.totalValueSmall}>$ {formatNumber(calculateTotals().subtotal)}</Text>
                </View>
                
                {flagConFactura && (
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabelSmall}>Total c/ IVA:</Text>
                        <Text style={styles.totalValueBig}>$ {formatNumber(calculateTotals().totalWithTax)}</Text>
                    </View>
                )}
                
                {!flagConFactura && (
                     <View style={styles.totalRow}>
                        <Text style={styles.totalLabelSmall}>Total Final:</Text>
                        <Text style={styles.totalValueBig}>$ {formatNumber(calculateTotals().totalBeforeTax)}</Text>
                    </View>
                )}

            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <LinearGradient
                    colors={['#FF4C4C', '#D32F2F']}
                    style={styles.gradientBtn}
                >
                    <Text style={styles.submitButtonText}>GENERAR COMPROBANTE</Text>
                    <MaterialIcons name="arrow-forward" size={24} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>

            <View style={{height: 40}} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  gradient: { flex: 1 },
  // HEADER
  headerWrapper: {
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1, 
    borderBottomColor: '#333',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 0, 
  },
  header: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { padding: 5 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#888', fontSize: 12 },

  scrollContainer: { padding: 16 },

  // CARDS
  card: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 10 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  
  // INPUTS
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', borderRadius: 8, borderWidth: 1, borderColor: '#333', marginBottom: 12, paddingHorizontal: 10 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', paddingVertical: 12, fontSize: 15 },
  inputNoIcon: { flex: 1, backgroundColor: '#121212', borderRadius: 8, borderWidth: 1, borderColor: '#333', color: '#fff', paddingVertical: 12, paddingHorizontal: 15, marginBottom: 12, fontSize: 15 },
  inputError: { borderColor: '#FF4C4C' },
  errorText: { color: '#FF4C4C', fontSize: 12, marginTop: -8, marginBottom: 10 },
  
  // PICKER
  pickerWrapper: { 
    backgroundColor: '#121212', 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#333', 
    marginBottom: 12, 
    overflow: 'hidden',
    height: 55, // Altura cómoda para el picker grande
    justifyContent: 'center'
  },
  picker: { color: '#fff', height: 55 },
  
  row: { flexDirection: 'row', alignItems: 'center' },
  
  // DATE
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  dateText: { color: '#fff', marginLeft: 10, fontSize: 15 },

  // ITEMS
  itemRow: { backgroundColor: '#141414', padding: 12, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#FF4C4C' },
  itemIndex: { color: '#FF4C4C', fontWeight: 'bold' },
  pickerWrapperSmall: { backgroundColor: '#222', borderRadius: 6, borderWidth: 1, borderColor: '#444', marginBottom: 8, height: 50, justifyContent: 'center' },
  pickerSmall: { color: '#fff', height: 50 },
  miniLabel: { color: '#888', fontSize: 10, marginBottom: 2 },
  inputMini: { backgroundColor: '#222', color: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#444', padding: 8, fontSize: 14, textAlign: 'right' },
  itemTotal: { color: '#fff', fontWeight: 'bold', textAlign: 'right', marginTop: 8, fontSize: 15 },
  
  addItemBtn: { flexDirection: 'row', backgroundColor: '#333', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  addItemText: { color: '#fff', marginLeft: 5, fontWeight: '600' },

  // TOTALS
  totalLabel: { color: '#ccc', fontSize: 14, marginRight: 10, flex: 1 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 15 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabelSmall: { color: '#aaa', fontSize: 16 },
  totalValueSmall: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  totalValueBig: { color: '#FF4C4C', fontSize: 22, fontWeight: 'bold' },

  // SUBMIT
  submitButton: { borderRadius: 12, overflow: 'hidden', marginTop: 10, elevation: 5 },
  gradientBtn: { paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
});

export default FormScreen;