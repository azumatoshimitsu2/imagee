// A deliberately limited interpreter for the checked-in schemas, not a general JSON Schema library.
export class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}
export function check(condition, message) { if (!condition) throw new ValidationError(message); }
export const clone = value => structuredClone(value);
export function equal(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && equal(a[k], b[k]));
}
export function safeJSON(value, depth = 0) {
  check(depth < 80, 'JSON nesting is too deep');
  check(value === null || ['string', 'number', 'boolean', 'object'].includes(typeof value), 'Non-JSON value');
  if (typeof value === 'number') check(Number.isFinite(value), 'Non-finite number');
  if (value && typeof value === 'object') {
    check(Array.isArray(value) || [Object.prototype, null].includes(Object.getPrototypeOf(value)), 'Expected plain JSON object');
    for (const [key, child] of Object.entries(value)) {
      check(!['__proto__', 'prototype', 'constructor'].includes(key), `Unsafe key: ${key}`);
      safeJSON(child, depth + 1);
    }
  }
}
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
}
export function validateSchema(value, schema, schemas, root = schema, path = '$') {
  const supported = ['$schema','$defs','$ref','type','required','properties','additionalProperties','propertyNames','const','enum','minLength','maxLength','minimum','maximum','exclusiveMinimum','minItems','maxItems','uniqueItems','items','format','description'];
  check(Object.keys(schema).every(key => supported.includes(key)), `${path}: unsupported schema keyword`);
  if (schema.$ref) {
    const [file, fragment = ''] = schema.$ref.split('#');
    const document = file ? schemas[file] : root;
    check(document, `Unknown schema: ${file}`);
    const target = fragment.split('/').filter(Boolean).reduce((node, key) => node?.[key.replace(/~1/g, '/').replace(/~0/g, '~')], document);
    check(target, `Unknown schema reference: ${schema.$ref}`);
    return validateSchema(value, target, schemas, document, path);
  }
  const matches = type => type === 'null' ? value === null : type === 'array' ? Array.isArray(value) : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : type === 'integer' ? Number.isInteger(value) : typeof value === type;
  if (schema.type) check([schema.type].flat().some(matches), `${path}: incorrect type`);
  if (Object.hasOwn(schema, 'const')) check(equal(value, schema.const), `${path}: incorrect constant`);
  if (schema.enum) check(schema.enum.some(v => equal(value, v)), `${path}: unknown value`);
  if (typeof value === 'string') {
    if (schema.minLength !== undefined) check([...value].length >= schema.minLength, `${path}: too short`);
    if (schema.maxLength !== undefined) check([...value].length <= schema.maxLength, `${path}: too long`);
    if (schema.format === 'date') check(validDate(value), `${path}: invalid date`);
    if (schema.format === 'date-time') check(validTimestamp(value), `${path}: invalid timestamp`);
  }
  if (typeof value === 'number') {
    check(Number.isFinite(value), `${path}: non-finite number`);
    if (schema.minimum !== undefined) check(value >= schema.minimum, `${path}: below minimum`);
    if (schema.maximum !== undefined) check(value <= schema.maximum, `${path}: above maximum`);
    if (schema.exclusiveMinimum !== undefined) check(value > schema.exclusiveMinimum, `${path}: below exclusive minimum`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined) check(value.length >= schema.minItems, `${path}: insufficient items`);
    if (schema.maxItems !== undefined) check(value.length <= schema.maxItems, `${path}: too many items`);
    if (schema.uniqueItems) check(value.every((v, i) => !value.slice(0, i).some(p => equal(p, v))), `${path}: duplicate item`);
    if (schema.items) value.forEach((item, i) => validateSchema(item, schema.items, schemas, root, `${path}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const key of schema.required ?? []) check(Object.hasOwn(value, key), `${path}.${key}: missing`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.propertyNames) validateSchema(key, schema.propertyNames, schemas, root, path);
      const child = schema.properties?.[key];
      if (child) validateSchema(item, child, schemas, root, `${path}.${key}`);
      else if (schema.additionalProperties === false) check(false, `${path}.${key}: unknown field`);
      else if (typeof schema.additionalProperties === 'object') validateSchema(item, schema.additionalProperties, schemas, root, `${path}.${key}`);
    }
  }
}
export function indexById(items, name = 'items') {
  check(Array.isArray(items), `${name}: expected array`);
  const result = new Map();
  for (const item of items) {
    check(typeof item.id === 'string' && item.id.length > 0 && !result.has(item.id), `${name}: invalid or duplicate id`);
    result.set(item.id, item);
  }
  return result;
}
