import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpedienteHeader } from '../../components/expediente-header/expediente-header';
import { ExpedienteFilters } from '../../components/expediente-filters/expediente-filters';
import { ExpedienteTable } from '../../components/expediente-table/expediente-table';

@Component({
  selector: 'app-expediente-list',
  standalone: true,
  imports: [CommonModule, ExpedienteHeader, ExpedienteFilters, ExpedienteTable],
  templateUrl: './expediente-list.html',
})
export class ExpedienteList {}
