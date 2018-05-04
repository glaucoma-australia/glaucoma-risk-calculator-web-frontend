import { Injectable } from '@angular/core';
import { Headers, Http, RequestOptions, Response, URLSearchParams } from '@angular/http';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import { AuthService } from '../../api/auth/auth.service';

interface ArrayBufferViewForEach extends ArrayBufferView {
  forEach(callbackfn: (value: number, index: number, array: Int8Array) => void, thisArg?: any): void;
}

interface ResHash {
  id_token?: string;
  access_token?: string;
  state: string;
  session_state: string;
}

export interface IMail {
  recipient: string;
  subject: string;
  content: string;
}

export const parseQueryString = (url: string): ResHash => {
  const params: ResHash = {} as ResHash;
  const queryString = url.substring(1);
  const regex = /([^&=]+)=([^&]*)/g;
  let m: RegExpExecArray;
  while (m = regex.exec(queryString)) {
    params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
  }
  return params;
};

@Injectable()
export class MsAuthService {
  private params: ResHash;

  constructor(private http: Http,
              private authService: AuthService) {
    this.params = parseQueryString(location.hash);
  }

  private _tenant_id: string;

  get tenant_id(): string {
    if (!this._tenant_id) throw TypeError('tenant_id must be defined. Did you run MsAuthService.setup?');
    return this._tenant_id;
  }

  set tenant_id(val: string) {
    this._tenant_id = val;
  }

  private _client_id: string;

  get client_id(): string {
    if (!this._client_id) throw TypeError('client_id must be defined. Did you run MsAuthService.setup?');
    return this._client_id;
  }

  set client_id(val: string) {
    this._client_id = val;
  }

  private _access_token: string;

  get access_token(): string {
    if (!this._access_token) this._access_token = localStorage.getItem('ms-access-token');
    return this._access_token;
  }

  set access_token(val: string) {
    this._access_token = val;
    localStorage.setItem('ms-access-token', val);
  }

  static genNonce() {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz'; // '-._~';
    const rands = new Uint8Array(32);
    const results = [];
    window.crypto.getRandomValues(rands);
    rands.forEach(c => results.push(charset[c % charset.length]));
    return results.join('');
  }

  static getHostOrigin(): string {
    return `${window.location.protocol}//${window.location.hostname}${window.location.port ?
      ':' + window.location.port : ''}`;
  }

  setup(tenant_id: string, client_id: string) {
    this.tenant_id = tenant_id;
    this.client_id = client_id;
  }

  login() {
    // check for id_token or access_token in url
    /* tslint:disable:no-console */
    console.info('this.params[\'id_token\'] =', this.params['id_token']);
    console.info('this.params[\'access_token\'] =', this.params['access_token']);
    if (this.params['id_token'] !== null)
      this.getAccessToken();
    else if (this.params['access_token'] !== null)
      this.access_token = this.params['access_token'];

    // redirect to get id_token
    // console.info('this.genParams() =', this.genParams())
    /*
     const params = new URLSearchParams();
     params.set('response_type', 'id_token');
     params.appendAll(this.genParams());
     window.location.href = `https://login.microsoftonline.com/${this.tenant_id}/oauth2/authorize?${params}`;
     */
  }

  logout() {
    localStorage.removeItem('ms-access-token');
    this._access_token = null;
  }

  public getAccessToken(state?: string) {
    // redirect to get access_token
    const params = new URLSearchParams();
    params.set('response_type', 'token');
    params.appendAll(this.genParams(state));
    params.set('resource', 'https://graph.microsoft.com');
    params.set('prompt', 'none');
    window.location.href = `https://login.microsoftonline.com/${this.tenant_id}/oauth2/authorize?${params}`;
  }

  public sendEmail(mail: IMail): Observable<IMail> {
    const options = new RequestOptions({
      headers: new Headers({
        'Authorization': `Bearer ${this.access_token}`,
        'Content-Type': 'application/json'
      })
    });
    const body = {
      message: {
        subject: mail.subject,
        toRecipients: [{
          emailAddress: {
            address: mail.recipient
          }
        }],
        body: {
          content: mail.content,
          contentType: 'html'
        }
      }
    };
    return this.http
      .post('https://graph.microsoft.com/v1.0/users/me/sendMail', body, options)
      .map((response: Response) => {
        if (response.status !== 202)
          Observable.throw(new Error(`Expected response.status of 202 got ${response.status}.
           Body: ${response.text()}`));
        return response;
      })
      .catch(error => {
        const err = JSON.parse(error._body).error;
        if (err.message === 'Access token has expired.')
          this.getAccessToken();
        return Observable.throw(err);
      });
  }


  private genParams(state?: string): URLSearchParams {
    const params: URLSearchParams = new URLSearchParams();
    params.set('client_id', this.client_id);
    /* tslint:disable:no-console */
    console.info('genParams::client_id =', this.client_id);
    params.set('redirect_uri', MsAuthService.getHostOrigin());
    params.set('state', state || window.location.pathname); // redirect_uri doesn't work with angular for some reason?
    params.set('nonce', MsAuthService.genNonce());
    return params;
  }
}
