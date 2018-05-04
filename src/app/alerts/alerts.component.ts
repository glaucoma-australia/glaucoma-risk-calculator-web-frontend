import { Component, Input, OnInit } from '@angular/core';

import { IAlert, TAlert } from './alert';
import { AlertsService } from './alerts.service';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css']
})
export class AlertsComponent implements OnInit {
  @Input() public type = 'warning';
  @Input() public dismissible: boolean;
  @Input() public dismissOnTimeout: number;

  public alerts: Array<TAlert>;

  constructor(public readonly alertsService: AlertsService) {
  }

  ngOnInit() {
  }

  addAlert(alert: IAlert) {
    this.alertsService.add(alert);
  }

  closeAlert(i: number) {
    this.alertsService.close(i);
  }
}
