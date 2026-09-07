import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModal } from '../../../../shared/components/ui-modal/ui-modal';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-modal-prevision-alta-global',
  standalone: true,
  imports: [CommonModule, FormsModule, UiModal, UiInput, UiSelect, UiDateInput, PrimaryBtn],
  templateUrl: './modal-prevision-alta.html',
})
export class ModalPrevisionAltaGlobal {
  @Input() open = false;
  @Output() cerrar  = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<any>();

  guardando = false;
  calculado = false;
  paso: 1 | 2 = 1; // 1 = buscar expediente, 2 = datos previsión

  // Búsqueda de expediente
  busqueda = '';
  expedienteSeleccionado: any = null;

  // 🔴 MOCK — reemplazar por llamada al servicio ExpedientesService.listar()
  expedientesMock = [
    { id: 1, numero: 'EXP-2026-00123', cliente: 'Empresa Constructora S.A.', tipo: 'Demanda Civil',   area: 'Civil',    caratula: 'Empresa Constructora S.A. c/ Provincia s/ daños y perjuicios' },
    { id: 2, numero: 'EXP-2026-00087', cliente: 'García, Juan Carlos',        tipo: 'Demanda Laboral', area: 'Laboral',  caratula: 'García Juan Carlos c/ Metalúrgica del Sur s/ despido'          },
    { id: 3, numero: 'EXP-2025-00412', cliente: 'López Hnos. S.R.L.',         tipo: 'Ejecución',       area: 'Comercial',caratula: 'López Hnos. S.R.L. c/ Distribuidora Norte s/ cobro'            },
    { id: 4, numero: 'EXP-2025-00198', cliente: 'Rodríguez, María Elena',     tipo: 'Demanda Civil',   area: 'Civil',    caratula: 'Rodríguez María Elena c/ Hospital s/ mala praxis'              },
    { id: 5, numero: 'EXP-2024-00531', cliente: 'Acme S.A.',                  tipo: 'Demanda Civil',   area: 'Civil',    caratula: 'Acme S.A. c/ Municipio s/ daños'                               },
  ];

  get expedientesFiltrados() {
    if (!this.busqueda.trim()) return this.expedientesMock;
    const q = this.busqueda.toLowerCase();
    return this.expedientesMock.filter(e =>
      e.numero.toLowerCase().includes(q) ||
      e.cliente.toLowerCase().includes(q) ||
      e.caratula.toLowerCase().includes(q)
    );
  }

  seleccionarExpediente(exp: any) {
    this.expedienteSeleccionado = exp;
  }

  continuarAlPaso2() {
    if (!this.expedienteSeleccionado) return;
    this.paso = 2;
  }

  // Datos de la previsión
  modoOptions = [
    { value: 'Activo',      label: 'Activo'      },
    { value: 'Seguimiento', label: 'Seguimiento' },
  ];

  tipoObligacionOptions = [
    { value: 'Sentencia',                label: 'Sentencia'                },
    { value: 'Regulación de honorarios', label: 'Regulación de honorarios' },
    { value: 'Liquidación aprobada',     label: 'Liquidación aprobada'     },
    { value: 'Costas',                   label: 'Costas'                   },
    { value: 'Multa',                    label: 'Multa'                    },
    { value: 'Intereses',                label: 'Intereses'                },
    { value: 'Depósito de queja',        label: 'Depósito de queja'        },
    { value: 'Otro',                     label: 'Otro'                     },
  ];

  fueroOptions = [
    { value: 'Civil / Comercial',              label: 'Civil / Comercial'              },
    { value: 'Laboral',                        label: 'Laboral'                        },
    { value: 'Contencioso Administrativo',     label: 'Contencioso Administrativo'     },
    { value: 'Otro',                           label: 'Otro'                           },
  ];

  obligadoOptions = [
    { value: 'EMPRESA',            label: 'EMPRESA'            },
    { value: 'Estado Nacional',    label: 'Estado Nacional'    },
    { value: 'Ambos',              label: 'Ambos'              },
    { value: 'Tercero/codemandado',label: 'Tercero/codemandado'},
    { value: 'Otro',               label: 'Otro'               },
  ];

  form = {
    modo:                    '',
    tipoObligacion:          '',
    fechaResolucion:         '',
    fechaFirmeza:            '',
    fechaLimitePrevisionar:  '',
    fuero:                   '',
    obligado:                '',
    pagadorEfectivo:         '',
    jurisdiccionPresupuestaria: '',
    ejercicio:               '',
    montoBase:               '',
    observaciones:           '',
  };

  // Ítems de previsión
  conceptoItemOptions = [
    { value: 'Capital',          label: 'Capital'          },
    { value: 'Intereses',        label: 'Intereses'        },
    { value: 'Honorarios',       label: 'Honorarios'       },
    { value: 'IVA',              label: 'IVA'              },
    { value: 'Costas',           label: 'Costas'           },
    { value: 'Multa',            label: 'Multa'            },
    { value: 'Art. 730',         label: 'Art. 730'         },
    { value: 'Depósito de queja',label: 'Depósito de queja'},
    { value: 'Otro',             label: 'Otro'             },
  ];

  items: { concepto: string; monto: string; obligado: string; observaciones: string }[] = [
    { concepto: '', monto: '', obligado: '', observaciones: '' }
  ];

  agregarItem() {
    this.items.push({ concepto: '', monto: '', obligado: '', observaciones: '' });
  }

  eliminarItem(i: number) {
    this.items.splice(i, 1);
  }

  calcular() {
    // 🔴 MOCK — reemplazar por motor de cálculo real
    this.calculado = true;
    toast.success('Cálculo generado correctamente');
  }

  calculo = {
    montoBase:    '$5.000.000',
    actualizacion:'$1.200.000',
    intereses:    '$1.150.000',
    total:        '$7.350.000',
  };

  guardar() {
    if (!this.expedienteSeleccionado) { toast.error('Seleccioná un expediente'); return; }
    if (!this.form.modo || !this.form.tipoObligacion || !this.form.montoBase) {
      toast.error('Completá los campos obligatorios');
      return;
    }
    this.guardando = true;
    // 🔴 MOCK — reemplazar por PrevisionService.crear()
    setTimeout(() => {
      this.guardando = false;
      this.guardado.emit({ expediente: this.expedienteSeleccionado, ...this.form, items: this.items });
      toast.success('Previsión creada correctamente');
      this.cerrarModal();
    }, 800);
  }

  cerrarModal() {
    this.paso = 1;
    this.busqueda = '';
    this.expedienteSeleccionado = null;
    this.form = { modo: '', tipoObligacion: '', fechaResolucion: '', fechaFirmeza: '', fechaLimitePrevisionar: '', fuero: '', obligado: '', pagadorEfectivo: '', jurisdiccionPresupuestaria: '', ejercicio: '', montoBase: '', observaciones: '' };
    this.items = [{ concepto: '', monto: '', obligado: '', observaciones: '' }];
    this.calculado = false;
    this.cerrar.emit();
  }
}