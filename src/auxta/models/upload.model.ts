
export class UploadModel {
    private _reportId: string;
    private _nextSuites: [];
    private readonly _digitalProduct: string;
    private readonly _baseUrl: string;
    private readonly _organization: string;
    private readonly _environment: string;

    constructor(org: string, baseUrl: string, digitalProduct: string) {
        this._reportId = '';
        this._nextSuites = [];
        this._organization = org;
        this._digitalProduct = digitalProduct;
        this._environment = process.env.NODE_ENV || "";
        this._baseUrl = baseUrl;
    }

    get reportId(): string {
        return this._reportId;
    }

    set reportId(value: string) {
        this._reportId = value;
    }

    get nextSuites(): [] {
        return this._nextSuites;
    }

    set nextSuites(value: []) {
        this._nextSuites = value;
    }

    get digitalProduct(): string {
        return this._digitalProduct;
    }

    get baseUrl(): string {
        return this._baseUrl;
    }

    get organization(): string {
        return this._organization;
    }

    get environment(): string {
        return this._environment;
    }
}
