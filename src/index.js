module.exports = function(layoutData, opts) {
  let renderData = {};
  const _ = opts._;
  const style = {};
  const helper = opts.helper;

  const _isArray = helper.utils.isArray;
  const _concat = helper.utils.concat;
  const _line = helper.utils.line;
  const _string = helper.utils.string;
  const _indentTab = helper.utils.indentTab;
  const _setIndentTab = helper.utils.setIndentTab;

  // 无需处理的数据绑定过滤掉
  !layoutData.dataBindingStore && (layoutData.dataBindingStore = []);
  layoutData.dataBindingStore = layoutData.dataBindingStore.filter(_v => {
    if (
      _v.defaultValue &&
      _v.value.isStatic &&
      _v.value.staticType == 'STRING' &&
      _v.value.value == _v.defaultValue
    ) {
      return false;
    } else {
      return true;
    }
  });

  const COMPONENT_TYPE_MAP = {
    link: 'a',
    video: 'video',
    expview: 'div',
    scroller: 'div',
    slider: 'div',
    view: 'div',
    text: 'span',
    picture: 'img'
  };

  /**
   * @desc 所有文档相关信息的生成
   * @param originJson originJson
   * @return Object 所有文档相关信息
   */
  function generatePartsJson(originJson) {
    // 文件配置和一些必要的信息
    let fileFlowOptions = {};
    // 样式存储
    let cssStore = [];

    const getScriptStore = () => {
      return originJson.eventStore && originJson.scriptStore
        ? (originJson.eventStore || []).map(v => {
            const contentStore = (originJson.scriptStore || []).find(
              _v => _v.id === v.scriptId
            );
            return {
              belongId: v.belongId,
              content: contentStore.content,
              eventType: v.type,
              scriptName: contentStore.name
            };
          })
        : originJson.scriptStore || [];
    };
    // let scriptStore = originJson.scriptStore || [];
    let scriptStore = getScriptStore();

    let dataBindingStore = originJson.dataBindingStore || [];
    let dataConfig =
      (originJson.dataConfig && originJson.dataConfig.dynamicOrigin) || [];
    let modConfig = originJson.modStyleConfig || {
      designWidth: 750,
      designHeight: 1334
    };
    let viewportWidth = modConfig.viewportWidth || 375;
    let designWidth = modConfig.designWidth;
    let htmlFontsize = viewportWidth ? viewportWidth / 10 : null;

    let scopeClass = originJson.attrs.className;
    let mockDataStore = {};

    // js的事件部分生成
    let scriptPartsJson = generateScript(originJson, {
      indent: 0
    });
    // dom生成
    let xmlPartsJson = generateXML(originJson, {
      indent: 0
    });
    scriptPartsJson = [
      _line('window.onload = () => {', { indent: { tab: 0 } }),
      _line(`const data = ${JSON.stringify(mockDataStore)};`, {
        indent: { tab: 1 }
      }),
      ..._indentTab(scriptPartsJson, 1),
      _line('};', { indent: { tab: 0 } })
    ];
    // console.log(xmlPartsJson);
    // 样式生成
    let { stylePartsJson, styleRemCssPartsJson } = generateStyle(cssStore);
    let responsiveStylePartsJson = generateResponsiveStyle(cssStore);

    let result = {
      fileFlowOptions: fileFlowOptions,
      xmlPartsJson: xmlPartsJson,
      stylePartsJson: stylePartsJson,
      scriptPartsJson: scriptPartsJson,
      styleRemCssPartsJson: styleRemCssPartsJson
    };

    if (responsiveStylePartsJson) {
      result.responsiveStylePartsJson = responsiveStylePartsJson;
    }

    return result;

    /**
     * @desc 生成函数声明
     */
    function generateScript() {
      let scriptRet = [
        _line('const $ = window.document.querySelector.bind(window.document);')
      ];
      scriptStore.map(_v => {
        let funcInner = parseFunction(_v);
        let eventContentParts = helper.parser(funcInner.content || '');
        scriptRet = [
          ...scriptRet,
          _line(`const ${_v.scriptName} = () => {`),
          ...eventContentParts,
          _line('};')
        ];
      });
      return scriptRet;
      function parseFunction(scriptJson) {
        let args = [];
        let content = '';
        const REG_ARGS1 = /[\s\S]*export\sdefault\sfunction\s{0,1}\(([\s\S]*)\)\s{0,1}{\n([\s\S]*)\n\}/;
        const REG_ARGS2 = /[\s\S]*export\sdefault\s\(([\s\S]*)\)\s{0,1}=>\s{0,1}\{\n([\s\S]*)\n\}/;
        try {
          let scriptContent = scriptJson.content;
          let regResult =
            scriptContent.match(REG_ARGS1) || scriptContent.match(REG_ARGS2);

          if (regResult) {
            let argsArr = regResult[1].split(',');
            argsArr.map(_v => {
              if (_.trim(_v) !== '') {
                args.push(_.trim(_v));
              }
            });
            content = _.trim(regResult[2]) == '' ? '' : regResult[2];
          }
        } catch (e) {
          args = [];
          content = '';
        }

        return {
          args: args,
          content: content
        };
      }
    }

    /**
     * @desc 生成数据绑定值
     * @param {*} json
     * @param {*} options
     */
    function generateBindValue(binding) {
      let value = binding.value;
      if (value) {
        if (value.isStatic) {
          if (value.staticType == 'STRING' && value.value) {
            return "'" + value.value + "'";
          } else {
            return value.value;
          }
        } else if (Array.isArray(value.sourceValue)) {
          let s = '';
          value.sourceValue.map((_v, _i) => {
            if (_v.type === 'STATIC') {
              s += _i == 0 ? `'${_v.value}'` : ` + '${_v.value}'`;
            } else {
              mockDataStore[sliceData(_v.value)] = binding.defaultValue;
              s += _i == 0 ? `${slice(_v.value)}` : ` + ${slice(_v.value)}`;
            }
          });
          return s;
        } else if (value.source && value.sourceValue) {
          return `${value.source}.${value.sourceValue}`;
        }
      }
      function slice(v) {
        return v.slice(2, v.length - 1);
      }
      function sliceData(v) {
        return v.slice(7, v.length - 1);
      }
    }

    /**
     * @desc 递归节点，生成xml
     * @param json layoutJson
     * @param options 配置信息
     * @return result 所有xml遍历过程中的产出
     */
    function generateXML(json, options) {
      let indent = options.indent || 0;
      let result = [];
      if (!!json.length && typeof json != 'string') {
        json.forEach((v, i) => {
          let _i = generateXML(v, {
            indent: indent
          });
          result = result.concat(_i);
        });
      } else if (typeof json == 'object') {
        let type = json.componentType;
        let className = json.attrs && json.attrs.className;

        scriptStore.map(_v => {
          if (_v.belongId == json.id) {
            let eventMap = {
              init: 'load',
              destroy: 'DOMNodeRemoved',
              onClick: 'click'
            };
            if (eventMap[_v.eventType]) {
              scriptPartsJson = [
                ...scriptPartsJson,
                _line(
                  `$('.${className}').addEventListener('${
                    eventMap[_v.eventType]
                  }', ${_v.scriptName});`
                )
              ];
            }
          }
        });
        let dataBindingLineType = {
          // domLevel: [],
          // propsLevel: [],
          // styleLevel: [],
          // specialLevel: [],
        };
        dataBindingStore.map(_v => {
          if (_v.belongId == json.id) {
            dataBindingLineType[_v.target[0]] = _v;
          }
          // let target = _v.target[0];
          // if ( target == 'show' ) {
          //   dataBindingLineType.domLevel.push(_v);
          // } else if ( target == 'innerText' ) {
          //   dataBindingLineType.specialLevel.push(_v);
          // }
        });
        // TDODODO
        if (
          typeof json.style.borderTopLeftRadius !== 'undefined' &&
          json.style.borderTopLeftRadius === json.style.borderTopRightRadius &&
          json.style.borderTopLeftRadius ===
            json.style.borderBottomLeftRadius &&
          json.style.borderTopLeftRadius === json.style.borderBottomRightRadius
        ) {
          json.style.borderRadius = json.style.borderTopLeftRadius;
          delete json.style.borderTopLeftRadius;
          delete json.style.borderTopRightRadius;
          delete json.style.borderBottomLeftRadius;
          delete json.style.borderBottomRightRadius;
        }

        if (json.style.lines == 1 || json.attrs.lines == 1) {
          delete json.style.width;
        }

        if (json.style.borderWidth) {
          json.style.boxSizing = 'border-box';
        }

        if (json.type && json.type.toLowerCase() === 'repeat') {
          json.style.display = 'flex';
          json.style.flexDirection = 'row';
          json.children.forEach(function(child) {
            delete child.style.marginTop;
          });
        }

        cssStore.push({
          styleName: className,
          styleValue: json.style
        });

        switch (type) {
          case 'text':
            let innerText = json.innerText;
            let changeTextType = COMPONENT_TYPE_MAP[type];
            result = result.concat(
              _line(`<${changeTextType} class="${className}">`, {
                indent: { tab: indent }
              }),
              // _line(`class="${className}"`, {indent: {tab: indent + 1}}),
              // _line('>', {indent: {tab: indent}}),
              _line(`${innerText}`, { indent: { tab: indent + 1 } }),
              _line(`</${changeTextType}>`, { indent: { tab: indent } })
            );
            for (const _o in dataBindingLineType) {
              let dataBind = dataBindingLineType[_o];
              if (_o == 'innerText') {
                scriptPartsJson = [
                  ...scriptPartsJson,
                  _line(
                    `$('.${className}').innerText = ${generateBindValue(
                      dataBind
                    )};`,
                    { indent: { tab: 0 } }
                  )
                ];
              } else if (_o == 'show') {
                scriptPartsJson = [
                  ...scriptPartsJson,
                  _line(`if (${generateBindValue(dataBind)}}) {`),
                  _line(
                    `$('.${className}').parentElement.removeChild($('.${className}');`,
                    { indent: { tab: 1 } }
                  ),
                  _line(`}`)
                ];
              } else if (_o.indexOf('style') == -1) {
                scriptPartsJson = [
                  ...scriptPartsJson,
                  _line(
                    `$('.${className}').setAttribute('${_o}', ${generateBindValue(
                      dataBind
                    )});`,
                    { indent: { tab: 0 } }
                  )
                ];
              }
            }
            break;
          case 'picture':
            let changePicType = COMPONENT_TYPE_MAP[type];
            let source;
            source = `${json.attrs.src}`;
            result.push(
              _line(`<${changePicType}`, { indent: { tab: indent } }),
              _line(`class="${className}"`, { indent: { tab: indent + 1 } }),
              _line(`src="${source}"`, { indent: { tab: indent + 1 } }),
              _line(`data-src="${source}"`, { indent: { tab: indent + 1 } }),
              _line(`alt="${className}"`, { indent: { tab: indent + 1 } }),
              _line('/>', { indent: { tab: indent } })
            );
            for (const _o in dataBindingLineType) {
              let dataBind = dataBindingLineType[_o];
              if (_o == 'show') {
                scriptPartsJson = [
                  ...scriptPartsJson,
                  _line(`if (${generateBindValue(dataBind)}}) {`),
                  _line(
                    `$('.${className}').parentElement.removeChild($('.${className}');`,
                    { indent: { tab: 1 } }
                  ),
                  _line(`}`)
                ];
              } else if (_o == 'source') {
                scriptPartsJson = [
                  ...scriptPartsJson,
                  _line(
                    `$('.${className}').setAttribute('src', ${generateBindValue(
                      dataBind
                    )});`,
                    { indent: { tab: 0 } }
                  )
                ];
              } else if (_o.indexOf('style') == -1) {
                scriptPartsJson = [
                  ...scriptPartsJson,
                  _line(
                    `$('.${className}').setAttribute('${_o}', ${generateBindValue(
                      dataBind
                    )});`,
                    { indent: { tab: 0 } }
                  )
                ];
              }
            }
            break;
          default:
            // slider // scroller // expview
            let changeViewType = COMPONENT_TYPE_MAP[type];
            if (json.children && json.children.length > 0) {
              let childResult = generateXML(json.children, {
                indent: indent + 1
              });
              result = result.concat(
                _line(`<${changeViewType} class="${className}">`, {
                  indent: { tab: indent }
                }),
                // _line(`class="${className}"`, {indent: {tab: indent + 1}}),
                // _line(`>`, {indent: {tab: indent}}),
                childResult,
                _line(`</${changeViewType}>`, { indent: { tab: indent } })
              );
            } else {
              result = result.concat(
                _line(
                  `<${changeViewType} class="${className}"></${changeViewType}>`,
                  { indent: { tab: indent } }
                )
              );
            }
            for (const _o in dataBindingLineType) {
              let dataBind = dataBindingLineType[_o];
              if (_o == 'show') {
                scriptPartsJson = [
                  ...scriptPartsJson,
                  _line(`if (${generateBindValue(dataBind)}}) {`),
                  _line(
                    `$('.${className}').parentElement.removeChild($('.${className}');`,
                    { indent: { tab: 1 } }
                  ),
                  _line(`}`)
                ];
              } else if (_o.indexOf('style') == -1) {
                scriptPartsJson = [
                  ...scriptPartsJson,
                  _line(
                    `$('.${className}').setAttribute('${_o}', ${generateBindValue(
                      dataBind
                    )});`,
                    { indent: { tab: 0 } }
                  )
                ];
              }
            }
            break;
        }
      } else {
        return json
          .toString()
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }
      return result;
    }

    function setCSSOrder(keys, styleValue) {
      const orders = [
        'boxSizing',
        'display',
        'position',
        'top',
        'right',
        'bottom',
        'left',
        'float',
        'clear',
        'alignContent',
        'alignItems',
        'alignSelf',
        'flex',
        'flexBasis',
        'flexDirection',
        'flexFlow',
        'flexGrow',
        'flexShrink',
        'flexWrap',
        'justifyContent',
        'transform',
        'visibility',
        'opacity',
        'zIndex',
        'margin',
        'marginTop',
        'marginRight',
        'marginBottom',
        'marginLeft',
        'outline',
        'border',
        'borderTop',
        'borderRight',
        'borderBottom',
        'borderLeft',
        'borderWidth',
        'borderTopWidth',
        'borderRightWidth',
        'borderBottomWidth',
        'borderLeftWidth',
        'borderStyle',
        'borderTopStyle',
        'borderRightStyle',
        'borderBottomStyle',
        'borderLeftStyle',
        'borderRadius',
        'borderTopLeftRadius',
        'borderTopRightRadius',
        'borderBottomLeftRadius',
        'borderBottomRightRadius',
        'borderColor',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor',
        'background',
        'backgroundColor',
        'backgroundImage',
        'backgroundRepeat',
        'backgroundPosition',
        'cursor',
        'padding',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'width',
        'minWidth',
        'maxWidth',
        'height',
        'minHeight',
        'maxHeight',
        'overflow',
        'listStyle',
        'captionSide',
        'tableLayout',
        'borderCollapse',
        'borderSpacing',
        'emptyCells',
        'verticalAlign',
        'textAlign',
        'textIndent',
        'textTransform',
        'textDecoration',
        'textOverflow',
        'lineHeight',
        'wordSpacing',
        'letterSpacing',
        'whiteSpace',
        'color',
        'font',
        'fontFamily',
        'fontSize',
        'fontWeight',
        'content',
        'quotes'
      ];
      const result = {};

      keys.sort(function(a, b) {
        if (orders.indexOf(a) !== -1 && orders.indexOf(b) !== -1) {
          return orders.indexOf(a) - orders.indexOf(b);
        }
        return -1;
      });

      keys.forEach(function(item) {
        result[item] = styleValue[item];
      });

      return result;
    }

    /**
     * @desc 根据cssStore生成rax的style
     * @param cssStore 存储css的数组
     * @return result css的partsJson
     */
    function generateStyle(cssStore) {
      let result = [];
      let remResult = [
        _line(
          `/* 视觉稿宽度为 ${designWidth}, 请设置html的font-size为 ${htmlFontsize}px, 以便在布局视口宽度为 ${viewportWidth} 的页面中自适应 */`
        )
      ];

      cssStore.map((v, i) => {
        let styleLine = [];
        let styleRemCssLine = [];
        // style value order
        v.styleValue = setCSSOrder(Object.keys(v.styleValue), v.styleValue);

        if (
          typeof v.styleValue.display === 'undefined' &&
          (v.styleValue.flexDirection ||
            v.styleValue.justifyContent ||
            v.styleValue.alignItems)
        ) {
          v.styleValue.display = 'flex';
        }

        for (let _o in v.styleValue) {
          if ( _o === 'whiteSpace' ) {
            // https://github.com/taofed/imgcook/issues/21
            // 过滤whiteSpace
          } else {
            let classNameLow = camelTranslate(_o);
            let classValue = valueTranslate(classNameLow, _o, v.styleValue[_o]);
            let lineString = `${classNameLow}: ${classValue};`;
            styleLine.push(_line(lineString, { indent: { tab: 1 } }));
            if (htmlFontsize) {
              let cssLineRemString = `${classNameLow}: ${cssValue(
                _o,
                classValue,
                htmlFontsize
              )};`;
              styleRemCssLine.push(
                _line(cssLineRemString, { indent: { tab: 1 } })
              );
            }
          }
        }

        let firstLine = `.${v.styleName} {`;

        if (scopeClass !== v.styleName) {
          firstLine = `.${scopeClass} ${firstLine}`;
        }

        result = result.concat(
          _line(firstLine),
          styleLine,
          // _line('box-sizing: border-box;', {indent: {tab: 1}}),
          _line('}')
        );

        if (styleRemCssLine.length > 0) {
          remResult = remResult.concat(
            _line(`.${v.styleName} {`),
            styleRemCssLine,
            _line('}')
          );
        }
      });
      result = [].concat(_indentTab(result, 0));

      return {
        stylePartsJson: result,
        styleRemCssPartsJson: remResult
      };

      function cssValue(key, value, htmlFontsize) {
        if (!value) return value;
        if (['fontWeight', 'lines'].indexOf(key) > -1) {
          return value;
        } else {
          let valueNum =
            typeof value == 'string' ? value.replace(/(px)|(rem)/, '') : value;
          if (valueNum == 1 || ['fontSize'].indexOf(key) > -1) {
            return valueNum + 'px';
          }
          if (
            typeof value == 'number' ||
            value - 0 == value ||
            value.match(/px$/)
          ) {
            value = parseFloat(value);
            return htmlFontsize
              ? parseFloat(
                  (
                    (value * (viewportWidth / designWidth)) /
                    htmlFontsize
                  ).toFixed(2)
                ) + 'rem'
              : value + 'px';
          } else {
            return value;
          }
        }
      }

      function valueTranslate(classNameLow, classKey, classValue) {
        switch (classNameLow) {
          case 'font-size':
          case 'margin-left':
          case 'margin-top':
          case 'margin-right':
          case 'margin-bottom':
          case 'padding-left':
          case 'padding-top':
          case 'padding-right':
          case 'padding-bottom':
          case 'width':
          case 'height':
          case 'border-radius':
          case 'top':
          case 'left':
          case 'right':
          case 'bottom':
          case 'line-height':
          case 'max-width':
          case 'border-width':
          case 'border-top-width':
          case 'border-right-width':
          case 'border-bottom-width':
          case 'border-left-width':
          case 'border-bottom-right-radius':
          case 'border-bottom-left-radius':
          case 'border-top-right-radius':
          case 'border-top-left-radius':
            if (typeof classValue == 'number') {
              classValue = classValue + 'px';
            } else if (typeof classValue == 'string') {
              classValue = classValue.replace(/(px)|(rem)/, '');
              classValue = classValue + 'px';
            }
            break;
          case 'color':
          case 'background-color':
            let rgb = classValue.match(
              /^rgb[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i
            );
            let rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(.+))?\)$/.exec(
              classValue
            );
            if (rgb && rgb.length === 4) {
              classValue =
                '#' +
                ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
                ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
                ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2);
            }
            if (rgba && rgba[4]) {
              if (Number(rgba[4]) === 1) {
                classValue =
                  '#' +
                  ('0' + parseInt(rgba[1], 10).toString(16)).slice(-2) +
                  ('0' + parseInt(rgba[2], 10).toString(16)).slice(-2) +
                  ('0' + parseInt(rgba[3], 10).toString(16)).slice(-2);
              } else {
                classValue =
                  'rgba(' +
                  rgba[1] +
                  ',' +
                  rgba[2] +
                  ',' +
                  rgba[3] +
                  ',' +
                  Number(rgba[4]).toFixed(2) +
                  ')';
              }
            }
            break;
          default:
            break;
        }
        return classValue;
      }
      function camelTranslate(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
      }
    }

    function generateResponsiveStyle(cssStore) {
      if (modConfig && modConfig.designWidth && modConfig.designHeight) {
        let result = [];
        cssStore.map((v, i) => {
          let styleLine = [];
          // style value order
          v.styleValue = setCSSOrder(Object.keys(v.styleValue), v.styleValue);

          if (
            typeof v.styleValue.display === 'undefined' &&
            (v.styleValue.flexDirection ||
              v.styleValue.justifyContent ||
              v.styleValue.alignItems)
          ) {
            v.styleValue.display = 'flex';
          }

          for (let _o in v.styleValue) {
            let classNameLow = camelTranslate(_o);
            let classValue = valueTranslate(classNameLow, _o, v.styleValue[_o]);
            let lineString = `${classNameLow}: ${classValue};`;
            styleLine.push(_line(lineString, { indent: { tab: 1 } }));
            if (classNameLow == 'flex-direction') {
              // styleLine.unshift(
              //   _line( 'display: flex;', {indent: {tab: 1}}),
              // );
            }
          }

          let firstLine = `.${v.styleName} {`;

          if (scopeClass !== v.styleName) {
            firstLine = `.${scopeClass} ${firstLine}`;
          }

          result = result.concat(
            _line(firstLine),
            styleLine,
            // _line('box-sizing: border-box;', {indent: {tab: 1}}),
            _line('}')
          );
        });
        result = [].concat(_indentTab(result, 0));

        return result;

        function valueTranslate(classNameLow, classKey, classValue) {
          let _w = modConfig.designWidth / 100;
          let _h = modConfig.designHeight / 100;

          switch (classNameLow) {
            case 'margin-top':
            case 'margin-bottom':
            case 'padding-top':
            case 'padding-bottom':
            case 'height':
            case 'top':
            case 'bottom':
            case 'font-size':
            // classValue = Number((classValue / _h).toFixed(2)) + 'vh';
            case 'border-width':
            case 'border-top-width':
            case 'border-right-width':
            case 'border-bottom-width':
            case 'border-left-width':
            case 'border-radius':
            case 'border-bottom-right-radius':
            case 'border-bottom-left-radius':
            case 'border-top-right-radius':
            case 'border-top-left-radius':
              if (typeof classValue == 'number') {
                classValue = classValue + 'px';
              } else if (typeof classValue == 'string') {
                classValue = classValue.replace(/(px)|(rem)/, '');
                classValue = classValue + 'px';
              }
              break;
            case 'line-height':
              // if (typeof classValue === 'string') {
              //   classValue = classValue.replace(/(px)|(rem)/, '');
              // }
              // classValue = Number((classValue / _h).toFixed(2)) + 'vh';
              break;
            case 'width':
            case 'max-width':
            case 'margin-left':
            case 'margin-right':
            case 'padding-left':
            case 'padding-right':
            case 'left':
            case 'right':
              classValue = Number((classValue / _w).toFixed(2)) + 'vw';
              break;
            case 'color':
            case 'background-color':
              let rgb = classValue.match(
                /^rgb[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i
              );
              let rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(.+))?\)$/.exec(
                classValue
              );
              if (rgb && rgb.length === 4) {
                classValue =
                  '#' +
                  ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
                  ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
                  ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2);
              }
              if (rgba && rgba[4]) {
                if (Number(rgba[4]) === 1) {
                  classValue =
                    '#' +
                    ('0' + parseInt(rgba[1], 10).toString(16)).slice(-2) +
                    ('0' + parseInt(rgba[2], 10).toString(16)).slice(-2) +
                    ('0' + parseInt(rgba[3], 10).toString(16)).slice(-2);
                } else {
                  classValue =
                    'rgba(' +
                    rgba[1] +
                    ',' +
                    rgba[2] +
                    ',' +
                    rgba[3] +
                    ',' +
                    Number(rgba[4]).toFixed(2) +
                    ')';
                }
              }
              break;
            default:
              break;
          }
          return classValue;
        }
        function camelTranslate(str) {
          return str.replace(/([A-Z])/g, '-$1').toLowerCase();
        }
      } else {
        return null;
      }
    }
  }

  // 代码生成
  let dslMessage = generatePartsJson(layoutData);

  renderData = {
    // css: helper.printer(dslMessage.stylePartsJson),
    // html: helper.printer(dslMessage.xmlPartsJson),
    // script: '',

    css: helper.printer(dslMessage.stylePartsJson),
    html: helper.printer(dslMessage.xmlPartsJson),
    js: helper.printer(dslMessage.scriptPartsJson)
  };

  let result = {
    renderData: renderData,
    xml: helper.printer(dslMessage.xmlPartsJson),
    style: helper.printer(dslMessage.stylePartsJson),
    panelDisplay: [
      {
        panelName: 'index.html',
        panelValue: helper.printer(dslMessage.xmlPartsJson),
        panelType: 'BuilderRaxView'
      },
      {
        panelName: 'index.js',
        panelValue: helper.printer(dslMessage.scriptPartsJson),
        panelType: 'BuilderRaxIndex'
      },
      {
        panelName: 'index.css',
        panelValue: helper.printer(dslMessage.stylePartsJson),
        panelType: 'BuilderRaxStyle'
      }
    ], // 给达芬奇展示用的panel相关的接口
    playground: {
      info: '前往js playground',
      link: 'https://jsplayground.taobao.org/jsplayground'
    },
    noTemplate: true
  };

  if (dslMessage.responsiveStylePartsJson) {
    result.panelDisplay.push({
      panelName: 'index.response.css',
      panelValue: helper.printer(dslMessage.responsiveStylePartsJson),
      panelType: 'BuilderRaxStyle'
    });
  }

  if (dslMessage.styleRemCssPartsJson) {
    result.panelDisplay.push({
      panelName: 'index.rem.css',
      panelValue: helper.printer(dslMessage.styleRemCssPartsJson),
      panelType: 'BuilderRaxStyle'
    });
  }

  return result;
};
