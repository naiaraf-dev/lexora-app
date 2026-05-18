import { Component } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router } from '@angular/router';
import { ExpedienteTabs } from '../../components/expediente-tabs/expediente-tabs';
import { PrimaryBtn } from '../../../../shared/components/primary-btn/primary-btn';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-expediente-edit',
  standalone: true,
  imports: [RouterOutlet, ExpedienteTabs, PrimaryBtn],
  templateUrl: './expediente-edit.html',
})
export class ExpedienteEdit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  get expedienteId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  get baseUrl(): string {
    return `/gestion-expedientes/${this.expedienteId}/edit`;
  }

  volver(): void {
    this.router.navigate(['/gestion-expedientes']);
  }

  guardando = false;
  
  guardar(): void {
    this.guardando = true;

    // 🔴 MOCK — reemplazar por:
    // const id = this.route.snapshot.paramMap.get('id')!;
    // this.expedientesService.update(id, form.value).subscribe({
    //   next: () => {
    //     this.guardando = false;
    //     toast.success('Expediente actualizado correctamente');
    //   },
    //   error: () => {
    //     this.guardando = false;
    //     toast.error('No se pudo guardar. Intentá de nuevo.');
    //   },
    // });

    setTimeout(() => {
      this.guardando = false;
      toast.success('Expediente actualizado correctamente');
    }, 800);
  }

}