// no unit style
const noUnitStyles = [ 'opacity', 'fontWeight', 'WebkitLineClamp' ];

// box relative style
const boxStyleList = [
  'fontSize',
  'marginTop',
  'marginBottom',
  'paddingTop',
  'paddingBottom',
  'height',
  'top',
  'bottom',
  'width',
  'maxWidth',
  'left',
  'right',
  'paddingRight',
  'paddingLeft',
  'marginLeft',
  'marginRight',
  'lineHeight',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'borderTopRightRadius',
  'borderTopLeftRadius',
  'borderRadius'
];


const isExpression = value => {
  return /^\{\{.*\}\}$/.test(value);
};

const parseExpression = (value, isReactNode) => {
  if (isReactNode) {
    value = value.slice(1, -1).replace(/this\./gim, '');
  } else {
    value = value.slice(2, -2).replace(/this\./gim, '');
  }
  return value
}

// eg: hello_world => HelloWorld
const line2Hump = str => {
  str = str.replace(/[_|-](\w)/g, (all, letter) => {
    return letter.toUpperCase();
  });
  str = str.charAt(0).toUpperCase() + str.slice(1);
  return str;
};

const isEmptyObj = o => {
  if (o !== null && Object.prototype.toString.call(o) === '[object Object]') {
    return !Object.keys(o).length;
  }
  return false;
};

const transComponentsMap = (compsMap = {}) => {
  if (!compsMap || !Array.isArray(compsMap.list)) {
    return [];
  }
  const list = compsMap.list;
  return list.reduce((obj, comp) => {
    const componentName = comp.name;
    if (!obj[componentName]) {
      try {
        let dependence = JSON.parse(comp.dependence);
        if (dependence) {
          comp.packageName = dependence.package;
        }
        if (!comp.dependenceVersion) {
          comp.dependenceVersion = '*';
        }
        if (/^\d/.test(comp.dependenceVersion)) {
          comp.dependenceVersion = '^' + comp.dependenceVersion;
        }
      } catch (e) {}
      obj[componentName] = comp;
    }
    return obj;
  }, {});
};

const toString = value => {
  if ({}.toString.call(value) === '[object Function]') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, (key, value) => {
      if (typeof value === 'function') {
        return value.toString();
      } else {
        return value;
      }
    });
  }

  return String(value);
};

const toUpperCaseStart = value => {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const deepClone = obj => {
  let objClone = Array.isArray(obj) ? [] : {};
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // 判断ojb子元素是否为对象，如果是，递归复制
        obj[key] && typeof obj[key] === 'object'
          ? (objClone[key] = deepClone(obj[key]))
          : (objClone[key] = obj[key]);
      }
    }
  }
  return objClone;
};

// convert to responsive unit, such as vw
const parseStyle = (style, option = {}) => {
  const { cssUnit = 'px', responsive } = option;
  const width = responsive.width || 750;
  const viewportWidth = responsive.viewportWidth || 375;
  const htmlFontsize = viewportWidth ? viewportWidth / 10 : null;

  // 1vw = width / 100
  const _w = width / 100;
  const _ratio = width / viewportWidth;

  const styleData = [];
  for (let key in style) {
    let value = style[key];
    if (boxStyleList.indexOf(key) != -1 && typeof value === 'string' && value.match('px')) {
      if (cssUnit == 'vw') {
        value = (parseInt(value) / _w).toFixed(2);
        value = value == 0 ? value : value + 'vw';
      } else if (cssUnit=='rem' && htmlFontsize) {
        const valueNum = typeof value == 'string' ? value.replace(/(px)|(rem)/, '') : value;
        const fontSize = (valueNum * (viewportWidth / width)).toFixed(2);
        value = parseFloat((fontSize / htmlFontsize).toFixed(2));
        value =  value ? `${value}rem` : value;
      } else {
        value = parseInt(value).toFixed(2);
        value = value == 0 ? value : value + 'px';
      }
      styleData.push(`${parseCamelToLine(key)}: ${value}`);
    } else if (noUnitStyles.indexOf(key) != -1) {
      if (typeof value === 'string' && value.match('px')) {
        styleData.push(`${parseCamelToLine(key)}: ${parseFloat(value)}`);
      } else {
        styleData.push(`${parseCamelToLine(key)}: ${value}`);
      }
    } else {
      if (key === 'fontFamily') {
        const items = value.split(',');
        const newItems = [];
        items.length && items.map(item => {
          if (/\s/g.test(item) && !/\"/g.test(item)) {
            newItems.push(`"${item.replace(/(^\s*)|(\s*$)/g, "")}"`)
          } else {
            newItems.push(item);
          }
        });
        value = newItems.join(',');
      }
      styleData.push(`${parseCamelToLine(key)}: ${value}`);
    }
  }

  return styleData.join(';');
};

