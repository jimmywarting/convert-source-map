'use strict'
/* jshint asi: true */

const { test } = require('tap')
const generator = require('inline-source-map')
const convert = require('../index.js')

const gen = generator({ charset: 'utf-8' })
  .addMappings('foo.js', [{ original: { line: 2, column: 3 }, generated: { line: 5, column: 10 } }], { line: 5 })
  .addGeneratedMappings('bar.js', 'var a = 2;\nconsole.log(a)', { line: 23, column: 22 })

const base64 = gen.base64Encode()
const comment = gen.inlineMappingUrl()
const json = gen.toString()
const obj = JSON.parse(json)

test('different formats', function (t) {
  t.equal(convert.fromComment(comment).toComment(), comment, 'comment -> comment')
  t.equal(convert.fromComment(comment).toBase64(), base64, 'comment -> base64')
  t.equal(convert.fromComment(comment).toJSON(), json, 'comment -> json')
  t.same(convert.fromComment(comment).toObject(), obj, 'comment -> object')

  t.equal(convert.fromBase64(base64).toBase64(), base64, 'base64 -> base64')
  t.equal(convert.fromBase64(base64).toComment(), comment, 'base64 -> comment')
  t.equal(convert.fromBase64(base64).toJSON(), json, 'base64 -> json')
  t.same(convert.fromBase64(base64).toObject(), obj, 'base64 -> object')

  t.equal(convert.fromJSON(json).toJSON(), json, 'json -> json')
  t.equal(convert.fromJSON(json).toBase64(), base64, 'json -> base64')
  t.equal(convert.fromJSON(json).toComment(), comment, 'json -> comment')
  t.same(convert.fromJSON(json).toObject(), obj, 'json -> object')
  t.end()
})

test('to object returns a copy', function (t) {
  const c = convert.fromJSON(json)
  const o = c.toObject()
  o.version = '99'
  t.equal(c.toObject().version, 3, 'setting property on returned object does not affect original')
  t.end()
})

