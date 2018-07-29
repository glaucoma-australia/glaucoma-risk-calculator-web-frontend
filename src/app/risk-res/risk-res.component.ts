import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { RiskResService, TSingleSeries } from '../../api/risk_res/risk_res.service';
import { IRiskRes } from '../../api/risk_res/risk_res';
import { Table } from '../table';


@Component({
  selector: 'app-risk-res',
  templateUrl: './risk-res.component.html',
  styleUrls: ['./risk-res.component.css']
})
export class RiskResComponent extends Table<IRiskRes> implements OnInit {
  ethnicity_agg: TSingleSeries;
  max_id: number;
  age_distr: Array<{name: string, series: Array<{name: string, value: number}>}>;

  constructor(private router: Router,
              private riskResService: RiskResService) {
    super();
    this.columns = ['age', 'client_risk', 'gender', 'ethnicity', 'parent',
      'study', 'myopia', 'id', 'createdAt', 'updatedAt'].map(
      title => ({
        title,
        name: title,
        filtering: { filterString: '', placeholder: `Filter by ${title}` }
      })
    );
  }

  ngOnInit() {
    this.riskResService
      .readAll()
      .subscribe(r => {
          this.data = r.risk_res;
          this.ethnicity_agg = r.ethnicity_agg;
          this.max_id = r.risk_res[r.risk_res.length - 1].id;
          const m = new Map<number, number[]>();
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(
            k => m.set(k, [])
          );
          const riskid_to_risk = new Map<number, IRiskRes>();
          r.risk_res.forEach(risk_res => {
            riskid_to_risk.set(risk_res.id, risk_res);
            const k = Math.floor(risk_res.age / 10);
            m.set(k, m.get(k).concat(risk_res.id));
          });
          this.age_distr = Array.from(m.values()).map((risk_ids, idx) => ({
            name: (sr => `${sr}-${sr + 9}`)(idx * 10),
            series: risk_ids.map(k => (risk_res => ({
              name: risk_res.id.toString(),
              value: risk_res.age
            }))(riskid_to_risk.get(k)))
          }));
        },
        console.error
      );
    this.onChangeTable(this.config);
  }

  getHeight(row: any, index: number): number {
    console.info('row.client_risk', row.client_risk, ';');
    return 50;
  }

  onCellClick(data: {column: string, row: IRiskRes}): any {
    console.log(':onCellClick', data.row, ';');
    this.router
      .navigateByUrl(`/results/${data.row.id}`)
      .catch(console.error);
  }
}
