const co = require('co');
const xtpl = require('xtpl');
const fs = require('fs');
const thunkify = require('thunkify');
const path = require('path');
const prettier = require('prettier');
const { NodeVM } = require('vm2');
const _ = require('lodash');
const dslHelper = require('@imgcook/dsl-helper');

const data = require('./data.json');
const originData = require('./origin.json');

const vm = new NodeVM({
  console: 'inherit',
  sandbox: {}
});

co(function*() {
  const xtplRender = thunkify(xtpl.render);
  const code = fs.readFileSync(
    path.resolve(__dirname, '../src/index.js'),
    'utf8'
  );
  const renderInfo = vm.run(code)(data, {
    prettier: prettier,
    helper: dslHelper,
    _: _,
    originData: originData
  });
  const renderData = renderInfo.renderData;
  const ret = yield xtplRender(
    path.resolve(__dirname, '../src/template.xtpl'),
    renderData,
    {}
  );
  fs.writeFileSync(path.join(__dirname, '../test/template.result.js'), ret);
  fs.writeFileSync(
    path.join(__dirname, '../test/template.result.json'),
    JSON.stringify(renderInfo, null, 2)
  );
  fs.writeFileSync(path.join(__dirname, '../test/template.result.html'), ret);

  console.log('代码生成成功');
});
