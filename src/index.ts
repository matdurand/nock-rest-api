import nock from "nock";
import _ from "lodash";

const uriTemplates = require("uri-templates");

const nockUriTemplate = (baseUrl: string) => {
  return new NockUriTemplate(baseUrl);
};

class NockUriTemplate {
  constructor(readonly baseUrl: string) {}

  public get(uri: string) {
    return new Method(this, "GET", uri);
  }

  public post(uri: string) {
    return new Method(this, "POST", uri);
  }

  public put(uri: string) {
    return new Method(this, "PUT", uri);
  }

  public delete(uri: string) {
    return new Method(this, "DELETE", uri);
  }
}

class Method {
  private accumulator = new CallAccumulator();
  private template: any;

  constructor(
    readonly nockUriTemplate: NockUriTemplate,
    readonly method: string,
    readonly uri: string
  ) {
    let baseUrlPath = new URL(this.nockUriTemplate.baseUrl).pathname;
    if (baseUrlPath.endsWith("/")) {
      baseUrlPath = baseUrlPath.substring(0, baseUrlPath.length - 1);
    }
    this.template = uriTemplates(baseUrlPath + uri);
  }

  public replyTimes(
    maximumTimes: number,
    resolver: (params: any) => Response
  ): ApiScope {
    const uriMatcher = (path: string) => {
      const uriMatches = this.template.test(path, {
        strict: true
      });
      if (uriMatches) {
        return maximumTimes < 1 || !this.hasReachMaximumCalls(maximumTimes);
      }
      return false;
    };

    let scope = nock(this.nockUriTemplate.baseUrl).persist() as any;
    scope = scope[this.method.toLowerCase()](uriMatcher).reply(
      (uri: string) => {
        const params = this.template.fromUri(uri);
        const response = resolver(params);

        this.accumulator.record(params);
        if (response.payload) {
          return [response.code || 200, response.payload];
        }
        return [response.code || 204];
      }
    );
    return new ApiScope(this.template, this.accumulator);
  }

  private hasReachMaximumCalls(maximumTimes: number): boolean {
    const count = this.accumulator.totalCount();
    return count >= maximumTimes;
  }

  public reply(resolver: (params: any) => Response): ApiScope {
    return this.replyTimes(-1, resolver);
  }

  public replyOnce(resolver: (params: any) => Response): ApiScope {
    return this.replyTimes(1, resolver);
  }
}

class ApiScope {
  constructor(
    private readonly template: any,
    private readonly accumulator: CallAccumulator
  ) {}

  public forParams(params: any): CallScope {
    return new CallScope(
      this.template,
      this.accumulator.callsForParams(params)
    );
  }

  public notForParams(params: any): CallScope {
    return new CallScope(
      this.template,
      this.accumulator.callsNotForParams(params)
    );
  }

  public times(): number {
    return this.accumulator.totalCount();
  }
}

class CallScope {
  constructor(private readonly template: any, private readonly params: any[]) {}

  public times() {
    return this.params.length;
  }

  public urls() {
    return this.params.map(p => this.template.fill(p));
  }
}

class CallAccumulator {
  private records: any[];
  constructor() {
    this.records = [];
  }

  record(params: any) {
    this.records.push(params);
  }

  callsForParams(params: any) {
    return this.records.filter((p: any) => _.isEqual(p, params));
  }

  callsNotForParams(params: any) {
    return this.records.filter((p: any) => !_.isEqual(p, params));
  }

  totalCount() {
    return this.records.length;
  }
}

export interface Response {
  code?: number;
  payload?: any;
}

export default nockUriTemplate;
