const { expect, assert } = require('chai');
const { runCode } = require('./index');
const data = require('./data');
const _ = require('lodash');



describe('globalCss 全局样式', () => {
  it('globalCss = true 时，有 global.css 文件', async () => {
    const result = runCode(data, { globalCss: true, outputStyle: 'project'});
    expect(_.find(result, { panelName:'global.css'})).to.not.be.equal(undefined);
  });

  it('globalCss = false 时，无 global.css 文件', async () => {
    const result = runCode(data, { globalCss: false, outputStyle: 'project'});
    expect(_.find(result, { panelName:'global.css'})).to.be.equal(undefined);
  });
});



describe('cssStyle 样式名风格', () => {
  it(`cssStyle = kebabCase 时，中划线命名`, async () => {
    const schema = _.cloneDeep(data);
    schema.componentName = 'Block';
    schema.fileName = 'BlockDemo';
    schema.props.className = "class-name-01"
    const result = runCode(schema, { inlineStyle: 'import', cssStyle: 'kebabCase'});
    const file = _.find(result, { panelName:'index.css'});
    expect(file.panelValue.includes(`.class-name-01`)).to.be.equal(true);
  });

  it(`cssStyle = snakeCase 时，下划线命名`, async () => {
    const schema = _.cloneDeep(data);
    schema.componentName = 'Block';
    schema.fileName = 'BlockDemo';
    schema.props.className = "class-name-01"
    const result = runCode(schema, { inlineStyle: 'import', cssStyle: 'snakeCase'});
    const file = _.find(result, { panelName:'index.css'});

    expect(file.panelValue.includes(`.class_name_01`)).to.be.equal(true);
  });

  it(`cssStyle = camelCase 时，驼峰式命名`, async () => {
    const schema = _.cloneDeep(data);
    schema.componentName = 'Block';
    schema.fileName = 'BlockDemo';
    schema.props.className = "class-name-01"
    const result = runCode(schema, { inlineStyle: 'import', cssStyle: 'camelCase'});
    const file = _.find(result, { panelName:'index.css'});
    expect(file.panelValue.includes(`.className01`)).to.be.equal(true);
  });

})

describe('cssUnit 单位设置', () => {
  it('cssUnit = px', async () => {
    const schema = _.cloneDeep(data);
    schema.componentName = 'Block';
    schema.fileName = 'BlockDemo';
    schema.props.style.width = "300px"
    const result = runCode(schema, { inlineStyle: 'import', cssUnit: 'px'});
    const cssFile = _.find(result, { panelName:'index.css',    });
    expect(cssFile.panelValue.includes('px')).to.be.equal(true);
    expect(cssFile.panelValue.includes('vw')).to.be.equal(false);
    expect(cssFile.panelValue.includes('rem')).to.be.equal(false);
  });

  it('cssUnit = vw', async () => {
    const schema = _.cloneDeep(data);
    schema.componentName = 'Block';
    schema.fileName = 'BlockDemo';
    schema.props.style.width = "300px"
    const result = runCode(schema, { inlineStyle: 'import', cssUnit: 'vw'});
    const cssFile = _.find(result, { panelName:'index.css',    });
    expect(cssFile.panelValue.includes('px')).to.be.equal(false);
    expect(cssFile.panelValue.includes('vw')).to.be.equal(true);
    expect(cssFile.panelValue.includes('rem;')).to.be.equal(false);
  });

  it('cssUnit = rem', async () => {
    const schema = _.cloneDeep(data);
    schema.componentName = 'Block';
    schema.fileName = 'BlockDemo';
    schema.props.style.width = "300px"
    const result = runCode(schema, { inlineStyle: 'import', cssUnit: 'rem'});
    const cssFile = _.find(result, { panelName:'index.css',    });
    expect(cssFile.panelValue.includes('px')).to.be.equal(false);
    expect(cssFile.panelValue.includes('vw')).to.be.equal(false);
    expect(cssFile.panelValue.includes('rem')).to.be.equal(true);
  });


  

});


