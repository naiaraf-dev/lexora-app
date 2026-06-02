import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { ModalExptes } from '../modal-exptes/modal-exptes';
import { Expediente } from '../expediente-table/expediente-table';
import * as XLSXStyle from 'xlsx-js-style';

@Component({
  selector: 'app-expediente-header',
  standalone: true,
  imports: [PrimaryBtn, ModalExptes],
  templateUrl: './expediente-header.html',
})
export class ExpedienteHeader {
  @Input() expedientesFiltrados: Expediente[] = [];
  @Output() expedienteCreado = new EventEmitter<unknown>();

  modalAbierto = false;

  abrirModal(): void { this.modalAbierto = true; }
  cerrarModal(): void { this.modalAbierto = false; }

  onGuardar(expediente: unknown): void {
    this.modalAbierto = false;
    this.expedienteCreado.emit(expediente);
  }

  exportar(): void {
    const headers = ['N° Expediente', 'N° Causa', 'Carátula', 'Cliente', 'Área', 'Tipo', 'Estado', 'Fecha Inicio', 'Últ. Actualización'];

    const filaHeaders = headers.map(h => ({
      v: h,
      t: 's',
      s: {
        fill: { fgColor: { rgb: '6366F1' } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top:    { style: 'thin', color: { rgb: 'FFFFFF' } },
          bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
          left:   { style: 'thin', color: { rgb: 'FFFFFF' } },
          right:  { style: 'thin', color: { rgb: 'FFFFFF' } },
        }
      }
    }));

    const filasDatos = this.expedientesFiltrados.map(e => [
      e.numero,
      e.causa,
      e.caratula,
      e.clienteNombre,
      e.area,
      e.tipoLabel,
      e.estado,
      new Date(e.fechaInicio).toLocaleDateString('es-AR'),
      new Date(e.ultimaActualizacion).toLocaleDateString('es-AR'),
    ].map(v => ({
      v: v ?? '',
      t: 's',
      s: {
        alignment: { vertical: 'center' },
        border: {
          top:    { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left:   { style: 'thin', color: { rgb: 'E2E8F0' } },
          right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
        }
      }
    })));

    const ws = XLSXStyle.utils.aoa_to_sheet([filaHeaders, ...filasDatos]);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 18 }, // N° Expediente
      { wch: 14 }, // N° Causa
      { wch: 45 }, // Carátula
      { wch: 25 }, // Cliente
      { wch: 14 }, // Área
      { wch: 28 }, // Tipo
      { wch: 13 }, // Estado
      { wch: 14 }, // Fecha Inicio
      { wch: 18 }, // Últ. Actualización
    ];

    // Alto del header
    ws['!rows'] = [{ hpt: 22 }];

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Expedientes');
    XLSXStyle.writeFile(wb, `expedientes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}