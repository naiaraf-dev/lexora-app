import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn  } from '../../../../shared/components/primary-btn/primary-btn';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-datos-generales',
  standalone: true,
  imports: [ReactiveFormsModule, UiInput, UiSelect, UiDateInput, PrimaryBtn],
  templateUrl: './datos-generales.html',
})
export class DatosGenerales implements OnInit {

  form!: FormGroup;
  private http = inject(HttpClient);
  private cdr  = inject(ChangeDetectorRef);
  private expedienteId!: number;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.expedienteId = Number(this.route.snapshot.parent?.paramMap.get('id'));

    this.form = this.fb.group({
      numero:               [{ value: '', disabled: true }],
      caratula:             ['', Validators.required],
      area:                 ['', Validators.required],
      tipo:                 ['', Validators.required],
      clienteId:            [''],
      rolCliente:           [''],
      estado:               [''],
      descripcion:          [''],
      fuero:                [''],
      juzgado:              [''],
      secretaria:           [''],
      jurisdiccion:         [''],
      causaPJNId:           [''],
      instancia:            [''],
      abogadoResponsable:   [''],
      abogadoSecundario:    [''],
      contraparte:          [''],
      abogadoContraparte:   [''],
      fechaInicio:          [''],
      fechaUltimaActuacion: [''],
      fechaProcesalProximo: [''],
      prioridad:            [''],
      origenCaso:           [''],
    });

