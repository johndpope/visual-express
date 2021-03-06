var rExpress = require('express');
var rExpressApp = rExpress();
var rExtensions = require('./vx-extensions');
var rAwsSrvrless = require('aws-serverless-express');
var rCluster = require('./vx-cluster');
// var rLambdaBody = require('./vx-lambda-body');

module.exports = class vxServer {
  /**
   * initialize server according to environment:
   * @param {*} log
   * @param {*} configs
   * @param {*} definitions
   * @param {*} lambdaEvent
   * @param {*} lambdaContext
   */
  constructor(log, configs, definitions, lambdaEvent, lambdaContext) {
    this.log = log;
    this.configs = configs;
    this.definitions = definitions;
    this.lambdaEvent = lambdaEvent;
    this.lambdaContext = lambdaContext;
    //
    // selected mode (process.env.vxInfoMode):
    this.mode = this.configs.info.mode;
  }

  /**
   * initialize server:
   */
  async init() {
    this.log.verbose(__filename, 'init');

    // print mode:
    this.log.info(__filename, 'mode', this.mode);

    try {
      // add application extensions:
      let oExtensions = new rExtensions(this.log, this.configs);
      oExtensions.add(rExpressApp, this.definitions);

      // initialize according to mode:
      switch (this.mode) {
        case 'lambda': {
          // no listener, only routes:
          await this.definitions.routes.create(rExpressApp).catch(error => {
            this.log.error(__filename, 'init:create', error);
            throw error;
          });
          // create serverless express for lambda:
          // lambda has no listeners.
          let rAwsLambda = rAwsSrvrless.createServer(rExpressApp, null, this.apiGtwBinaryMimeTypes());
          if (this.lambdaEvent && this.lambdaContext) {
            // initialize proxy in lambda function:
            rAwsSrvrless.proxy(rAwsLambda, this.lambdaEvent, this.lambdaContext);
          } else {
            this.log.error(__filename, 'init', 'lambdaEvent/lambdaContext are empty');
          }
          // break;
        }
        case 'single': {
          this.definitions.listeners.start(rExpressApp);
          await this.definitions.routes.create(rExpressApp).catch(error => {
            this.log.error(__filename, 'init:create', error);
            throw error;
          });
          break;
        }
        case 'cluster': {
          let cluster = new rCluster(this.log, this.configs, this.definitions);
          cluster.init(rExpressApp);
          break;
        }
        default: {
          this.log.error(__filename, 'unknown mode', this.mode);
        }
      }
    } catch (error) {
      this.log.error(__filename, 'init', error);
    }
  }

  /**
   * ERR_CONTENT_DECODING_FAILED in the browser is likely due to items missing in this list
   */
  apiGtwBinaryMimeTypes() {
    return [
      'application/javascript',
      'application/json',
      'application/octet-stream',
      'application/xml',
      'font/eot',
      'font/opentype',
      'font/otf',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'text/comma-separated-values',
      'text/css',
      'text/html',
      'text/javascript',
      'text/plain',
      'text/text',
      'text/xml'
    ];
  }
};
