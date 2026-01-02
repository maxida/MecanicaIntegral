import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  login: undefined;
  home: undefined;
  form: undefined;
  preview: undefined;
  checklist: undefined;
  'checklist/index':undefined;
  'checklist/checklistitems': undefined;
};

export type FormData = {
  clientName: string;
  date: string;
  invoiceNumber: string;
  companyName: string;
  companyAddress: string;
  companyNIF: string;
  companyPhone: string;
  companyEmail: string;
  validityDays: string;
  items: Array<{
    description: string;
    units: number;
    price: number;
    total: number;
    Item?: string;
  }>;
  subtotal: number;
  discount: number;
  taxRate: number;
  total: number;
  Teléfono?: string;
  Email?: string;
  Marca?: string;
  Modelo?: string;
  Patente?: string;
  Ndemotorchasis?: string;
  engineOrChassisNumberDate?: string;
};

export interface InvoiceItem {
  description: string;
  units: number;
  price: number;
  total: number;
  Item?: string;
  Descripción?: string;
}

export interface InvoiceData {
  clientName: string;
  date: string;
  invoiceNumber: string;
  companyName: string;
  companyAddress: string;
  companyNIF: string;
  companyPhone: string;
  companyEmail: string;
  validityDays: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  total: number;
  Teléfono?: string;
  Email?: string;
  Marca?: string;
  Modelo?: string;
  Patente?: string;
  Ndemotorchasis?: string;
  engineOrChassisNumberDate?: string;
}

export type DataItemsType = {
  [key: string]: string[];
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type FormScreenRouteParams = {
  flagConFactura: boolean;
};