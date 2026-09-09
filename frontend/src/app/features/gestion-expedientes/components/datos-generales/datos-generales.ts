import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  Router,
  ActivatedRoute
} from '@angular/router';

import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';

import { Auth } from '../../../../core/services/auth';

import { toast } from 'ngx-sonner';

/**
 * Sub-página de edición de datos generales de un expediente.
 *
 * Carga el expediente junto con los catálogos necesarios.
 *
 * Los estados disponibles se cargan en función del tipo de expediente.
 *
 * Cuando el usuario cambia el estado, el backend genera automáticamente
 * las tareas correspondientes a ese tipo + estado.
 */
@Component({
  selector: 'app-datos-generales',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    UiInput,
    UiSelect,
    UiDateInput,
    PrimaryBtn
  ],
  templateUrl: './datos-generales.html',
})
export class DatosGenerales implements OnInit {

  form!: FormGroup;

  private http = inject(HttpClient);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);

  private expedienteId!: number;

  guardando = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {

    this.expedienteId = Number(
      this.route.snapshot.parent?.paramMap.get('id')
    );

    this.form = this.fb.group({
      numero: [
        { value: '', disabled: true }
      ],

      caratula: [
        '',
        Validators.required
      ],

      area: [
        '',
        Validators.required
      ],

      tipo: [
        '',
        Validators.required
      ],

      clienteId: [''],

      rolCliente: [''],

      estado: [
        '',
        Validators.required
      ],

      descripcion: [''],

      fuero: [''],

      juzgado: [''],

      secretaria: [''],

      jurisdiccion: [''],

      causaPJNId: [''],

      instancia: [''],

      abogadoResponsable: [''],

      abogadoSecundario: [''],

      contraparte: [''],

      abogadoContraparte: [''],

      fechaInicio: [''],

      fechaUltimaActuacion: [''],

      fechaProcesalProximo: [''],

      prioridad: [''],

      origenCaso: [''],
    });

    this.cargarDatosIniciales();
  }

  /**
   * Carga expediente y catálogos generales.
   *
   * Los estados NO se cargan desde /enums/estadoexpediente,
   * porque dependen del tipo de expediente.
   */
  private cargarDatosIniciales(): void {

    forkJoin({
      expediente: this.http.get<any>(
        `${environment.apiUrl}/expedientes/${this.expedienteId}`
      ),

      tipos: this.http.get<any[]>(
        `${environment.apiUrl}/enums/tipoexpediente`
      ),

      prioridades: this.http.get<any[]>(
        `${environment.apiUrl}/enums/prioridad`
      ),

      roles: this.http.get<any[]>(
        `${environment.apiUrl}/enums/rolcliente`
      ),

      usuarios: this.http.get<any[]>(
        `${environment.apiUrl}/usuarios`
      ),

      clientes: this.http.get<any[]>(
        `${environment.apiUrl}/clientes`
      ),

    }).subscribe({

      next: ({
        expediente,
        tipos,
        prioridades,
        roles,
        usuarios,
        clientes
      }) => {

        this.tipoOptions = tipos.map(t => ({
          value: String(t.id),
          label: t.nombre
        }));

        this.prioridadOptions = prioridades.map(p => ({
          value: String(p.id),
          label: p.nombre
        }));

        this.rolOptions = roles.map(r => ({
          value: String(r.id),
          label: r.nombre
        }));

        this.abogadoOptions = usuarios.map(u => ({
          value: String(u.id),
          label: `${u.apellido}, ${u.nombre}`
        }));

        this.clienteOptions = clientes.map(c => ({
          value: String(c.id),

          label:
            c.tipo_cliente === 2
              ? (c.nombre ?? '')
              : `${c.apellido ?? ''}, ${c.nombre ?? ''}`.trim(),
        }));

        this.form.patchValue({

          numero:
            expediente.numeroInterno,

          caratula:
            expediente.caratula,

          area:
            expediente.area,

          tipo:
            String(
              expediente.tipo?.id ?? ''
            ),

          clienteId:
            String(
              expediente.cliente?.id ?? ''
            ),

          estado:
            String(
              expediente.estado?.id ?? ''
            ),

          descripcion:
            expediente.descripcion ?? '',

          fuero:
            expediente.fuero ?? '',

          juzgado:
            expediente.juzgado ?? '',

          secretaria:
            expediente.secretaria ?? '',

          jurisdiccion:
            expediente.jurisdiccion ?? '',

          causaPJNId:
            expediente.numeroExpedienteJudicial ?? '',

          instancia:
            expediente.instancia ?? '',

          contraparte:
            expediente.contraparte ?? '',

          abogadoContraparte:
            expediente.abogadoContraparte ?? '',

          abogadoResponsable:
            String(
              expediente.usuarioPrincipal?.id ?? ''
            ),

          abogadoSecundario:
            String(
              expediente.usuarioSecundario?.id ?? ''
            ),

          fechaInicio:
            expediente.fechaInicio
              ? expediente.fechaInicio.slice(0, 10)
              : '',

          fechaUltimaActuacion:
            expediente.fechaUltActuacion
              ? expediente.fechaUltActuacion.slice(0, 10)
              : '',

          fechaProcesalProximo:
            expediente.fechaProcesalProxima
              ? expediente.fechaProcesalProxima.slice(0, 10)
              : '',

          prioridad:
            String(
              expediente.prioridad?.id ?? ''
            ),

          origenCaso:
            expediente.origenCaso ?? '',

          rolCliente:
            String(
              expediente.rolCliente?.id ?? ''
            ),
        });

        /**
         * Ahora cargamos solamente los estados válidos
         * para el tipo actual del expediente.
         */
        if (expediente.tipo?.id) {

          this.cargarEstadosPorTipo(
            Number(expediente.tipo.id),
            expediente.estado?.id
              ? Number(expediente.estado.id)
              : undefined
          );
        }

        this.cdr.detectChanges();
      },

      error: (err) => {

        console.error(
          'Error al cargar expediente:',
          err
        );

        toast.error(
          'Error al cargar el expediente'
        );
      },
    });
  }

  /**
   * Carga los estados válidos para un tipo de expediente.
   *
   * Si se pasa estadoSeleccionado, mantiene ese estado.
   */
  private cargarEstadosPorTipo(
    tipoId: number,
    estadoSeleccionado?: number
  ): void {

    this.http.get<any[]>(
      `${environment.apiUrl}/enums/tipoexpediente/${tipoId}/estados`
    ).subscribe({

      next: (estados) => {

        this.estadoOptions = estados.map(e => ({
          value: String(e.estadoId),
          label: e.estadoNombre
        }));

        if (estadoSeleccionado) {

          this.form.get('estado')?.setValue(
            String(estadoSeleccionado)
          );
        }

        this.cdr.detectChanges();
      },

      error: (err) => {

        console.error(
          'Error cargando estados del tipo:',
          err
        );

        this.estadoOptions = [];

        toast.error(
          'No se pudieron cargar los estados del expediente'
        );
      }
    });
  }

  /**
   * Se ejecuta cuando cambia el tipo de expediente.
   *
   * Al cambiar de tipo se cargan sus estados posibles
   * y se selecciona automáticamente el primero.
   */
  onTipoChange(tipoId: string): void {

    this.form.get('tipo')?.setValue(tipoId);

    if (!tipoId) {

      this.estadoOptions = [];

      this.form.get('estado')?.setValue('');

      return;
    }

    this.http.get<any[]>(
      `${environment.apiUrl}/enums/tipoexpediente/${Number(tipoId)}/estados`
    ).subscribe({

      next: (estados) => {

        this.estadoOptions = estados.map(e => ({
          value: String(e.estadoId),
          label: e.estadoNombre
        }));

        /**
         * Si se cambia de tipo, el estado anterior puede
         * no pertenecer al nuevo tipo.
         *
         * Por eso seleccionamos el primer estado configurado.
         */
        if (estados.length > 0) {

          this.form.get('estado')?.setValue(
            String(estados[0].estadoId)
          );

        } else {

          this.form.get('estado')?.setValue('');
        }

        this.cdr.detectChanges();
      },

      error: (err) => {

        console.error(
          'Error cargando estados del nuevo tipo:',
          err
        );

        this.estadoOptions = [];

        this.form.get('estado')?.setValue('');

        toast.error(
          'No se pudieron cargar los estados del tipo seleccionado'
        );
      }
    });
  }

  /**
   * Indica si el formulario cumple
   * con las validaciones requeridas.
   */
  get formValido(): boolean {
    return this.form.valid;
  }

  areaOptions = [
    {
      value: 'CIVIL',
      label: 'Civil'
    },
    {
      value: 'LABORAL',
      label: 'Laboral'
    },
    {
      value: 'PENAL',
      label: 'Penal'
    },
    {
      value: 'COMERCIAL',
      label: 'Comercial'
    },
    {
      value: 'FAMILIA',
      label: 'Familia'
    },
    {
      value: 'ADMINISTRATIVO',
      label: 'Administrativo'
    },
    {
      value: 'TRIBUTARIO',
      label: 'Tributario'
    },
    {
      value: 'PREVISIONAL',
      label: 'Previsional'
    },
    {
      value: 'INMOBILIARIO',
      label: 'Inmobiliario'
    },
    {
      value: 'SOCIETARIO',
      label: 'Societario'
    },
  ];

  tipoOptions: {
    value: string;
    label: string;
  }[] = [];

  estadoOptions: {
    value: string;
    label: string;
  }[] = [];

  prioridadOptions: {
    value: string;
    label: string;
  }[] = [];

  rolOptions: {
    value: string;
    label: string;
  }[] = [];

  jurisdiccionOptions = [
    {
      value: 'NACIONAL',
      label: 'Nacional'
    },
    {
      value: 'PROVINCIAL',
      label: 'Provincial'
    },
    {
      value: 'MUNICIPAL',
      label: 'Municipal'
    },
  ];

  fueroOptions = [
    {
      value: 'Civil y Comercial',
      label: 'Civil y Comercial'
    },
    {
      value: 'Civil',
      label: 'Civil'
    },
    {
      value: 'Comercial',
      label: 'Comercial'
    },
    {
      value: 'Laboral',
      label: 'Laboral'
    },
    {
      value: 'Familia',
      label: 'Familia'
    },
    {
      value: 'Penal',
      label: 'Penal'
    },
    {
      value: 'Penal Económico',
      label: 'Penal Económico'
    },
    {
      value: 'Contencioso Administrativo',
      label: 'Contencioso Administrativo'
    },
    {
      value: 'Seguridad Social',
      label: 'Seguridad Social'
    },
    {
      value: 'Previsional',
      label: 'Previsional'
    },
    {
      value: 'Sucesiones',
      label: 'Sucesiones'
    },
    {
      value: 'Ejecuciones',
      label: 'Ejecuciones'
    },
    {
      value: 'Concursal y Quiebras',
      label: 'Concursal y Quiebras'
    },
    {
      value: 'Tributario',
      label: 'Tributario'
    },
    {
      value: 'Contravencional y de Faltas',
      label: 'Contravencional y de Faltas'
    },
    {
      value: 'Violencia Familiar y Género',
      label: 'Violencia Familiar y Género'
    },
    {
      value: 'Juicios Ejecutivos',
      label: 'Juicios Ejecutivos'
    },
    {
      value: 'Consumidor',
      label: 'Consumidor'
    },
    {
      value: 'Federal Civil y Comercial',
      label: 'Federal Civil y Comercial'
    },
    {
      value: 'Federal Penal',
      label: 'Federal Penal'
    },
    {
      value: 'Federal Contencioso Administrativo',
      label: 'Federal Contencioso Administrativo'
    },
    {
      value: 'Menores',
      label: 'Menores'
    },
    {
      value: 'Electoral',
      label: 'Electoral'
    },
    {
      value: 'Aduanero',
      label: 'Aduanero'
    },
    {
      value: 'Migratorio',
      label: 'Migratorio'
    },
    {
      value: 'Ambiental',
      label: 'Ambiental'
    }
  ];

  juzgadoOptions = [

    {
      value: 'Juzgado Federal Civil y Comercial N°1 — CABA',
      label: 'Juzgado Federal Civil y Comercial N°1 — CABA',
      tipo: 'juzgado'
    },

    {
      value: 'Juzgado Federal Civil y Comercial N°2 — CABA',
      label: 'Juzgado Federal Civil y Comercial N°2 — CABA',
      tipo: 'juzgado'
    },

    {
      value: 'Juzgado Federal en lo Criminal y Correccional N°1 — CABA',
      label: 'Juzgado Federal en lo Criminal y Correccional N°1 — CABA',
      tipo: 'juzgado'
    },

    {
      value: 'Juzgado Nacional del Trabajo N°30 — CABA',
      label: 'Juzgado Nacional del Trabajo N°30 — CABA',
      tipo: 'juzgado'
    },

    {
      value: 'Juzgado Federal de Córdoba',
      label: 'Juzgado Federal de Córdoba',
      tipo: 'juzgado'
    },

    {
      value: 'Juzgado Contencioso Administrativo Federal N°1',
      label: 'Juzgado Contencioso Administrativo Federal N°1',
      tipo: 'juzgado'
    },

    {
      value: 'Juzgado Federal de Mendoza',
      label: 'Juzgado Federal de Mendoza',
      tipo: 'juzgado'
    },

    {
      value: 'Juzgado Federal de Rosario',
      label: 'Juzgado Federal de Rosario',
      tipo: 'juzgado'
    },

    {
      value: 'Juzgado Federal de Tucumán',
      label: 'Juzgado Federal de Tucumán',
      tipo: 'juzgado'
    },

    {
      value: 'Fiscalía General La Plata',
      label: 'Fiscalía General La Plata',
      tipo: 'fiscalia'
    },

    {
      value: 'Fiscalía de Instrucción Córdoba',
      label: 'Fiscalía de Instrucción Córdoba',
      tipo: 'fiscalia'
    },

    {
      value: 'Fiscalía Regional Rosario',
      label: 'Fiscalía Regional Rosario',
      tipo: 'fiscalia'
    },

    {
      value: 'UFI N°3 Lomas de Zamora',
      label: 'UFI N°3 Lomas de Zamora',
      tipo: 'ufi'
    },

    {
      value: 'UFI N°1 Morón',
      label: 'UFI N°1 Morón',
      tipo: 'ufi'
    },

    {
      value: 'UFI N°2 San Isidro',
      label: 'UFI N°2 San Isidro',
      tipo: 'ufi'
    },

    {
      value: 'Cámara Federal Civil y Comercial — CABA',
      label: 'Cámara Federal Civil y Comercial — CABA',
      tipo: 'tribunal'
    },

    {
      value: 'Cámara Nacional del Trabajo — CABA',
      label: 'Cámara Nacional del Trabajo — CABA',
      tipo: 'tribunal'
    },

    {
      value: 'Cámara Contencioso Administrativo Federal',
      label: 'Cámara Contencioso Administrativo Federal',
      tipo: 'tribunal'
    },

    {
      value: 'Comisaría 25 de Mayo 1°',
      label: 'Comisaría 25 de Mayo 1°',
      tipo: 'comisaria'
    },

    {
      value: 'Gendarmería — Agrupación Aviación Campo de Mayo',
      label: 'Gendarmería — Agrupación Aviación Campo de Mayo',
      tipo: 'comisaria'
    },

    {
      value: 'Comisaría Almirante Brown 7°',
      label: 'Comisaría Almirante Brown 7°',
      tipo: 'comisaria'
    },

    {
      value: 'Comisaría 1ra La Plata',
      label: 'Comisaría 1ra La Plata',
      tipo: 'comisaria'
    },

    {
      value: 'Comisaría PFA N°1',
      label: 'Comisaría PFA N°1',
      tipo: 'comisaria'
    },

    {
      value: 'Gendarmería — Agrupación III Corrientes',
      label: 'Gendarmería — Agrupación III Corrientes',
      tipo: 'comisaria'
    },

    {
      value: 'Comisaría Rosario Centro',
      label: 'Comisaría Rosario Centro',
      tipo: 'comisaria'
    },
  ];

  instanciaOptions = [
    {
      value: 'PRIMERA',
      label: 'Primera Instancia'
    },
    {
      value: 'SEGUNDA',
      label: 'Segunda Instancia'
    },
    {
      value: 'CAMARA',
      label: 'Cámara de Apelaciones'
    },
    {
      value: 'CASACION',
      label: 'Casación'
    },
    {
      value: 'CORTE',
      label: 'Corte Suprema'
    },
  ];

  abogadoOptions: {
    value: string;
    label: string;
  }[] = [];

  clienteOptions: {
    value: string;
    label: string;
  }[] = [];

  /**
   * Retorna a la bandeja de expedientes.
   */
  volver(): void {

    this.router.navigate([
      '/gestion-expedientes'
    ]);
  }

  /**
   * Valida y envía el PUT.
   *
   * usuario_creacion_tareas se envía siempre.
   *
   * El backend solamente lo usa cuando detecta
   * un cambio real de estado.
   */
  guardar(): void {

    if (!this.form.valid) {

      toast.error(
        'Completá los campos obligatorios'
      );

      return;
    }

    const usuarioActual =
      this.auth.currentUser();

    if (!usuarioActual?.id) {

      toast.error(
        'No hay un usuario autenticado'
      );

      return;
    }

    this.guardando = true;

    const v =
      this.form.getRawValue();

    const payload = {

      caratula:
        v.caratula,

      area:
        v.area,

      tipo_expediente:
        Number(v.tipo),

      estado_expediente:
        Number(v.estado),

      cliente:
        v.clienteId
          ? Number(v.clienteId)
          : null,

      descripcion:
        v.descripcion || null,

      fuero:
        v.fuero || null,

      juzgado:
        v.juzgado || null,

      secretaria:
        v.secretaria || null,

      jurisdiccion:
        v.jurisdiccion || null,

      numero_expediente_judicial:
        v.causaPJNId || null,

      instancia:
        v.instancia || null,

      contraparte:
        v.contraparte || null,

      abogado_contraparte:
        v.abogadoContraparte || null,

      usuario_principal:
        v.abogadoResponsable
          ? Number(v.abogadoResponsable)
          : null,

      usuario_secundario:
        v.abogadoSecundario
          ? Number(v.abogadoSecundario)
          : null,

      fecha_inicio:
        v.fechaInicio || null,

      fecha_ult_actuacion:
        v.fechaUltimaActuacion || null,

      fecha_procesal_proximo:
        v.fechaProcesalProximo || null,

      prioridad:
        v.prioridad
          ? Number(v.prioridad)
          : null,

      origen_caso:
        v.origenCaso || null,

      rol_cliente:
        v.rolCliente
          ? Number(v.rolCliente)
          : null,

      /**
       * Usuario que figurará como creador
       * de las tareas automáticas.
       */
      usuario_creacion_tareas:
        usuarioActual.id,
    };

    console.log(
      'PUT expediente:',
      payload
    );

    this.http.put(
      `${environment.apiUrl}/expedientes/${this.expedienteId}`,
      payload
    ).subscribe({

      next: () => {

        this.guardando = false;

        toast.success(
          'Expediente actualizado correctamente'
        );
      },

      error: (err) => {

        this.guardando = false;

        console.error(
          'Error actualizando expediente:',
          err
        );

        toast.error(
          err?.error?.mensaje ??
          'No se pudo guardar. Intentá de nuevo.'
        );
      },
    });
  }
}