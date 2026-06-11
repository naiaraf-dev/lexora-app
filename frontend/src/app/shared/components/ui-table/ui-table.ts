import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeConfig, UiBadge } from '../ui-badge/ui-badge';

export type TableAction = 'view' | 'edit' | 'delete' | 'download' | 'complete';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'badge' | 'date' | 'actions';
  actions?: TableAction[];
  getActions?: (row: any) => TableAction[];
  badgeConfig?: Record<string, BadgeConfig>;
}

@Component({
  selector: 'app-ui-table',
  standalone: true,
  imports: [UiBadge, CommonModule],
  templateUrl: './ui-table.html',
})
export class UiTable {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];

  @Output() action = new EventEmitter<{
    type: TableAction;
    row: any;
  }>();

  onAction(type: TableAction, row: any) {
    this.action.emit({ type, row });
  }

  getValue(row: any, key: string): any {
    return key.split('.').reduce((obj, k) => obj?.[k], row);
  }
}
