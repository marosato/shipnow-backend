import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import { Writable } from 'node:stream';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogger, configureLogger, closeLogger, LOG_LEVELS } from '../src/config/logger.config.js';
import { createApp } from '../src/app.js';
import { validateEnv } from '../src/config/env.config.js';
import { errorHandler } from '../src/middlewares/error-handler.js';

function capture() {
  const lines = [];
  const stream = new Writable({ write(chunk, encoding, done) {
    lines.push(...chunk.toString().trim().split('\n').filter(Boolean).map(line => JSON.parse(line)));
    done();
  } });
  return { stream, lines };
}

describe('M4: Winston y persistencia real en archivos temporales', () => {
  let directory;
  beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'shipnow-logs-')); });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
  for (const nodeEnv of ['development', 'production']) {
    it(`${nodeEnv}: consola filtra niveles y archivo solo persiste error/fatal`, async () => {
      const { stream, lines } = capture();
      const log = createLogger({ nodeEnv, directory, consoleStream: stream });
      for (const level of Object.keys(LOG_LEVELS)) log.log(level, `TEST_${level}`);
      await closeLogger(log);
      expect(lines.map(x => x.level)).to.deep.equal(nodeEnv === 'development'
        ? ['fatal', 'error', 'warning', 'info', 'http', 'debug'] : ['fatal', 'error', 'warning', 'info']);
      const filenames = (await readdir(directory)).filter(name => /^error-.*\.log$/.test(name));
      // Al resolverse closeLogger el archivo ya debe existir y estar completo.
      expect(filenames, 'closeLogger debe esperar la escritura del archivo').to.have.length(1);
      const records = (await readFile(join(directory, filenames[0]), 'utf8'))
        .trim().split('\n').map(JSON.parse);
      expect(records.map(x => x.level)).to.deep.equal(['fatal', 'error']);
      for (const record of records) {
        expect(Number.isNaN(Date.parse(record.timestamp))).to.equal(false);
        expect(record.message).to.match(/^TEST_/);
      }
    });
  }
  it('rota por tamaño y limita la cantidad de archivos', async () => {
    const { stream } = capture();
    const log = createLogger({ nodeEnv: 'production', directory, consoleStream: stream, maxsize: '1k', maxFiles: 3 });
    // Esperar escritura de cada registro para probar rotación, no carreras del productor.
    for (let i = 0; i < 16; i++) {
      log.error('ROTATION_TEST', { sequence: i, padding: 'x'.repeat(180) });
      // logged significa encolado. Esperar evidencia en disco, con límite de tiempo.
      let persisted = false;
      for (let attempt = 0; attempt < 100 && !persisted; attempt++) {
        const names = (await readdir(directory)).filter(name => /^error-.*\.log(?:\.\d+)?$/.test(name));
        const text = (await Promise.all(names.map(name => readFile(join(directory, name), 'utf8')))).join('');
        persisted = text.includes(`"sequence":${i},`) || text.includes(`"sequence":${i}}`);
        if (!persisted) await new Promise(resolve => setTimeout(resolve, 5));
      }
      expect(persisted, `registro ${i} escrito`).to.equal(true);
    }
    await closeLogger(log);
    const files = (await readdir(directory)).filter(name => /^error-.*\.log(?:\.\d+)?$/.test(name));
    expect(files.length).to.be.within(2, 3);
    const contents = (await Promise.all(files.map(name => readFile(join(directory, name), 'utf8')))).join('\n');
    const records = contents.split('\n').filter(Boolean).map(JSON.parse);
    expect(records.some(x => x.sequence === 15)).to.equal(true);
    expect(records.some(x => x.sequence === 0)).to.equal(false);
    expect(records.every(x => x.level === 'error')).to.equal(true);
  });
});

describe('M4: integración del logger con HTTP', () => {
  let lines;
  beforeEach(() => {
    const captureStream = capture();
    lines = captureStream.lines;
    configureLogger({ nodeEnv: 'development', files: false, consoleStream: captureStream.stream });
  });
  afterEach(() => { configureLogger({ silent: true, files: false }); });
  it('/loggerTest emite los seis niveles y responde sin simular un fallo HTTP', async () => {
    const response = await request(createApp({ loggerTestEnabled: true })).get('/loggerTest');
    expect(response.status).to.equal(200);
    const records = lines.filter(x => x.message === 'LOGGER_TEST');
    expect(records.map(x => x.level)).to.deep.equal(Object.keys(LOG_LEVELS));
    expect(records.every(x => x.simulated === true)).to.equal(true);
  });
  it('deshabilita el endpoint por defecto y en producción', async () => {
    const env = { PORT: '8080', NODE_ENV: 'production', MONGODB_URI: 'mongodb://localhost/demo', ENABLE_LOGGER_TEST: 'true' };
    expect(validateEnv(env).loggerTestEnabled).to.equal(false);
    expect((await request(createApp(validateEnv(env))).get('/loggerTest')).status).to.equal(404);
    expect((await request(createApp()).get('/loggerTest')).status).to.equal(404);
    expect(() => validateEnv({ ...env, ENABLE_LOGGER_TEST: 'yes' })).to.throw('ENABLE_LOGGER_TEST');
  });
  it('registra 4xx como warning y HTTP sin query, headers ni datos del body', async () => {
    await request(createApp()).post('/api/users?token=secret-query')
      .set('Authorization', 'Bearer secret-header').send({ name: 'secret-body', email: 'invalid' });
    const error = lines.find(x => x.message === 'API_ERROR');
    expect(error.level).to.equal('warning');
    expect(error.code).to.equal('INVALID_EMAIL');
    const http = lines.find(x => x.message === 'HTTP_REQUEST');
    expect(http.statusCode).to.equal(400);
    expect(http.route).to.equal('/api/users');
    expect(http.durationMs).to.be.at.least(0);
    expect(JSON.stringify(lines)).not.to.include('secret');
  });
  it('error inesperado: nivel error, respuesta M3 intacta y causa privada omitida', async () => {
    const app = express();
    app.get('/failure', async () => { throw new Error('mongodb://secret:password@host'); });
    app.use(errorHandler);
    const response = await request(app).get('/failure');
    expect(response.status).to.equal(500);
    expect(response.body.error).to.equal('INTERNAL_ERROR');
    expect(lines.find(x => x.message === 'API_ERROR').level).to.equal('error');
    expect(JSON.stringify(lines)).not.to.include('password');
  });
  it('registra generación de mocks con cantidad y lote, sin personas', async () => {
    const response = await request(createApp({ mocksEnabled: true })).get('/api/mocks/dataset?qty=2');
    const record = lines.find(x => x.message === 'MOCK_PREVIEW_CREATED');
    expect(record).to.include({ level: 'debug', qty: 2, batchId: response.body.data.batchId });
    expect(JSON.stringify(lines)).not.to.include(response.body.data.users[0].email);
  });
});
