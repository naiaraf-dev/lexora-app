import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UiInput } from '../../../../shared/components/ui-input/ui-input';
import { UiSelect } from '../../../../shared/components/ui-select/ui-select';
import { UiDateInput } from '../../../../shared/components/ui-date-input/ui-date-input';

@Component({
  selector: 'app-datos-generales',
  standalone: true,
  imports: [ReactiveFormsModule, UiInput, UiSelect, UiDateInput],
  templateUrl: './datos-generales.html',
})
export class DatosGenerales implements OnInit {

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // 🔴 MOCK — reemplazar por ExpedientesService.getById(id) y patchValue con la respuesta
    this.form = this.fb.group({
      numero:      [{ value: 'EXP-2025-1001', disabled: true }],
      caratula:    ['García c/ López s/ Daños y perjuicios', Validators.required],
      area:        ['CIVIL', Validators.required],
      tipo:        ['DEMANDA_CIVIL', Validators.required],
      clienteId:   ['2'],
      rolCliente:  [''],
      estado:      ['EN_TRAMITE'],
      descripcion: [''],
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

  tipoOptions = [
    { value: 'OFICIO',            label: 'Oficios'                             },
    { value: 'CARTA_DOC',         label: 'Carta Documento'                     },
    { value: 'MEDIACION',         label: 'Mediaciones'                         },
    { value: 'BENEFICIO_LITIGAR', label: 'Beneficios de litigar sin gastos'    },
    { value: 'COBRO_CANON',       label: 'Cobro de Cánones'                    },
    { value: 'RECLAMO_CONTRAT',   label: 'Reclamo a Contratista / Proveedor'   },
    { value: 'LANZAMIENTO',       label: 'Lanzamientos'                        },
    { value: 'RECUPERO',          label: 'Recuperos'                           },
    { value: 'EJECUCION_GAR',     label: 'Ejecución de Pólizas'                },
    { value: 'DEMANDA_CIVIL',     label: 'Demanda Civil'                       },
    { value: 'DEMANDA_LABORAL',   label: 'Demanda Laboral'                     },
    { value: 'DEFENSA_CIVIL',     label: 'Defensas Civiles'                    },
    { value: 'SECLOS',            label: 'SECLO'                               },
    { value: 'CONSIGNACION',      label: 'Consignaciones'                      },
    { value: 'DESAFUERO',         label: 'Desafueros'                          },
    { value: 'QUERELLA',          label: 'Querellas'                           },
    { value: 'DEFENSA_PENAL',     label: 'Defensas Penales'                    },
    { value: 'CARTA_SUCESO',      label: 'Cartas Suceso'                       },
    { value: 'OTRAS',             label: 'Otras presentaciones / gestiones'    },
  ];

  rolOptions = [
    { value: 'ACTOR',      label: 'Actor'      },
    { value: 'DEMANDADO',  label: 'Demandado'  },
    { value: 'QUERELLANTE',label: 'Querellante'},
    { value: 'IMPUTADO',   label: 'Imputado'   },
    { value: 'TERCERO',    label: 'Tercero'    },
  ];

  estadoOptions = [
    { value: 'EN_TRAMITE', label: 'En trámite'  },
    { value: 'FINALIZADO', label: 'Finalizado'  },
    { value: 'ARCHIVADO',  label: 'Archivado'   },
  ];

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

  prioridadOptions = [
    { value: 'BAJA',   label: 'Baja'   },
    { value: 'MEDIA',  label: 'Media'  },
    { value: 'ALTA',   label: 'Alta'   },
  ];

  // 🔴 MOCK — reemplazar por ClientesService
  clienteOptions = [
    { value: '1', label: 'Acme S.A.'              },
    { value: '2', label: 'García, Juan Carlos'    },
    { value: '3', label: 'López Hnos. S.R.L.'     },
    { value: '4', label: 'Rodríguez, María Elena' },
  ];
}