    forkJoin({
      expediente: this.http.get<any>(`${environment.apiUrl}/expedientes/${this.expedienteId}`),
      tipos:      this.http.get<any[]>(`${environment.apiUrl}/enums/tipoexpediente`),
      estados:    this.http.get<any[]>(`${environment.apiUrl}/enums/estadoexpediente`),
      prioridades:this.http.get<any[]>(`${environment.apiUrl}/enums/prioridad`),
      roles:      this.http.get<any[]>(`${environment.apiUrl}/enums/rolcliente`),
    }).subscribe({
      next: ({ expediente, tipos, estados, prioridades, roles }) => {
        this.tipoOptions     = tipos.map(t => ({ value: String(t.id), label: t.nombre }));
        this.estadoOptions   = estados.map(e => ({ value: String(e.id), label: e.nombre }));
        this.prioridadOptions= prioridades.map(p => ({ value: String(p.id), label: p.nombre }));
        this.rolOptions      = roles.map(r => ({ value: String(r.id), label: r.nombre }));

        this.form.patchValue({
          numero:               expediente.numeroInterno,
          caratula:             expediente.caratula,
          area:                 expediente.area,
          tipo:                 String(expediente.tipo?.id ?? ''),
          clienteId:            String(expediente.cliente?.id ?? ''),
          estado:               String(expediente.estado?.id ?? ''),
          descripcion:          expediente.descripcion ?? '',
          fuero:                expediente.area ?? '',
          juzgado:              expediente.juzgado ?? '',
          secretaria:           expediente.secretaria ?? '',
          jurisdiccion:         expediente.jurisdiccion ?? '',
          causaPJNId:           expediente.numeroExpedienteJudicial ?? '',
          instancia:            expediente.instancia ?? '',
          contraparte:          expediente.contraparte ?? '',
          abogadoContraparte:   expediente.abogadoContraparte ?? '',
          abogadoResponsable:   String(expediente.usuarioPrincipal?.id ?? ''),
          abogadoSecundario:    String(expediente.usuarioSecundario?.id ?? ''),
          fechaInicio:          expediente.fechaInicio ? expediente.fechaInicio.slice(0, 10) : '',
          fechaUltimaActuacion: expediente.fechaUltActuacion ? expediente.fechaUltActuacion.slice(0, 10) : '',
          fechaProcesalProximo: expediente.fechaProcesalProxima ? expediente.fechaProcesalProxima.slice(0, 10) : '',
          prioridad:            String(expediente.prioridad?.id ?? ''),
          origenCaso:           expediente.origenCaso ?? '',
        });
        this.cdr.detectChanges();
      },
      error: () => toast.error('Error al cargar el expediente'),
    });
  }

  get formValido(): boolean {
    return this.form.valid;
  }

  areaOptions = [
    { value: 'CIVIL',           label: 'Civil'           },
    { value: 'LABORAL',         label: 'Laboral'         },
    { value: 'PENAL',           label: 'Penal'           },
    { value: 'COMERCIAL',       label: 'Comercial'       },
    { value: 'FAMILIA',         label: 'Familia'         },
    { value: 'ADMINISTRATIVO',  label: 'Administrativo'  },
    { value: 'TRIBUTARIO',      label: 'Tributario'      },
    { value: 'PREVISIONAL',     label: 'Previsional'     },
    { value: 'INMOBILIARIO',    label: 'Inmobiliario'    },
    { value: 'SOCIETARIO',      label: 'Societario'      },
  ];

  tipoOptions:      { value: string; label: string }[] = [];
  estadoOptions:    { value: string; label: string }[] = [];
  prioridadOptions: { value: string; label: string }[] = [];
  rolOptions:       { value: string; label: string }[] = [];

  jurisdiccionOptions = [
    { value: 'NACIONAL',   label: 'Nacional'    },
    { value: 'PROVINCIAL', label: 'Provincial'  },
    { value: 'MUNICIPAL',  label: 'Municipal'   },
  ];

  fueroOptions = [
    { value: "Civil y Comercial",           label: "Civil y Comercial" },
    { value: "Civil",                       label: "Civil" },
    { value: "Comercial",                   label: "Comercial" },
    { value: "Laboral",                     label: "Laboral" },
    { value: "Familia",                     label: "Familia" },
    { value: "Penal",                       label: "Penal" },
    { value: "Penal Económico",             label: "Penal Económico" },
    { value: "Contencioso Administrativo",  label: "Contencioso Administrativo" },
    { value: "Seguridad Social",            label: "Seguridad Social" },
    { value: "Previsional",                 label: "Previsional" },
    { value: "Sucesiones",                  label: "Sucesiones" },
    { value: "Ejecuciones",                 label: "Ejecuciones" },
    { value: "Concursal y Quiebras",        label: "Concursal y Quiebras" },
    { value: "Tributario",                  label: "Tributario" },
    { value: "Contravencional y de Faltas", label: "Contravencional y de Faltas" },
    { value: "Violencia Familiar y Género", label: "Violencia Familiar y Género" },
    { value: "Juicios Ejecutivos",          label: "Juicios Ejecutivos" },
    { value: "Consumidor",                  label: "Consumidor" },
    { value: "Federal Civil y Comercial",   label: "Federal Civil y Comercial" },
    { value: "Federal Penal",               label: "Federal Penal" },
    { value: "Federal Contencioso Administrativo", label: "Federal Contencioso Administrativo" },
    { value: "Menores",                     label: "Menores" },
    { value: "Electoral",                   label: "Electoral" },
    { value: "Aduanero",                    label: "Aduanero" },
    { value: "Migratorio",                  label: "Migratorio" },
    { value: "Ambiental",                   label: "Ambiental" }
  ];

  juzgadoOptions = [
    // Juzgados
    { value: 'JUZ_001', label: 'Juzgado Federal Civil y Comercial N°1 — CABA',              tipo: 'juzgado' },
    { value: 'JUZ_002', label: 'Juzgado Federal Civil y Comercial N°2 — CABA',              tipo: 'juzgado' },
    { value: 'JUZ_003', label: 'Juzgado Federal en lo Criminal y Correccional N°1 — CABA', tipo: 'juzgado' },
    { value: 'JUZ_004', label: 'Juzgado Nacional del Trabajo N°30 — CABA',                 tipo: 'juzgado' },
    { value: 'JUZ_005', label: 'Juzgado Federal de Córdoba',                               tipo: 'juzgado' },
    { value: 'JUZ_006', label: 'Juzgado Contencioso Administrativo Federal N°1',           tipo: 'juzgado' },
    { value: 'JUZ_007', label: 'Juzgado Federal de Mendoza',                               tipo: 'juzgado' },
    { value: 'JUZ_008', label: 'Juzgado Federal de Rosario',                               tipo: 'juzgado' },
    { value: 'JUZ_009', label: 'Juzgado Federal de Tucumán',                               tipo: 'juzgado' },
    // Fiscalías
    { value: 'FIS_001', label: 'Fiscalía General La Plata',                                tipo: 'fiscalia' },
    { value: 'FIS_002', label: 'Fiscalía de Instrucción Córdoba',                          tipo: 'fiscalia' },
    { value: 'FIS_003', label: 'Fiscalía Regional Rosario',                                tipo: 'fiscalia' },
    // UFIs
    { value: 'UFI_001', label: 'UFI N°3 Lomas de Zamora',                                  tipo: 'ufi' },
    { value: 'UFI_002', label: 'UFI N°1 Morón',                                            tipo: 'ufi' },
    { value: 'UFI_003', label: 'UFI N°2 San Isidro',                                       tipo: 'ufi' },
    // Tribunales
    { value: 'TRI_001', label: 'Cámara Federal Civil y Comercial — CABA',                  tipo: 'tribunal' },
    { value: 'TRI_002', label: 'Cámara Nacional del Trabajo — CABA',                       tipo: 'tribunal' },
    { value: 'TRI_003', label: 'Cámara Contencioso Administrativo Federal',                tipo: 'tribunal' },
    // Comisarías
    { value: 'SEG_001', label: 'Comisaría 25 de Mayo 1°',                                  tipo: 'comisaria' },
    { value: 'SEG_002', label: 'Gendarmería — Agrupación Aviación Campo de Mayo',          tipo: 'comisaria' },
    { value: 'SEG_003', label: 'Comisaría Almirante Brown 7°',                             tipo: 'comisaria' },
    { value: 'SEG_004', label: 'Comisaría 1ra La Plata',                                   tipo: 'comisaria' },
    { value: 'SEG_005', label: 'Comisaría PFA N°1',                                        tipo: 'comisaria' },
    { value: 'SEG_006', label: 'Gendarmería — Agrupación III Corrientes',                  tipo: 'comisaria' },
    { value: 'SEG_007', label: 'Comisaría Rosario Centro',                                 tipo: 'comisaria' },
  ];

  instanciaOptions = [
    { value: 'PRIMERA',   label: 'Primera Instancia' },
    { value: 'SEGUNDA',   label: 'Segunda Instancia' },
    { value: 'CAMARA',    label: 'Cámara de Apelaciones' },
    { value: 'CASACION',  label: 'Casación'  },
    { value: 'CORTE',     label: 'Corte Suprema'  },
  ];

  abogadoOptions = [
    { value: '1', label: 'García, Juan Carlos'    },
    { value: '2', label: 'López, Ana María'      },
    { value: '3', label: 'Pérez, Carlos Eduardo' },
    { value: '4', label: 'Sánchez, Laura'        },
  ];

  // 🔴 MOCK — reemplazar por ClientesService
  clienteOptions = [
    { value: '1', label: 'Acme S.A.'              },
    { value: '2', label: 'García, Juan Carlos'    },
    { value: '3', label: 'López Hnos. S.R.L.'     },
    { value: '4', label: 'Rodríguez, María Elena' },
  ];

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }

  guardando = false;
  
  guardar(): void {
    if (!this.form.valid) {
      toast.error('Completá los campos obligatorios');
      return;
    }

    this.guardando = true;
    const v = this.form.getRawValue();

    this.http.put(`${environment.apiUrl}/expedientes/${this.expedienteId}`, {
      caratula:                   v.caratula,
      area:                       v.area,
      tipo_expediente:            Number(v.tipo),
      estado_expediente:          Number(v.estado),
      cliente:                    v.clienteId ? Number(v.clienteId) : null,
      descripcion:                v.descripcion || null,
      fuero:                      v.fuero || null,
      juzgado:                    v.juzgado || null,
      secretaria:                 v.secretaria || null,
      jurisdiccion:               v.jurisdiccion || null,
      numero_expediente_judicial: v.causaPJNId || null,
      instancia:                  v.instancia || null,
      contraparte:                v.contraparte || null,
      abogado_contraparte:        v.abogadoContraparte || null,
      usuario_principal:          v.abogadoResponsable ? Number(v.abogadoResponsable) : null,
      usuario_secundario:         v.abogadoSecundario ? Number(v.abogadoSecundario) : null,
      fecha_inicio:               v.fechaInicio || null,
      fecha_ult_actuacion:        v.fechaUltimaActuacion || null,
      fecha_procesal_proximo:     v.fechaProcesalProximo || null,
      prioridad:                  v.prioridad ? Number(v.prioridad) : null,
      origen_caso:                v.origenCaso || null,
    }).subscribe({
      next: () => {
        this.guardando = false;
        toast.success('Expediente actualizado correctamente');
      },
      error: () => {
        this.guardando = false;
        toast.error('No se pudo guardar. Intentá de nuevo.');
      },
    });
  }
}