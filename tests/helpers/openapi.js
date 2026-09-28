import { expect } from 'chai';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createSwaggerSpec } from '../../src/docs/swagger.config.js';

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
let specification;

// Comparar respuestas de MongoDB con el contrato público, sin cambiar el servidor.
export async function expectDocumentedResponse(path, method, response) {
  specification ??= SwaggerParser.validate(createSwaggerSpec({ mocksEnabled: true, loggerTestEnabled: true }));
  const spec = await specification;
  const schema = spec.paths[path][method].responses[response.status].content['application/json'].schema;
  const validate = ajv.compile(schema);
  expect(validate(response.body), JSON.stringify(validate.errors)).to.equal(true);
}
