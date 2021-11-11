const { genStyleClass } = require('./cssUtils');
const exportStatic = require('./exportStatic');
const exportDynamic = require('./exportDynamic');

module.exports = function(schema, option) {

  const imgcookConfig = Object.assign(
    {
      globalCss: true,
      cssUnit: 'rpx',
      inlineStyle: 'className',
      cssStyle: 'camelCase',
      htmlType: 'html静态'
    },
    option._.get(schema, 'imgcook.dslConfig')
  );
  option.imgcookConfig = imgcookConfig;



  // 处理 className 命名
  const processClassName = (node) => {
    if (node.props && node.props.className) {
      node.props.className = genStyleClass(
        node.props.className,
        imgcookConfig.cssStyle
      );
    }
    if (node.children && node.children.length) {
      for (let i = 0; i < node.children.length; i++) {
        processClassName(node.children[i]);
      }
    }
  };
  processClassName(schema);



  let result;

  console.log('imgcookConfig', imgcookConfig.htmlType)
  if (imgcookConfig.htmlType == 'js动态') {
    result = exportDynamic(schema, option);
  } else {
    result = exportStatic(schema, option);
  }

  return {
    panelDisplay: result,
    noTemplate: true,
  };
};