test('to multi-line map', function (t) {
  const c = convert.fromObject(obj)
  const s = c.toComment({ multiline: true })
  t.match(s, /^\/\*# sourceMappingURL=.+ \*\/$/)
  t.end()
})

test('to map file comment', function (t) {
  t.equal(convert.generateMapFileComment('index.js.map'), '//# sourceMappingURL=index.js.map')
  t.equal(convert.generateMapFileComment('index.css.map', { multiline: true }), '/*# sourceMappingURL=index.css.map */')
  t.end()
})

test('from source', function (t) {
  const foo = [
    'function foo() {',
    ' console.log("hello I am foo");',
    ' console.log("who are you");',
    '}',
    '',
    'foo();',
    ''
  ].join('\n')
  const map = '//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9'
  const otherMap = '//# sourceMappingURL=data:application/json;charset=utf-8;base64,otherZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9'

  function getComment (src) {
    const map = convert.fromSource(src)
    return map ? map.toComment() : null
  }

  t.equal(getComment(foo), null, 'no comment returns null')
  t.equal(getComment(foo + map), map, 'beginning of last line')
  t.equal(getComment(foo + '    ' + map), map, 'indented of last line')
  t.equal(getComment(foo + '   ' + map + '\n\n'), map, 'indented on last non empty line')
  t.equal(getComment(foo + map + '\nconsole.log("more code");\nfoo()\n'), map, 'in the middle of code')
  t.equal(getComment(foo + otherMap + '\n' + map), map, 'finds last map in source')
  t.end()
})

test('from source with a large source', function (t) {
  const foo = [
    'function foo() {',
    ' console.log("hello I am foo");',
    ' console.log("who are you");',
    '}',
    '',
    'foo();',
    ''
  ].join('\n')
  const map = '//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9'
  const otherMap = '//# sourceMappingURL=data:application/json;charset=utf-8;base64,otherZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9'

  function getComment (src) {
    const map = convert.fromSource(src, true)
    return map ? map.toComment() : null
  }

  t.equal(getComment(foo), null, 'no comment returns null')
  t.equal(getComment(foo + map), map, 'beginning of last line')
  t.equal(getComment(foo + '    ' + map), map, 'indented of last line')
  t.equal(getComment(foo + '   ' + map + '\n\n'), map, 'indented on last non empty line')
  t.equal(getComment(foo + map + '\nconsole.log("more code");\nfoo()\n'), map, 'in the middle of code')
  t.equal(getComment(foo + otherMap + '\n' + map), map, 'finds last map in source')
  t.end()
})

test('remove comments', function (t) {
  const foo = [
    'function foo() {',
    ' console.log("hello I am foo");',
    ' console.log("who are you");',
    '}',
    '',
    'foo();',
    ''
  ].join('\n')
  // this one is old spec on purpose
  const map = '//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9'
  const otherMap = '//# sourceMappingURL=data:application/json;base64,ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9'
  const extraCode = '\nconsole.log("more code");\nfoo()\n'

  t.equal(convert.removeComments(foo + map), foo, 'from last line')
  t.equal(convert.removeComments(foo + map + extraCode), foo + extraCode, 'from the middle of code')
  t.equal(convert.removeComments(foo + otherMap + extraCode + map), foo + extraCode, 'multiple comments from the middle of code')
  t.end()
})

test('remove map file comments', function (t) {
  const foo = [
    'function foo() {',
    ' console.log("hello I am foo");',
    ' console.log("who are you");',
    '}',
    '',
    'foo();',
    ''
  ].join('\n')
  const fileMap1 = '//# sourceMappingURL=foo.js.map'
  const fileMap2 = '/*# sourceMappingURL=foo.js.map */'

  t.equal(convert.removeMapFileComments(foo + fileMap1), foo, '// style filemap comment')
  t.equal(convert.removeMapFileComments(foo + fileMap2), foo, '/* */ style filemap comment')
  t.end()
})

test('pretty json', function (t) {
  const mod = convert.fromJSON(json).toJSON(2)
  const expected = JSON.stringify(obj, null, 2)

  t.equal(
    mod
    , expected
    , 'pretty prints json when space is given')
  t.end()
})

test('adding properties', function (t) {
  const mod = convert
    .fromJSON(json)
    .addProperty('foo', 'bar')
    .toJSON()
  const expected = JSON.parse(json)
  expected.foo = 'bar'
  t.equal(
    mod
    , JSON.stringify(expected)
    , 'includes added property'
  )
  t.end()
})

test('adding properties, existing property', function (t) {
  try {
    convert
      .fromJSON(json)
      .addProperty('foo', 'bar')
      .addProperty('foo', 'bar')
  } catch (error) {
    t.equal(error.message, 'property "foo" already exists on the sourcemap, use set property instead', 'the error message includes the property name')
  }
  t.end()
})

test('setting properties', function (t) {
  const mod = convert
    .fromJSON(json)
    .setProperty('version', '2')
    .setProperty('mappings', ';;;UACG')
    .setProperty('should add', 'this')
    .toJSON()
  const expected = JSON.parse(json)
  expected.version = '2'
  expected.mappings = ';;;UACG'
  expected['should add'] = 'this'
  t.equal(
    mod
    , JSON.stringify(expected)
    , 'includes new property and changes existing properties'
  )
  t.end()
})

test('getting properties', function (t) {
  const sm = convert.fromJSON(json)

  t.equal(sm.getProperty('version'), 3, 'gets version')
  t.same(sm.getProperty('sources'), ['foo.js', 'bar.js'], 'gets sources')
  t.end()
})

test('return null fromSource when largeSource is true', function (t) {
  const mod = convert.fromSource('', true)
  const expected = null

  t.equal(
    mod
    , expected
    , 'return value should be null'
  )
  t.end()
})

test('commentRegex returns new RegExp on each get', function (t) {
  const foo = [
    'function foo() {',
    ' console.log("hello I am foo");',
    ' console.log("who are you");',
    '}',
    '',
    'foo();',
    ''
  ].join('\n')
  const map = '//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9'
  const re = convert.commentRegex

  re.exec(foo + map)

  t.equal(re.lastIndex, 372, 'has an updated lastIndex')
  t.equal(convert.commentRegex.lastIndex, 0, 'a fresh RegExp has lastIndex of 0')

  t.end()
})

test('mapFileCommentRegex returns new RegExp on each get', function (t) {
  const foo = [
    'function foo() {',
    ' console.log("hello I am foo");',
    ' console.log("who are you");',
    '}',
    '',
    'foo();',
    ''
  ].join('\n')
  const map = '//# sourceMappingURL=foo.js.map'
  const re = convert.mapFileCommentRegex

  re.exec(foo + map)

  t.equal(re.lastIndex, 119, 'has an updated lastIndex')
  t.equal(convert.mapFileCommentRegex.lastIndex, 0, 'a fresh RegExp has lastIndex of 0')

  t.end()
})
