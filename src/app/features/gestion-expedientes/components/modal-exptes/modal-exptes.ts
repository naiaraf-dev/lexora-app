import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';

interface ExpedienteForm {
  nroCausa: string;
  caratula: string;
  area: string;
  tipo: string;
  estado: string;
  clienteIds: string[];
}

interface Cliente {
  id: string;
  nombre: string;
  cuit: string;
}

@Component({
  selector: 'app-modal-exptes',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal],
  templateUrl: './modal-exptes.html',
})
export class ModalExptes implements OnInit {
  @Input() open = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardarExpediente = new EventEmitter<ExpedienteForm & { nroInterno: string }>();

  numeroGenerado = '';
  clienteSearch = '';

  form: ExpedienteForm = this.formVacio();

  // TODO: reemplazar por ClientesService.getAll()
  clientes: Cliente[] = [
    { id: '1', nombre: 'Acme S.A.', cuit: '30-12345678-9' },
    { id: '2', nombre: 'García, Juan Carlos', cuit: '20-28765432-1' },
    { id: '3', nombre: 'López Hnos. S.R.L.', cuit: '30-87654321-0' },
    { id: '4', nombre: 'Rodríguez, María Elena', cuit: '27-34567890-3' },
    { id: '5', nombre: 'Constructora del Sur S.A.', cuit: '30-99887766-5' },
  ];

  areaOptions = [
    { value: 'CIVIL', label: 'Civil' },
    { value: 'LABORAL', label: 'Laboral' },
    { value: 'PENAL', label: 'Penal' },
    { value: 'COMERCIAL', label: 'Comercial' },
    { value: 'FAMILIA', label: 'Familia' },
    { value: 'ADMINISTRATIVO', label: 'Administrativo' },
    { value: 'TRIBUTARIO', label: 'Tributario' },
    { value: 'PREVISIONAL', label: 'Previsional' },
    { value: 'INMOBILIARIO', label: 'Inmobiliario' },
    { value: 'SOCIETARIO', label: 'Societario' },
  ];

  tipoOptions = [
    { value: 'OFICIO', label: 'Oficios' },
    { value: 'CARTA_DOC', label: 'Carta Documento' },
    { value: 'MEDIACION', label: 'Mediaciones' },
    { value: 'BENEFICIO_LITIGAR', label: 'Beneficios de litigar sin gastos' },
    { value: 'COBRO_CANON', label: 'Cobro de Cánones' },
    { value: 'RECLAMO_CONTRAT', label: 'Reclamo a Contratista / Proveedor' },
    { value: 'LANZAMIENTO', label: 'Lanzamientos' },
    { value: 'RECUPERO', label: 'Recuperos' },
    { value: 'EJECUCION_GAR', label: 'Ejecución de Pólizas' },
    { value: 'DEMANDA_CIVIL', label: 'Demanda Civil' },
    { value: 'DEMANDA_LABORAL', label: 'Demanda Laboral' },
    { value: 'DEFENSA_CIVIL', label: 'Defensas Civiles' },
    { value: 'SECLOS', label: 'SECLO' },
    { value: 'CONSIGNACION', label: 'Consignaciones' },
    { value: 'DESAFUERO', label: 'Desafueros' },
    { value: 'QUERELLA', label: 'Querellas' },
    { value: 'DEFENSA_PENAL', label: 'Defensas Penales' },
    { value: 'CARTA_SUCESO', label: 'Cartas Suceso' },
    { value: 'OTRAS', label: 'Otras presentaciones / gestiones' },
  ];

  estadoOptions = [
    { value: 'EN_TRAMITE', label: 'En trámite', dot: 'bg-info' },
    { value: 'FINALIZADO', label: 'Finalizado', dot: 'bg-success' },
    { value: 'ARCHIVADO', label: 'Archivado', dot: 'bg-gray-400' },
  ];

  ngOnInit(): void {
    this.numeroGenerado = this.generarNumeroInterno();
  }

  estadoBtnClass(value: string): string {
    const base = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer';
    return this.form.estado === value
      ? `${base} border-primary bg-primary/10 text-primary`
      : `${base} border-gray-200 bg-background text-gray-500 hover:border-gray-300`;
  }

  clientesFiltrados(): Cliente[] {
    const q = this.clienteSearch.toLowerCase().trim();
    if (!q) return this.clientes;
    return this.clientes.filter(
      c => c.nombre.toLowerCase().includes(q) || c.cuit.includes(q)
    );
  }

  clienteSeleccionado(id: string): boolean {
    return this.form.clienteIds.includes(id);
  }

  toggleCliente(id: string): void {
    this.form.clienteIds = this.form.clienteIds.includes(id) ? [] : [id];
  }

  nombreCliente(id: string): string {
    return this.clientes.find(c => c.id === id)?.nombre ?? id;
  }

  formValido(): boolean {
    return !!(this.form.caratula.trim() && this.form.area && this.form.tipo);
  }

  guardar(): void {
    if (!this.formValido()) return;
    this.guardarExpediente.emit({ ...this.form, nroInterno: this.numeroGenerado });
    this.form = this.formVacio();
    this.clienteSearch = '';
    this.numeroGenerado = this.generarNumeroInterno();
    this.cerrar.emit();
  }

  onCerrar(): void {
    this.form = this.formVacio();
    this.clienteSearch = '';
    this.numeroGenerado = this.generarNumeroInterno();
    this.cerrar.emit();
  }

  private generarNumeroInterno(): string {
    const anio = new Date().getFullYear();
    // TODO: reemplazar el correlativo por el valor real del backend
    const correlativo = String(Math.floor(Math.random() * 9000) + 1000);
    return `EXP-${anio}-${correlativo}`;
  }

  private formVacio(): ExpedienteForm {
    return {
      nroCausa: '',
      caratula: '',
      area: '',
      tipo: '',
      estado: 'EN_TRAMITE',
      clienteIds: [],
    };
  }
}