// parse function, return params and content
const parseFunction = func => {
  const funcString = func.toString();
  const params = funcString.match(/\([^\(\)]*\)/)[0].slice(1, -1);
  const content = funcString.slice(
    funcString.indexOf('{') + 1,
    funcString.lastIndexOf('}')
  );
  return {
    params,
    content
  };
};

// parse layer props(static values or expression)
const parseProps = (value, isReactNode) => {
  if (typeof value === 'string') {
    if (isExpression(value)) {
      return parseExpression(value, isReactNode)
    }

    if (isReactNode) {
      return value;
    } else {
      return `'${value}'`;
    }
  } else if (typeof value === 'function') {
    const {params, content} = parseFunction(value);
    return `(${params}) => {${content}}`;
  } else if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value)
  } else if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `[${value.map(v => parseProps(v)).join(', ')}]`
    }
    return `{${Object.keys(value).map(key => {
      return `${/^\w+$/.test(key) ? key :  `'${key}'`}: ${parseProps(value[key])}`
    }).join(', ')}}`
  }
};

// parse condition: whether render the layer
const parseCondition = (condition, render) => {
  if (typeof condition === 'boolean') {
    return condition ? `${render}` : ''
  } else if (typeof condition === 'string' && isExpression(condition)) {
    condition = parseExpression(condition)
    return condition ? `(${condition}) && ${render}` : `${render}`
  }
  return render;
};

// flexDirection -> flex-direction
const parseCamelToLine = str => {

  str = str
  .split(/(?=[A-Z])/)
  .join('-');

  if (/^[A-Z].*/.test(str)) {
    str = '-' + str;
  }

  return str.toLowerCase();
};

// style obj -> css
const generateCSS = style => {
  let css = '';

  for (let layer in style) {
    css += `.${layer} {`;
    for (let key in style[layer]) {
      css += `${parseCamelToLine(key)}: ${style[layer][key]};\n`;
    }
    css += '}';
  }

  return css;
};

// parse loop render
const parseLoop = (loop, loopArg, render, states, schema) => {
  let data;
  let loopArgItem = (loopArg && loopArg[0]) || 'item';
  let loopArgIndex = (loopArg && loopArg[1]) || 'index';

  if (Array.isArray(loop)) {
    data = toString(loop);
  } else if (isExpression(loop)) {
    data = parseExpression(loop) || '[]'
  }

  // remove `this`
  const re = new RegExp(`this.${loopArgItem}`, 'g');
  render = render.replace(re, loopArgItem);
  let stateValue = data;
  if (data.match(/this\.state\./)) {
    stateValue = `state.${data.split('.').pop()}`;
  }

  if (schema.condition) {
    render = parseCondition(schema.condition, render);
  }

  return {
    hookState: [],
    value: `((${stateValue} || []).map((${loopArgItem}, ${loopArgIndex}) => {
      return (\`${render}\`);
    })).join('')`
  };
};

// parse state
const parseState = states => {
  let stateName = 'state';
  // hooks state
  return `const [${stateName}, set${toUpperCaseStart(
    stateName
  )}] = useState(${toString(JSON.parse(states)) || null});`;
};

// replace state
const replaceState = render => {
  // remove `this`
  let stateName = 'state';
  const re = new RegExp(`this.state`, 'g');
  return render.replace(re, stateName);
};


// get children text
const getText = schema => {
  let text = '';

  const getChildrenText = schema => {
    const type = schema.componentName.toLowerCase();
    if (type === 'text') {
      text += parseProps(schema.props.text || schema.text, true).replace(/\{/g, '${');
    }

    schema.children &&
      Array.isArray(schema.children) &&
      schema.children.map(item => {
        getChildrenText(item);
      });
  };

  getChildrenText(schema);

  return text;
};

module.exports = {
  isExpression,
  toString,
  transComponentsMap,
  line2Hump,
  toUpperCaseStart,
  parseStyle,
  deepClone,
  parseFunction,
  parseLoop,
  parseCondition,
  parseProps,
  parseState,
  replaceState,
  generateCSS,
  getText,
};