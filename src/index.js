module.exports = function(schema, option) {
  const {prettier, helper} = option;
  const {line, indentTab} = helper.utils;

  // imports
  const imports = [];

  // inline style
  const style = {};

  // Global Public Functions
  const utils = [];

  // Classes 
  const classes = [];

  // events
  const events = [];

  // 1vw = width / 100
  const _w = option.responsive.width / 100;

  const isExpression = (value) => {
    return /^\{\{.*\}\}$/.test(value);
  }

  const toString = (value) => {
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
      })
    }

    return String(value);
  };

  // convert to responsive unit, such as vw
  const parseStyle = (style) => {
    for (let key in style) {
      switch (key) {
        case 'fontSize':
        case 'marginTop':
        case 'marginBottom':
        case 'paddingTop':
        case 'paddingBottom':
        case 'height':
        case 'top':
        case 'bottom':
        case 'width':
        case 'maxWidth':
        case 'left':
        case 'right':
        case 'paddingRight':
        case 'paddingLeft':
        case 'marginLeft':
        case 'marginRight':
        case 'lineHeight':
        case 'borderBottomRightRadius':
        case 'borderBottomLeftRadius':
        case 'borderTopRightRadius':
        case 'borderTopLeftRadius':
        case 'borderRadius':
          style[key] = (parseInt(style[key]) / _w).toFixed(2) + 'vw';
          break;
      }
    }

    return style;
  }

  // parse function, return params and content
  const parseFunction = (func) => {
    const funcString = func.toString();
    const params = funcString.match(/\([^\(\)]*\)/)[0].slice(1, -1);
    const content = funcString.slice(funcString.indexOf('{') + 1, funcString.lastIndexOf('}'));
    return {
      params,
      content
    };
  }

  // parse layer props(static values or expression)
  const parseProps = (value, isDirectValue) => {
    if (typeof value === 'string') {
      if (isExpression(value)) {
        if (isDirectValue) {
          return `\$\{${value.slice(2, -2)}\}`
        } else {
          return `"\$\{${value.slice(2, -2)}\}"`;
        }
      }

      if (isDirectValue) {
        return value;
      } else {
        return `"${value}"`;
      }
    }

    return value;
  }

  // parse async dataSource
  const parseDataSource = (data) => {
    const name = data.id;
    const {uri, method, params} = data.options;
    const action = data.type;
    let payload = {};

    switch (action) {
      case 'fetch':
        payload = {
          method: method
        };

        break;
      case 'jsonp':
        if (imports.indexOf(`<script src="https://cdn.bootcss.com/fetch-jsonp/1.1.3/fetch-jsonp.js"></script>`) === -1) {
          imports.push(`<script src="https://cdn.bootcss.com/fetch-jsonp/1.1.3/fetch-jsonp.js"></script>`);
        }
        break;
    }

    Object.keys(data.options).forEach((key) => {
      if (['uri', 'method', 'params'].indexOf(key) === -1) {
        payload[key] = toString(data.options[key]);
      }
    });

    // params parse should in string template
    if (params) {
      payload = `${toString(payload).slice(0, -1)} ,body: ${isExpression(params) ? parseProps(params) : toString(params)}}`;
    } else {
      payload = toString(payload);
    }

    let result = `{
      ${action === 'json' ? action : 'fetchJsonp'}(${parseProps(uri)}, ${toString(payload)})
        .then((response) => response.json())
    `;

    if (data.dataHandler) {
      const { params, content } = parseFunction(data.dataHandler);
      result += `.then((${params}) => {${content}})
        .catch((e) => {
          console.log('error', e);
        })
      `
    }

    result += '}';

    return `${name}() ${result}`;
  }

  // parse condition: whether render the layer
  const parseCondition = (condition, render) => {
    if (typeof condition === 'boolean') {
      return `${condition} ? ${render} : ''`;
    } else if (typeof condition === 'string') {
      return `${condition.slice(2, -2)} ? \`${render}\` : ''`;
    }
  }

  // parse loop render
  const parseLoop = (loop, loopArg, render) => {
    let data;
    let loopArgItem = (loopArg && loopArg[0]) || 'item';
    let loopArgIndex = (loopArg && loopArg[1]) || 'index';

    if (Array.isArray(loop)) {
      data = toString(loop);
    } else if (isExpression(loop)) {
      data = loop.slice(2, -2);
    }

    // add loop key
    const tagEnd = render.match(/^<.+?\s/)[0].length;
    render = `${render.slice(0, tagEnd)}${render.slice(tagEnd)}`;

    // remove `this` 
    const re = new RegExp(`this.${loopArgItem}`, 'g')
    render = render.replace(re, loopArgItem);

    return `${data}.map((${loopArgItem}, ${loopArgIndex}) => {
      return \`${render}\`;
    })`;
  }

  // generate render xml
  const generateRender = (schema) => {
    const type = schema.componentName.toLowerCase();
    const className = schema.props && schema.props.className;
    const classString = className ? ` class="${className}"` : '';
    let elementId = '';
    let elementIdString = ''; 

    if (className) {
      style[className] = parseStyle(schema.props.style);
    }

    let xml;
    let props = '';

    Object.keys(schema.props).forEach((key) => {
      if (['className', 'style', 'text', 'src'].indexOf(key) === -1) {
        if (/^on/.test(key) && typeof schema.props[key] === 'function') {
          const {params, content} = parseFunction(schema.props[key]);
          elementId = `${schema.componentName.toLowerCase()}_${parseInt(Math.random() * 1000)}`;
          elementIdString = ` data-id="${elementId}"`;
          events.push(`
            document.querySelectorAll('[data-id="${elementId}"]').forEach(function(element) {
              element.addEventListener('${key.slice(2).toLowerCase()}', function(${params}) {
                ${content}
              });
            });
          `);
        } else {
          props += ` ${key}=${parseProps(schema.props[key])}`;
        }
      }
    })

    switch(type) {
      case 'text':
        const innerText = parseProps(schema.props.text, true);
        xml = `<span${elementIdString}${classString}${props}>${innerText}</span>`;
        break;
      case 'image':
        const source = parseProps(schema.props.src);
        xml = `<img${elementIdString}${classString}${props} src=${source} />`;
        break;
      case 'div':
      case 'page':
      case 'block':
      case 'component':
        if (schema.children && schema.children.length) {
          xml = `<div${elementIdString}${classString}${props}>${transform(schema.children)}</div>`;
        } else {
          xml = `<div${elementIdString}${classString}${props} />`;
        }
        break;
    }

    if (schema.loop) {
      xml = parseLoop(schema.loop, schema.loopArgs, xml)
    }
    if (schema.condition) {
      xml = parseCondition(schema.condition, xml);
    }
    if (schema.loop || schema.condition) {
      xml = `\$\{${xml}\}`;
    }

    return xml;
  }

  // parse schema
  const transform = (schema) => {
    let result = '';

    if (Array.isArray(schema)) {
      schema.forEach((layer) => {
        result += transform(layer);
      });
    } else {
      const type = schema.componentName.toLowerCase();

      if (['page', 'block', 'component'].indexOf(type) !== -1) {
        // 容器组件处理: state/method/dataSource/lifeCycle/render
        const states = [];
        const lifeCycles = [];
        const methods = [];
        const init = [];
        const render = [`render(){ return \``];
        let classData = [`class ${schema.componentName}_${classes.length} {`];

        if (schema.state) {
          states.push(`state = ${toString(schema.state)}`);
        }

        if (schema.methods) {
          Object.keys(schema.methods).forEach((name) => {
            const { params, content } = parseFunction(schema.methods[name]);
            methods.push(`${name}(${params}) {${content}}`);
          });
        }

        if (schema.dataSource && Array.isArray(schema.dataSource.list)) {
          schema.dataSource.list.forEach((item) => {
            if (typeof item.isInit === 'boolean' && item.isInit) {
              init.push(`this.${item.id}();`)
            } else if (typeof item.isInit === 'string') {
              init.push(`if (${parseProps(item.isInit)}) { this.${item.id}(); }`)
            }
            methods.push(parseDataSource(item));
          });

          if (schema.dataSource.dataHandler) {
            const { params, content } = parseFunction(schema.dataSource.dataHandler);
            methods.push(`dataHandler(${params}) {${content}}`);
            init.push(`this.dataHandler()`);
          }
        }

        if (schema.lifeCycles) {
          if (!schema.lifeCycles['_constructor']) {
            lifeCycles.push(`constructor(props, context) { ${init.join('\n')}}`);
          }

          Object.keys(schema.lifeCycles).forEach((name) => {
            const { params, content } = parseFunction(schema.lifeCycles[name]);

            if (name === '_constructor') {
              lifeCycles.push(`constructor(${params}) { ${content} ${init.join('\n')}}`);
            }
          });
        }

        render.push(generateRender(schema))
        render.push('`;}');

        classData = classData.concat(states).concat(lifeCycles).concat(methods).concat([render.join('')]);
        classData.push('}');

        classes.push(classData.join('\n'));
      } else {
        result += generateRender(schema);
      }
    }

    return result;
  };

  // flexDirection -> flex-direction
  const parseCamelToLine = (string) => {
    return string.split(/(?=[A-Z])/).join('-').toLowerCase();
  }

  // style obj -> css
  const generateCSS = (style) => {
    let css = '';

    for (let layer in style) {
      css += `.${layer} {`;
      for (let key in style[layer]) {
        css += `${parseCamelToLine(key)}: ${style[layer][key]};\n`
      }
      css += '}';
    }

    return css;
  };

  if (option.utils) {
    Object.keys(option.utils).forEach((name) => {
      utils.push(`const ${name} = ${option.utils[name]}`);
    });
  }

  // start parse schema
  transform(schema);

  const prettierHtmlOpt = {
    parser: 'html'
  };
  const prettierJsOpt = {
    parser: 'babel'
  };
  const prettierCssOpt = {
    parser: 'css'
  };

  return {
    panelDisplay: [
      {
        panelName: `index.html`,
        panelValue: prettier.format(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="ie=edge">
            <title>Document</title>
            <link rel="stylesheet" href="./style.css" />
            ${imports.join('\n')}
          </head>
          <body>
          </body>
          <script src="./index.js"></script>
          <script>
            ${events.join('\n')}
            </script>
          </html>
        `, prettierHtmlOpt),
        panelType: 'html'
      },
      {
        panelName: `index.js`,
        panelValue: prettier.format(`
          ${utils.join('\n')}
          ${classes.join('\n')}
          var page = new ${schema.componentName}_0;
          var html = page.render();
          document.querySelector('body').innerHTML = html;
        `, prettierJsOpt),
        panelType: 'js'
      },
      {
        panelName: `style.css`,
        panelValue: prettier.format(`${generateCSS(style)}`, prettierCssOpt),
        panelType: 'css'
      }
    ],
    noTemplate: true
  };
}
