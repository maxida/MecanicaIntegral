Data model for MecanicaIntegral (MIT)

Collections

1) users
- uid: string (doc id)
- role: "santiago" | "camion" | "mecanico" | "oasis"
- name: string
- email: string
- phone?: string
- truckId?: string (for role "camion", reference to `trucks`)
- profile: object (extra role-specific fields)
- createdAt, updatedAt: timestamp

2) trucks (optional separate collection)
- id: string (doc id)
- plate: string
- model: string
- ownerUserId: string (ref to users)
- driverName: string
- technicalData: object (e.g., km, lastMaintenance)
- createdAt, updatedAt

3) turnos
- id: string
- type: "mantenimiento" | "reparacion_general" | "asistencia_24hs"
- status: "por_hacer" | "haciendo" | "terminado"
- createdBy: userId (camion)
- truckId: string
- assignedTo: userId | null (mecanico)
- priority?: "baja" | "media" | "alta"
- description: string
- attachments?: [url]
- eta?: timestamp
- createdAt, updatedAt

Subcollections:
- turnos/{turnoId}/checklist
  - itemId: string
  - label: string
  - done: boolean
  - notes?: string
  - images?: [url]
  - checkedBy?: userId
  - checkedAt?: timestamp

- turnos/{turnoId}/updates  (realtime log updates)
  - message, authorId, timestamp, progressPercent?

4) facturas
- id: string
- invoiceType: "A" | "B" | "C" | "M"
- number: string
- date: timestamp
- client: { name, cuit, address }
- items: [{description, qty, unitPrice, ivaRate}]
- subtotal, taxes, total
- createdBy: userId (Santiago)
- pdfUrl?: string
- createdAt, updatedAt

Access patterns
- Santiago (role: santiago): full read/write on `turnos`, `facturas`, `users` and `trucks`. Puede mover turnos entre estados y asignar `assignedTo`.
- Camion (role: camion): puede ver y crear `turnos` para su `truckId`, ver updates en tiempo real. Puede ver sus propias facturas cuando correspondan.
- Mecanico (role: mecanico): puede leer `turnos` con status == "haciendo" y/o donde `assignedTo` == su uid; puede crear/editar `turnos/{id}/checklist` y escribir en `turnos/{id}/updates`, y marcar `terminado` si autorizado.
- Oasis (role: oasis): acceso de solo lectura a `turnos` y `facturas` históricas, con posibilidad de consulta y filtros.

Notes
- Use Firestore server timestamps for createdAt/updatedAt.
- Use security rules to enforce role-based access and field validation.
- Consider Cloud Functions for heavy ops (PDF generation, invoice numbering, notifications).
