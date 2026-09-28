import { expect } from 'chai';
import request from 'supertest';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createApp } from '../src/app.js';
import { createSwaggerSpec } from '../src/docs/swagger.config.js';
import { validateEnv } from '../src/config/env.config.js';
import { ERRORS } from '../src/errors/error-catalog.js';

const options = { mocksEnabled: true, loggerTestEnabled: true };
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
let spec;

function matchesResponse(path, method, response) {
  const schema = spec.paths[path][method].responses[response.status].content['application/json'].schema;
  const validate = ajv.compile(schema);
  expect(validate(response.body), JSON.stringify(validate.errors)).to.equal(true);
}

describe('M5: OpenAPI y documentación HTTP', () => {
  before(async () => { spec = await SwaggerParser.validate(createSwaggerSpec(options)); });

  it('valida referencias, operaciones únicas y cobertura de las diez operaciones existentes', () => {
    const operations = Object.values(spec.paths).flatMap(path => Object.values(path));
    expect(operations).to.have.length(10);
    expect(new Set(operations.map(x => x.operationId)).size).to.equal(10);
    expect(spec.info.version).to.equal('0.5.0');
    expect(spec.paths).not.to.have.property('/api/orders');
    expect(spec.paths).not.to.have.property('/api/deliveries');
    for (const operation of operations) {
      expect(operation.tags).not.to.be.empty;
      expect(operation.description).not.to.be.empty;
      expect(operation.responses).to.have.property('500');
    }
  });

  it('sirve Swagger UI, sus assets y el JSON sin MongoDB', async () => {
    const app = createApp(options);
    await request(app).get('/api/docs').expect(301);
    const html = await request(app).get('/api/docs/').expect(200);
    expect(html.text).to.include('swagger-ui');
    for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-init.js']) {
      const response = await request(app).get(`/api/docs/${asset}`).expect(200);
      expect(response.text.length).to.be.greaterThan(100);
    }
    const json = await request(app).get('/api/docs/openapi.json').expect(200);
    expect(json.body.openapi).to.equal('3.0.3');
    await SwaggerParser.validate(json.body);
  });

  it('omite rutas apagadas y documenta solo las habilitadas en producción', async () => {
    const config = validateEnv({ PORT: '9090', NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost/demo', ENABLE_MOCKS: 'true', ENABLE_LOGGER_TEST: 'true' });
    const app = createApp(config);
    const { body } = await request(app).get('/api/docs/openapi.json').expect(200);
    expect(Object.keys(body.paths)).to.deep.equal(['/api/users', '/api/users/{id}', '/api/products', '/api/products/{id}']);
    expect(body.servers[1].url).to.equal('http://127.0.0.1:9090');
    for (const path of ['/loggerTest', '/api/mocks/dataset']) {
      const response = await request(app).get(path).expect(404);
      expect(response.body.error).to.equal('ROUTE_NOT_FOUND');
    }
  });

  it('aísla documentos de dos apps con flags distintos', async () => {
    const enabled = createApp(options);
    const disabled = createApp();
    const first = await request(enabled).get('/api/docs/swagger-ui-init.js');
    await request(disabled).get('/api/docs/swagger-ui-init.js');
    const again = await request(enabled).get('/api/docs/swagger-ui-init.js');
    expect(first.text).to.equal(again.text);
    const { body } = await request(disabled).get('/api/docs/openapi.json');
    expect(body.paths).not.to.have.property('/loggerTest');
  });

  it('carga YAML desde otro directorio de trabajo', () => {
    const moduleUrl = new URL('../src/docs/swagger.config.js', import.meta.url).href;
    const code = `import { createSwaggerSpec } from ${JSON.stringify(moduleUrl)}; console.log(Object.keys(createSwaggerSpec().paths).length);`;
    expect(execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: tmpdir(), encoding: 'utf8' }).trim()).to.equal('4');
  });

  it('mantiene todos los ejemplos de errores sincronizados con M3', () => {
    for (const error of Object.values(ERRORS)) {
      expect(spec.components.examples[error.code].value).to.deep.equal({
        status: 'error', error: error.code, message: error.message,
      });
    }
  });

  it('valida respuestas reales de dataset, users mock y logger contra sus schemas', async () => {
    const app = createApp(options);
    for (const path of ['/api/mocks/dataset', '/api/mocks/users', '/loggerTest']) {
      const response = await request(app).get(path + (path.startsWith('/api/mocks') ? '?qty=2' : '')).expect(200);
      matchesResponse(path, 'get', response);
    }
  });

  it('valida errores reales de ID, paginación, body, JSON y cantidades contra lo documentado', async () => {
    const app = createApp(options);
    const cases = [
      ['get', '/api/users/not-an-id', '/api/users/{id}'],
      ['get', '/api/products?limit=101', '/api/products'],
      ['get', '/api/mocks/dataset?qty=-1', '/api/mocks/dataset'],
      ['post', '/api/users', '/api/users', { name: 'Ana', email: 'invalid' }],
      ['post', '/api/products', '/api/products', { name: 'Caja', price: 1, stock: -1 }],
      ['post', '/api/mocks/seed?qty=1', '/api/mocks/seed', { qty: 1 }],
    ];
    for (const [method, url, path, body] of cases) {
      let req = request(app)[method](url);
      if (body) req = req.send(body);
      const response = await req.expect(400);
      matchesResponse(path, method, response);
    }
    const invalid = await request(app).post('/api/users').set('Content-Type', 'application/json').send('{').expect(400);
    matchesResponse('/api/users', 'post', invalid);
    const large = await request(app).post('/api/users').send({ name: 'x'.repeat(110000) }).expect(413);
    matchesResponse('/api/users', 'post', large);
  });
});
