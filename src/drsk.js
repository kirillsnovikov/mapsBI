'use strict';

export function MapLoader() {
  window.requestAnimationFrame = (function() {
    return (
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback, element) {
        return window.setTimeout(callback, 1000 / 60);
      }
    );
  })();

  function Helper() {
    this.replaceAll = function(str, find, replace) {
      return (
        (str && str.replace && str.replace(new RegExp(find, 'g'), replace)) ||
        str
      );
    };

    this.assign = function(target, source, fields) {
      fields.forEach(function(key) {
        target[key] = source[key];
      });
      return target;
    };

    this.toNumber = function(value) {
      return (
        (value &&
          Number(this.replaceAll(value.replace(/\s/g, ''), ',', '.'))) ||
        0
      );
    };

    this.calcRadius = function(percent, multiplier) {
      if (percent < 1) return 6 * multiplier;
      else if (percent < 5) return 6.5 * multiplier;
      else if (percent < 10) return 7 * multiplier;
      else if (percent < 20) return 8 * multiplier;
      else if (percent < 30) return 9 * multiplier;
      else if (percent < 40) return 10 * multiplier;
      else if (percent < 60) return 11 * multiplier;
      else if (percent < 80) return 12 * multiplier;
      return 14 * multiplier;
    };

    this.createSVG = function(tag, attributes, styles) {
      var styles = styles || {};
      var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (var attrName in attributes) {
        el.setAttribute(attrName, attributes[attrName]);
      }
      for (var styleName in styles) {
        el.style[styleName] = styles[styleName];
      }
      return el;
    };

    this.columnParameter = function(name, def = null) {
      this.name = name;
      this.value = def;
    };

    this.getTableRows = function(data, columns) {
      var result = [];
      data.forEach(function(item) {
        var row = {};
        columns.forEach(function(column) {
          row[column.name] = item[column.name];
        });
        result.push(row);
      });
      return result;
    };
  }

  this.circle = function circle(percentage, width) {
    if (percentage < 0) {
      console.error('percentage < 0', percentage);
      percentage = 0;
    }
    var options = {
      size: width || 400,
      percentage: percentage
    };
    options.width = options.size;
    options.height = options.size;
    options.radius = (options.size * 0.8) / 2;
    options.strokeWidth = Math.round(options.width / 17);
    options.circumference = Math.PI * 2 * options.radius;
    options.cy = options.width / 2;
    options.cx = -(options.height / 2);

    return options;
  };

  this.width = document.body.clientWidth;
  this.height = (document.body.clientWidth * 9) / 20;

  var handleWheel = function handleWheel(event) {
    var e = window.event || event;
    var overlap = e.target;

    if (overlap.tagName === 'circle') {
      overlap.style.pointerEvents = 'none';
      setTimeout(function() {
        overlap.style.pointerEvents = 'auto';
      }, 1000);
    }
  };

  var addMouseWheelEventListener = function addMouseWheelEventListener(
    scrollHandler
  ) {
    if (window.addEventListener) {
      // IE9+, Chrome, Safari, Opera
      window.addEventListener('mousewheel', scrollHandler, false); // Firefox

      window.addEventListener('DOMMouseScroll', scrollHandler, false);
    } else {
      // // IE 6/7/8
      window.attachEvent('onmousewheel', scrollHandler);
    }
  };

  addMouseWheelEventListener(handleWheel);
  this.color_domain = [80, 100];
  this.ext_color_domain = [0, 80, 100];
  this.legend_labels = ['< 80%', '< 100%', '100%+'];
  this.color = d3
    .scaleThreshold()
    .domain(this.color_domain)
    .range(['#d7111b', '#eed000', '#4b8936']);
  this.svg = null;
  this.projection = null;
  this.tooltip = null;
  this.mapUrl = null;
  this.data = null;
  this.helper = new Helper();
  this.zoomScale = {
    UD: 'UDGO',
    ROO: 'ROO',
    REG: 'REGION',
    value: 0,
    curState: 'UDGO',
    citiesVisible: function citiesVisible() {
      return this.value < -1;
    },
    reset: function reset() {
      this.value = 1;
      this.prevY = 1;
      this.zoomY = 0;
    },
    prevY: 0,
    dirChanged: function dirChanged(v) {
      return this.prevY !== 0 && Math.sign(this.prevY) !== Math.sign(v);
    },
    zoomY: 0,

    set zoom(v) {
      this.value = this.value + v;
      this.zoomY = this.zoomY + (this.dirChanged(v) ? 0 : v);
      this.prevY = v;
    },

    get multiplier() {
      return Math.abs(this.zoomY || 1);
    },

    isZoom: function isZoom(state) {
      if (state === this.UD && this.value >= 0 && this.curState !== state) {
        this.curState = state;
        return true;
      }

      if (
        state === this.ROO &&
        this.value < 0 &&
        this.value >= -1 &&
        this.curState !== state
      ) {
        this.curState = state;
        return true;
      }

      if (state === this.REG && this.value < -1 && this.curState !== state) {
        this.curState = state;
        return true;
      }

      return false;
    }
  };

  this.init = function(mapUrl, data, width, height) {
    this.mapUrl = mapUrl;
    this.data = data;
    this.width = width || document.body.clientWidth;
    this.height = height || (document.body.clientWidth * 9) / 20;
    return this;
  };

  this.draw = function(el) {
    var self = this;
    var container = d3.select(el);
    self.tooltip = container
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
    self.svgWrap = container
      .append('svg')
      .attr('width', self.width)
      .attr('height', self.height);
    self.svg = self.svgWrap
      .append('svg')
      .attr('viewBox', '0 100 ' + self.width + ' ' + self.height);
    var c = container.append('div').attr('class', 'ctrl');
    var b = c
      .append('input')
      .attr('class', 'btn')
      .attr('value', 'Экспорт')
      .attr('type', 'button');
    b.on('click', function() {
      saveSvgAsPng(document.querySelector('svg'), 'export.png', {
        backgroundColor: 'white'
      });
    });
    var slider = c
      .append('div')
      .attr('id', 'slider')
      .attr('class', 'slider');
    slider
      .append('input')
      .attr('class', 'btn1')
      .attr('value', '-')
      .attr('type', 'button');
    slider
      .append('input')
      .attr('class', 'btn2')
      .attr('value', '+')
      .attr('type', 'button');
    self.projection = d3
      .geoAlbers()
      .rotate([-105, 0])
      .center([-10, 65])
      .parallels([52, 64])
      .scale(Math.round((9.0 * this.width) / 16.0))
      .translate([self.width / 2, (self.height + 110) / 2]);
    d3.json(self.mapUrl, function(loaded) {
      drawMap.call(self, loaded);
      drawLegend.apply(self);
    });
  };

  function drawMap(mapData) {
    var self = this;
    var regionList = {};
    d3.csvParse(self.regionsCsv).forEach(function(e) {
      regionList[e['RegionCode']] = e['RegionName'];
    });
    var mapCollection = {
      data: {},
      cities: {},
      refData: {
        all: []
      },
      pieKeys: {},
      tableColumns: [],
      citiesTableColumns: [],
      columnParameters: [
        new self.helper.columnParameter('name'),
        new self.helper.columnParameter('display'),
        new self.helper.columnParameter('index', 0),
        new self.helper.columnParameter('width', 100),
        new self.helper.columnParameter('class'),
        new self.helper.columnParameter('align', 'left')
      ]
    };

    self.definePieKeys = function() {
      var curState = self.zoomScale.curState;

      var keys = [{ Офисов: '_TP_CNT' }, { ПМ: '_PM_CNT' }];

      if (window.title === 'Портфель активных клиентов') {
        var key = window.title + ', <small>шт</small>';
        keys.push({ [key]: '_FAKT' });
      } else {
        var key = window.title + ', <small>тыс.руб</small>';
        keys.push({ Клиентов: '_CUST_CNT' });
        keys.push({ [key]: '_FAKT' });
      }

      function defineKeys(state, title, cState = null, cTitle = null) {
        var data = window['RU_' + state];
        var cData = cState !== null ? window['RU_' + cState] : null;
        var pieKeys = {
          title: title,
          data: [],
          [state]: data,
          cities: {
            title: cTitle,
            data: [],
            [cState]: cData
          }
        };
        keys.forEach(function(key) {
          for (var item in key) {
            pieKeys.data.push({ [item]: state + key[item] });
            if (cState === 'CITY') {
              pieKeys.cities.data.push({ [item]: cState + key[item] });
            }
          }
        });
        mapCollection.pieKeys = pieKeys;
      }
      if (curState === self.zoomScale.UD) {
        var title = 'УД ГО';
        keys.unshift({ РОО: '_ROO_CNT' });
        defineKeys(curState, title);
      } else if (curState === self.zoomScale.ROO) {
        var title = 'РОО';
        defineKeys(curState, title);
      } else {
        var title = 'Регион';
        defineKeys(curState, title);
        if (self.zoomScale.citiesVisible()) {
          var cState = 'CITY';
          var cTitle = 'Город';
          defineKeys(curState, title, cState, cTitle);
        }
      }
    };

    self.tableColumn = function(column) {
      var self = this;
      var columnParamNames = mapCollection.columnParameters.map(function(col) {
        return col.name;
      });

      Object.keys(column).forEach(key => {
        if (column.hasOwnProperty(key) && columnParamNames.indexOf(key) == -1) {
          self[key] = column[key];
        }
      });

      mapCollection.columnParameters.forEach(function(parameter) {
        var value = column[parameter.name]
          ? column[parameter.name]
          : parameter.value;
        self[parameter.name] = value;
      });
    };

    self.defineTableColumns = function() {
      var curState = self.zoomScale.curState;
      var widthColumn = 300;
      if (curState === self.zoomScale.UD) {
        mapCollection.tableColumns = [
          new self.tableColumn({
            name: 'UD_REGION',
            display: 'УД Региона',
            width: widthColumn
          }),
          new self.tableColumn({
            name: 'ROO',
            display: 'РОО',
            width: widthColumn
          }),
          new self.tableColumn({
            name: 'ROO_BY_CITY_FAKT',
            display: window.title + ', тыс.руб, факт',
            align: 'right'
          }),
          new self.tableColumn({
            name: 'ROO_BY_CITY_PLAN',
            display: window.title + ', тыс.руб, план',
            align: 'right'
          }),
          new self.tableColumn({
            name: 'ROO_PRC',
            display: window.title + ', процент',
            align: 'right',
            class: 'map-table__cell_type_prc',
            width: 80
          }),
          new self.tableColumn({
            name: 'ROO_PROGNOZ',
            display: window.title + ', прогноз',
            align: 'right',
            class: 'map-table__cell_type_prc',
            width: 80
          })
        ];
      } else if (
        curState === self.zoomScale.ROO ||
        curState === self.zoomScale.REG
      ) {
        mapCollection.tableColumns = [
          new self.tableColumn({
            name: 'CITY',
            display: 'Город',
            width: widthColumn
          }),
          new self.tableColumn({
            name: 'CITY_FAKT',
            display: window.title + ', тыс.руб, факт',
            align: 'right'
          }),
          new self.tableColumn({
            name: 'CITY_PLAN',
            display: window.title + ', тыс.руб, план',
            align: 'right'
          }),
          new self.tableColumn({
            name: 'CITY_PRC',
            display: window.title + ', процент',
            align: 'right',
            class: 'map-table__cell_type_prc',
            width: 80
          }),
          new self.tableColumn({
            name: 'CITY_PROGNOZ',
            display: window.title + ', прогноз',
            align: 'right',
            class: 'map-table__cell_type_prc',
            width: 80
          })
        ];
        if (self.zoomScale.citiesVisible()) {
          mapCollection.citiesTableColumns = [
            new self.tableColumn({
              name: 'TP',
              display: 'ТП',
              width: widthColumn
            }),
            new self.tableColumn({
              name: 'TP_FACT',
              display: window.title + ', тыс.руб, факт',
              align: 'right'
            }),
            new self.tableColumn({
              name: 'TP_PLAN',
              display: window.title + ', тыс.руб, план',
              align: 'right'
            }),
            new self.tableColumn({
              name: 'TP_PRC',
              display: window.title + ', процент',
              align: 'right',
              class: 'map-table__cell_type_prc',
              width: 80
            }),
            new self.tableColumn({
              name: 'TP_PROGNOZ',
              display: window.title + ', прогноз',
              align: 'right',
              class: 'map-table__cell_type_prc',
              width: 80
            })
          ];
        }
      }
    };

    mapCollection.push = function(entry) {
      this.refData[entry['UDGO']] = this.refData[entry['UDGO']] || [];
      this.refData[entry['ROO']] = this.refData[entry['ROO']] || [];
      this.refData[entry['UDGO']].push(entry.ref);
      this.refData[entry['ROO']].push(entry.ref);
      this.refData.all.push(entry.ref);
    };

    mapCollection.collection = function(context, level) {
      var m = {};

      for (var k in this.data) {
        var entry = mapCollection.data[k];
        var key = entry[level];

        if (this.refData[key]) {
          m[key] = this.refData[key];
        }
      }

      return m;
    };

    mapCollection.selected = function(context, d) {
      var code = d.properties['int_ref'];
      var e = this.data[code];
      if (!e) return [];

      if (context.zoomScale.curState === context.zoomScale.UD) {
        return this.refData[e['UDGO']] || [];
      }

      if (context.zoomScale.curState === context.zoomScale.ROO) {
        return this.refData[e['ROO']] || [];
      }

      if (context.zoomScale.curState === context.zoomScale.REG) {
        return [e.ref];
      }
    };

    self.data.forEach(function(e) {
      var code = e['REGION_ID'];
      e['REGION'] = regionList[code]; //дубли

      if (
        (mapCollection.data[code] &&
          e['UDGO'] !== '-' &&
          e['UDGO'] !== 'Нет' &&
          e['UDGO'] !== 'нет') ||
        !mapCollection.data[code]
      ) {
        mapCollection.data[code] = e;
      }

      mapCollection.cities[code] = mapCollection.cities[code] || [];
      mapCollection.cities[code].push(
        self.helper.assign(
          {
            CIRCLE_SIZE:
              (Number(self.helper.replaceAll(e['CITY_PLAN'], ' ', '') || 0) *
                100) /
              Number(self.helper.replaceAll(e['REGION_PLAN'], ' ', '') || 1)
          },
          e,
          [
            'CITY',
            'CITY_PLAN',
            'CITY_FAKT',
            'CITY_PRC',
            'CITY_PROGNOZ',
            'LAT',
            'LON'
          ]
        )
      );
    });

    Object.values(mapCollection.data).forEach(item => {
      var regions = Object.values(mapCollection.data).filter(k => {
        return k.ROO === item.ROO && item.UDGO === k.UDGO;
      });
      var regFakt = 0;
      var regPlan = 0;
      regions.forEach(item => {
        regFakt += self.helper.toNumber(item.CITY_FAKT);
        regPlan += self.helper.toNumber(item.CITY_PLAN);
      });
      item['ROO_BY_CITY_FAKT'] = regFakt.toLocaleString();
      item['ROO_BY_CITY_PLAN'] = regPlan.toLocaleString();
    });
    let udgos = new Set(
      Object.values(mapCollection.data).map(item => item.UDGO)
    );
    mapCollection.udgos = {};
    udgos.forEach(udgo => {
      let data = Object.values(mapCollection.data).filter(item => {
        return item.UDGO === udgo;
      });
      let fakt = 0;
      let plan = 0;
      let percent = 0;
      data.forEach(j => {
        fakt += self.helper.toNumber(j.CITY_FAKT);
        plan += self.helper.toNumber(j.CITY_PLAN);
      });
      if (fakt === 0 && plan === 0) {
        percent = 0;
      } else if (fakt !== 0 && plan === 0) {
        percent = 100;
      } else {
        percent = Math.round((fakt / plan) * 100);
      }
      mapCollection.udgos[udgo] = {};
      mapCollection.udgos[udgo]['UDGO_FAKT'] = fakt;
      mapCollection.udgos[udgo]['UDGO_PLAN'] = plan;
      mapCollection.udgos[udgo]['UDGO_PRC'] = percent;
    });

    var map = topojson.feature(mapData, mapData.objects.russia);
    var path = d3.geoPath().projection(self.projection);
    var g = self.svg.append('g');
    g.attr('class', 'region')
      .selectAll('path')
      .data(map.features)
      .enter()
      .append('path')
      .attr('d', path)
      .style('fill', function(d) {
        var code = d.properties['int_ref'];
        var entry = mapCollection.data[code];

        if (entry) {
          entry.ref = this;
          mapCollection.push(entry);
        }

        return '#aaa';
      })
      .on('wheel.zoom', zoomHandler);
    paintEntity.call(
      self,
      null,
      'UDGO_PROGNOZ',
      'UDGO',
      'UDGO_FAKT',
      'UDGO_PLAN',
      'UDGO_PRC'
    );
    var lastZoomed = null;
    var lastClicked = null;
    var cities = null;

    function drawCities(code) {
      if (cities) {
        cities.remove();
        cities = null;
      }

      cities = self.svg
        .selectAll('g.city')
        .data(mapCollection.cities[code])
        .enter()
        .append('g')
        .attr('class', 'city')
        .attr('transform', function(d) {
          return 'translate(' + self.projection([d.LON, d.LAT]) + ')';
        });
      cities
        .append('circle')
        .attr('r', 1)
        .style('fill', '#000');
      cities
        .append('circle')
        .attr('r', function(d) {
          return self.helper.calcRadius(d.CIRCLE_SIZE, 1.1);
        })
        .style('fill', function(d) {
          return self.color(self.helper.toNumber(d.CITY_PROGNOZ));
        })
        .attr('stroke-width', 3)
        .on('mouseover', function(d) {
          d3.select(this)
            .transition()
            .duration(300)
            .attr('stroke-width', function(d) {
              return self.helper.calcRadius(d.CIRCLE_SIZE, 0.6);
            });
          self.tooltip
            .transition()
            .duration(300)
            .style('opacity', 1);
          self.tooltip
            .text(
              d.CITY +
                ' \nплан: ' +
                d.CITY_PLAN +
                '\nфакт: ' +
                d.CITY_FAKT +
                ' \n% выполнения: ' +
                d.CITY_PRC +
                '\n% выполнения, прогноз: ' +
                d.CITY_PROGNOZ
            )
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY - 120 + 'px');
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(300)
            .attr('stroke-width', 3);
          self.tooltip
            .transition()
            .duration(300)
            .style('opacity', 0);
        })
        .on('click', function(d) {
          self.createTable(self.getDataTable(d, 'CITY'), 'city');
          self.createPie(self.getDataPie(d, 'CITY', 'CITY_PRC'));
        });
      cities
        .append('text')
        .attr('x', 12)
        .text(function(d) {
          return d.CITY;
        });
    }

    self.onClick = function onClick(d) {
      var code = d.properties['int_ref'];
      var dataObj = mapCollection.data[code];

      if (lastClicked !== d && dataObj && self.zoomScale.citiesVisible()) {
        drawCities(code);
        lastClicked = d;
      }
    };

    self.getDataTable = function getDataTable(entry, name) {
      var curState = self.zoomScale.curState;
      var keys = ['FAKT', 'PLAN', 'PRC', 'PROGNOZ'];
      var result = [];
      if (curState === self.zoomScale.UD) {
        var udgos = Object.values(mapCollection.data).filter(function(item) {
          return item[name] === entry[name];
        });
        self.udgosUnique = new Set(
          udgos.map(function(i) {
            return i.ROO;
          })
        );
        self.udgosUnique.forEach(function(j) {
          result.push(
            udgos.find(function(udgo) {
              return j === udgo.ROO;
            })
          );
        });
        result.unshift(getTotalRoos());
      } else if (
        curState === self.zoomScale.ROO ||
        curState === self.zoomScale.REG
      ) {
        var cities = self.data.filter(function(item) {
          return item[name] === entry[name];
        });
        new Set(
          cities.map(function(i) {
            return i.CITY;
          })
        ).forEach(function(j) {
          result.push(
            cities.find(function(city) {
              return j === city.CITY;
            })
          );
        });
        result.unshift(getTotal(keys, curState));
        if (self.zoomScale.citiesVisible()) {
          result['cities'] = window.RU_TP.filter(function(item) {
            return item[name] === entry[name];
          });
          result['cities'].unshift(getTotal(keys, 'CITY'));
        }
      }
      function getTotal(keys, state) {
        var total = {};
        keys = keys.map(function(key) {
          return state + '_' + key;
        });
        keys.forEach(function(key) {
          total[key] = entry[key];
        });
        return total;
      }
      function getTotalRoos() {
        var total = {};
        keys.forEach(key => {
          if (key === 'FAKT') {
            total[`UDGO_${key}`] = mapCollection.udgos[entry[name]][
              `UDGO_${key}`
            ].toLocaleString();
          } else if (key === 'PLAN') {
            total[`UDGO_${key}`] = mapCollection.udgos[entry[name]][
              `UDGO_${key}`
            ].toLocaleString();
          } else if (key === 'PRC') {
            total[`UDGO_${key}`] = mapCollection.udgos[entry[name]][
              `UDGO_${key}`
            ].toLocaleString();
          } else {
            total[`UDGO_${key}`] = entry[`UDGO_${key}`];
          }
        });
        return total;
      }
      return result;
    };

    self.createTable = function createTable(data, type = null) {
      var tableColumns =
        type === 'city'
          ? mapCollection.citiesTableColumns
          : mapCollection.tableColumns;
      var tableData = type === 'city' ? data.cities : data;
      var totalData = tableData.shift();
      var rows = self.helper.getTableRows(tableData, tableColumns);
      if ($('.map-table')) {
        $('.map-table').remove();
      }
      var table = $('<div/>', { class: 'map-table' }).appendTo(
        '.mapcontainer__bottom'
      );
      var header = $('<div/>', { class: 'map-table__header' });
      var body = $('<div/>', { class: 'map-table__body' });
      var cols = tableColumns.length;
      tableColumns.forEach(function(col) {
        $('<div/>', {
          class: 'map-table__display',
          text: col.display
        })
          .css({ width: col.width })
          .appendTo(header);
      });
      var total = $('<div/>', { class: 'map-table__total' }).appendTo(body);
      var key = cols - Object.keys(totalData).length;
      for (var value of Object.values(totalData)) {
        var col = tableColumns[key];
        var className = col.class
          ? 'map-table__cell ' + col.class
          : 'map-table__cell';
        $('<div/>', {
          class: className,
          text: value
        })
          .css({
            width: col.width,
            textAlign: col.align
          })
          .appendTo(total);

        key++;
      }
      $('<div/>', {
        class: 'map-table__total-title',
        text: 'Итого'
      })
        .css('text-align', 'left')
        .prependTo(total);
      rows.forEach(function(row) {
        var bodyRow = $('<div/>', { class: 'map-table__row' }).appendTo(body);
        tableColumns.forEach(function(col, k) {
          var style = {
            width: col.width,
            textAlign: col.align
          };
          if (cols - 2 === k || cols - 4 === k) {
            style['background'] = '#f3f4f8';
          }
          var className = col.class
            ? 'map-table__cell ' + col.class
            : 'map-table__cell';
          if (col.class === 'map-table__cell_type_prc') {
            style['color'] = self.color(self.helper.toNumber(row[col.name]));
          }
          $('<div/>', {
            class: className,
            text: row[col.name]
          })
            .css(style)
            .appendTo(bodyRow);
        });
      });
      table.append(header).append(body);
    };

    self.getDataPie = function getDataPie(entry, name, color) {
      var pieKeys =
        name === 'CITY' ? mapCollection.pieKeys.cities : mapCollection.pieKeys;
      var result = {
        title: {},
        data: []
      };
      var title =
        self.zoomScale.curState === self.zoomScale.ROO
          ? entry[name].replace(/(РОО |РОО)/i, '')
          : entry[name];
      result.title['label'] = pieKeys.title;
      result.title['value'] = title;
      result['color'] = self.color(self.helper.toNumber(entry[color]));
      result['percentage'] = entry[color];
      var pieData = pieKeys[name].find(function(item) {
        if (name === 'ROO') {
          return (
            item['ROO_ID'].localeCompare(entry['ROO_ID'], 'ru', {
              sensitivity: 'accent'
            }) === 0
          );
        }
        return (
          item[name].localeCompare(entry[name], 'ru', {
            sensitivity: 'accent'
          }) === 0
        );
      });
      if (pieData) {
        pieKeys.data.forEach(function(data) {
          if (Object.keys(data)[0] === 'Офисов') {
            var key = name;
            if (name === 'ROO') {
              key = 'ROO_ID';
            } else if (name === 'REGION') {
              key = 'REGION_ID';
            }
            var offices = self.data.filter(function(item) {
              return entry[key] === item[key];
            });
            result.data.push({
              label: Object.keys(data)[0],
              value: offices.length
            });
          } else if (Object.keys(data)[0] === 'РОО') {
            result.data.push({
              label: Object.keys(data)[0],
              value: self.udgosUnique.size
            });
          } else if (Object.values(data)[0] === 'UDGO_FAKT') {
            result.data.push({
              label: Object.keys(data)[0],
              value: mapCollection.udgos[entry[name]][
                Object.values(data)[0]
              ].toLocaleString()
            });
          } else {
            result.data.push({
              label: Object.keys(data)[0],
              value: pieData[Object.values(data)[0]]
                ? pieData[Object.values(data)[0]]
                : entry[Object.values(data)[0]]
            });
          }
        });
      } else {
        console.error('Нет данных: ', entry[name]);
        result['error'] = 'Нет данных';
      }
      return result;
    };

    self.createPie = function createPie(data) {
      if ($('.circle-info')) {
        $('.circle-info').remove();
      }

      var pieEl = $('<div/>', { class: 'circle-body' });
      var infoLeft = $('<div/>', { class: 'circle-info__left' });
      var infoRight = $('<div/>', { class: 'circle-info__right' });
      var infoTitle = $('<div/>', { class: 'circle-info__title' })
        .append(
          $('<span/>', {
            text: data.title.label
          })
        )
        .append(
          $('<span/>', {
            text: data.title.value
          })
        );

      $('<div/>', { class: 'circle-info' })
        .append(infoLeft)
        .append(infoRight)
        .appendTo('.mapcontainer__pie');

      infoLeft.append(infoTitle).append(pieEl);

      var circle = new self.circle(data.percentage, pieEl.width());

      var svg = self.helper.createSVG('svg', {
        class: 'circle-pie',
        width: circle.width,
        height: circle.height
      });

      var progressBG = self.helper.createSVG('circle', {
        class: 'circle-info__progress-bg',
        fill: 'none',
        stroke: '#aaaaaa',
        r: circle.radius,
        cx: circle.cx,
        cy: circle.cy,
        'stroke-width': circle.strokeWidth
      });

      var progressBar = self.helper.createSVG('circle', {
        class: 'circle-info__progress-bar',
        fill: 'none',
        stroke: data.color,
        r: circle.radius,
        cx: circle.cx,
        cy: circle.cy,
        'stroke-width': circle.strokeWidth
      });

      svg.appendChild(progressBG);
      svg.appendChild(progressBar);
      setTimeout(function() {
        $(progressBar).css('stroke-dasharray', [
          (circle.circumference / 100) * circle.percentage,
          circle.circumference
        ]);
      }, 0);
      pieEl.append(svg);

      $('<div/>', {
        class: 'circle-percentage',
        text: data.percentage + '% прогнозное выполнение'
      })
        .css({
          color: data.color
        })
        .appendTo(infoRight);

      var infoSize = circle.radius * 2 - circle.strokeWidth;
      var infoPos = circle.height / 2 - infoSize / 2;

      infoTitle.css('margin', '0px ' + (infoPos - circle.strokeWidth) + 'px');

      $('<div/>', {
        class: 'circle-main__text'
      })
        .css({
          width: infoSize + 'px',
          height: infoSize + 'px',
          top: infoPos + 'px',
          left: infoPos + 'px'
        })
        .appendTo(pieEl);

      data.data.forEach(function(item) {
        var el = $('<div/>', { class: 'circle-info__item' }).appendTo(
          '.circle-main__text'
        );
        var valueEl = $('<span/>', {
          class: 'circle-info__item-value',
          text: item.value
        });
        var labelEl = $('<span/>', {
          class: 'circle-info__item-lbl'
        }).append(item.label);
        if (item.label === 'ПМ') {
          var tooltipEl = $('<div/>', {
            class: 'info-lbl-tooltip',
            text: 'i'
          });
          el.append(tooltipEl);
          tooltipEl.append(
            $('<div/>', {
              class: 'tooltip tooltip-pie',
              text: 'Учитываются только ПМ\n с наличием плана'
            }).css({
              bottom: '0',
              right: '30px'
            })
          );
          tooltipEl
            .mouseenter(function() {
              $('.tooltip-pie').css({
                opacity: 1
              });
            })
            .mouseleave(function() {
              $('.tooltip-pie').css({
                opacity: 0
              });
            });
        }

        labelEl.appendTo(el);
        valueEl.appendTo(el);
      });

      if (data.error) {
        $('<div/>', {
          class: 'circle-info__err',
          text: data.error
        }).appendTo('.circle-main__text');
      }
    };

    function zoomHandler(d, delta) {
      self.definePieKeys();
      var code = (d && d.properties['int_ref']) || '';
      var dataObj = mapCollection.data[code];
      var e = (d && event) || {
        deltaY: delta,
        offsetX: self.width / 2,
        offsetY: self.height / 2
      };
      requestAnimationFrame(redraw);

      function redraw() {
        var currScale = self.projection.scale();
        self.zoomScale.zoom = e.deltaY > 0 ? 1 : -1;
        var newScale =
          currScale -
          (e.deltaY > 0 ? 65 : -65) * (2 * self.zoomScale.multiplier);

        if (newScale < 100) {
          self.zoomScale.reset();
          return;
        }

        var currTranslate = self.projection.translate();
        var coords = self.projection.invert([e.offsetX, e.offsetY]);
        self.projection.scale(newScale);
        var newPos = self.projection(coords);
        self.projection.translate([
          currTranslate[0] + (e.offsetX - newPos[0]),
          currTranslate[1] + (e.offsetY - newPos[1])
        ]);
        g.selectAll('path').attr('d', path);

        if (
          (lastZoomed !== d || !cities) &&
          dataObj &&
          self.zoomScale.citiesVisible()
        ) {
          drawCities(code);
        } else {
          if (!self.zoomScale.citiesVisible()) {
            if (cities) {
              cities.remove();
              cities = null;
            }
          } else redrawCities.call(self);
        }

        paint.call(self, d);
        lastZoomed = d;
      }

      function paint(zoomed) {
        var self = this;

        if (self.zoomScale.isZoom(self.zoomScale.UD)) {
          paintEntity.call(
            self,
            zoomed,
            'UDGO_PROGNOZ',
            'UDGO',
            'UDGO_FAKT',
            'UDGO_PLAN',
            'UDGO_PRC'
          );
        } else if (self.zoomScale.isZoom(self.zoomScale.ROO)) {
          paintEntity.call(
            self,
            zoomed,
            'ROO_PROGNOZ',
            'ROO',
            'ROO_FAKT',
            'ROO_PLAN',
            'ROO_PRC'
          );
        } else if (self.zoomScale.isZoom(self.zoomScale.REG)) {
          paintEntity.call(
            self,
            zoomed,
            'REGION_PROGNOZ',
            'REGION',
            'REGION_FAKT',
            'REGION_PLAN',
            'REGION_PRC'
          );
        } else {
          redrawBorder.call(self);
        }
      }
    }

    function paintEntity(zoomed, color, name, fact, plan, prc) {
      var self = this;
      var e = zoomed && mapCollection.data[zoomed.properties['int_ref']];
      self.definePieKeys();
      self.defineTableColumns();

      if (e) {
        mapCollection.refData.all.forEach(function(el) {
          d3.select(el)
            .transition()
            .duration(300)
            .attr('class', null);
        });
        mapCollection.selected(self, zoomed).forEach(function(el) {
          d3.select(el)
            .transition()
            .duration(300)
            .attr('class', 'highlighted');
        });
        self.tooltip.text(
          e[name] +
            ' \nплан: ' +
            (plan === 'UDGO_PLAN'
              ? mapCollection.udgos[e[name]][plan].toLocaleString()
              : e[plan]) +
            '\nфакт: ' +
            (fact === 'UDGO_FAKT'
              ? mapCollection.udgos[e[name]][fact].toLocaleString()
              : e[fact]) +
            ' \n% выполнения: ' +
            (prc === 'UDGO_PRC'
              ? mapCollection.udgos[e[name]][prc].toLocaleString()
              : e[prc]) +
            '\n% выполнения, прогноз: ' +
            e[color]
        );
      }

      redrawBorder.call(self);

      var _loop = function _loop(k) {
        var entry = mapCollection.data[k];

        d3.select(entry.ref)
          .style('fill', function() {
            return self.color(self.helper.toNumber(entry[color])) || '#aaa';
          })
          .on('mouseover', function(d) {
            mapCollection.selected(self, d).forEach(function(el) {
              d3.select(el)
                .transition()
                .duration(300)
                .attr('class', 'highlighted');
            });
            self.tooltip
              .transition()
              .duration(300)
              .style('opacity', 1);
            self.tooltip
              .text(
                entry[name] +
                  ' \nплан: ' +
                  (plan === 'UDGO_PLAN'
                    ? mapCollection.udgos[entry[name]][plan].toLocaleString()
                    : entry[plan]) +
                  '\nфакт: ' +
                  (fact === 'UDGO_FAKT'
                    ? mapCollection.udgos[entry[name]][fact].toLocaleString()
                    : entry[fact]) +
                  ' \n% выполнения: ' +
                  (prc === 'UDGO_PRC'
                    ? mapCollection.udgos[entry[name]][prc].toLocaleString()
                    : entry[prc]) +
                  '\n% выполнения, прогноз: ' +
                  entry[color]
              )
              .style('left', d3.event.pageX + 'px')
              .style('top', d3.event.pageY - 20 + 'px');
          })
          .on('mouseout', function(d) {
            mapCollection.refData.all.forEach(function(el) {
              d3.select(el)
                .transition()
                .duration(300)
                .attr('class', null);
            });
            self.tooltip
              .transition()
              .duration(300)
              .style('opacity', 0);
          })
          .on('click', function(d) {
            self.onClick(d);
            self.createTable(self.getDataTable(entry, name));
            self.createPie(self.getDataPie(entry, name, color));
          });
      };

      for (var k in mapCollection.data) {
        _loop(k);
      }
    }

    function redrawBorder() {
      d3.selectAll('path.subunit-boundary').remove();
      var self = this;
      var col = mapCollection.collection(self, self.zoomScale.curState);
      if (Object.keys(col).length === 0) borders(self, []);
      else
        for (var k in col) {
          borders(self, col[k] || []);
        }
    }

    function borders(context, array) {
      var allBounds = [];
      array.forEach(function(p) {
        allBounds.push(p.__data__.properties['int_ref']);
      });

      var compare = function compare(a, b) {
        var c1 = allBounds.indexOf(a.properties['int_ref']);
        var c2 = allBounds.indexOf(b.properties['int_ref']);
        return (c1 === -1 && c2 !== -1) || (c1 !== -1 && c2 === -1);
      };

      if (allBounds.length === 0) {
        compare = function compare(a, b) {
          return a !== b;
        };
      }

      context.svg
        .append('path')
        .datum(topojson.mesh(mapData, mapData.objects.russia, compare))
        .attr('d', path)
        .attr('class', 'subunit-boundary');
    }

    (function() {
      d3.select('.btn1').on('click', function() {
        zoomHandler(null, 1);
      });
      d3.select('.btn2').on('click', function() {
        zoomHandler(null, -1);
      });
    })();

    var dragHandler = d3.drag().on('drag', function() {
      var dx = d3.event.dx,
        dy = d3.event.dy;
      requestAnimationFrame(function() {
        var currTranslate = self.projection.translate();
        self.projection.translate([
          currTranslate[0] + dx,
          currTranslate[1] + dy
        ]);
        g.selectAll('path').attr('d', path);
        if (self.zoomScale.citiesVisible()) {
          redrawCities.call(self);
        }
        redrawBorder.call(self);
      });
    });
    g.call(dragHandler);
  }

  function redrawCities() {
    var self = this;
    self.svg.selectAll('g.city').attr('transform', function(d) {
      return 'translate(' + self.projection([d.LON, d.LAT]) + ')';
    });
  }

  function drawLegend() {
    var self = this;
    var ls_w = 20,
      ls_h = 20;
    var h = 100;
    self.svgWrap
      .append('rect')
      .attr('width', 87)
      .attr('height', 80)
      .attr('x', 10)
      .attr('y', function(d, i) {
        return h - 10 - 4 * ls_h;
      })
      .style('fill', '#fff')
      .style('stroke', '#000');
    var legend = self.svgWrap
      .selectAll('g.legend')
      .data(self.ext_color_domain)
      .enter()
      .append('g')
      .attr('class', 'legend');
    legend
      .append('rect')
      .attr('x', 20)
      .attr('y', function(d, i) {
        return h - i * ls_h - 2 * ls_h;
      })
      .attr('width', ls_w)
      .attr('height', ls_h)
      .style('fill', function(d, i) {
        return self.color(d);
      })
      .style('opacity', 0.8);
    legend
      .append('text')
      .attr('x', 50)
      .attr('y', function(d, i) {
        return h - i * ls_h - ls_h - 4;
      })
      .text(function(d, i) {
        return self.legend_labels[i];
      });
  }

  this.regionsCsv =
    'Rtype,RegionCode,RegionName\n' +
    'fregion,RU-BEL,Белгородская область\n' +
    'fregion,RU-BRY,Брянская область\n' +
    'fregion,RU-VLA,Владимирская область\n' +
    'fregion,RU-VOR,Воронежская область\n' +
    'fregion,RU-IVA,Ивановская область\n' +
    'fregion,RU-KLU,Калужская область\n' +
    'fregion,RU-KOS,Костромская область\n' +
    'fregion,RU-KRS,Курская область\n' +
    'fregion,RU-LIP,Липецкая область\n' +
    'fregion,RU-MOW,Москва\n' +
    'fregion,RU-MOS,Московская область\n' +
    'fregion,RU-ORL,Орловская область\n' +
    'fregion,RU-RYA,Рязанская область\n' +
    'fregion,RU-SMO,Смоленская область\n' +
    'fregion,RU-TAM,Тамбовская область\n' +
    'fregion,RU-TVE,Тверская область\n' +
    'fregion,RU-TUL,Тульская область\n' +
    'fregion,RU-YAR,Ярославская область\n' +
    'fdistrict,Central,Центральный округ\n' +
    'fregion,RU-KR,Республика Карелия\n' +
    'fregion,RU-KO,Республика Коми\n' +
    'fregion,RU-ARK,Архангельская область\n' +
    'fregion,RU-VLG,Вологодская область\n' +
    'fregion,RU-KGD,Калининградская область\n' +
    'fregion,RU-LEN,Ленинградская область\n' +
    'fregion,RU-SPE,Санкт-Петербург\n' +
    'fregion,RU-MUR,Мурманская область\n' +
    'fregion,RU-NGR,Новгородская область\n' +
    'fregion,RU-PSK,Псковская область\n' +
    'fregion,RU-NEN,Ненецкий авт.округ\n' +
    'fdistrict,Northwestern,Северо-Западный округ\n' +
    'fregion,RU-AD,Республика Адыгея\n' +
    'fregion,RU-KL,Республика Калмыкия\n' +
    'fregion,RU-KDA,Краснодарский край\n' +
    'fregion,RU-AST,Астраханская область\n' +
    'fregion,RU-VGG,Волгоградская область\n' +
    'fregion,RU-ROS,Ростовская область\n' +
    'fdistrict,Southern,Южный округ\n' +
    'fregion,RU-DA,Республика Дагестан\n' +
    'fregion,RU-IN,Республика Ингушетия\n' +
    'fregion,RU-KB,Кабардино-Балкарская Республика\n' +
    'fregion,RU-KC,Карачаево-Черкесская Республика\n' +
    'fregion,RU-SE,Республика Северная Осетия\n' +
    'fregion,RU-CE,Чеченская Республика\n' +
    'fregion,RU-CE & RU-IN,Чеченская Республика и Республика Ингушетия\n' +
    'fregion,RU-STA,Ставропольский край\n' +
    'fdistrict,Northcaucasian,Северо-Кавказский округ\n' +
    'fregion,RU-BA,Республика Башкортостан\n' +
    'fregion,RU-ME,Республика Марий Эл\n' +
    'fregion,RU-MO,Республика Мордовия\n' +
    'fregion,RU-TA,Республика Татарстан\n' +
    'fregion,RU-UD,Удмуртская Республика\n' +
    'fregion,RU-CU,Чувашская Республика\n' +
    'fregion,RU-PER,Пермский край\n' +
    'fregion,RU-KIR,Кировская область\n' +
    'fregion,RU-NIZ,Нижегородская область\n' +
    'fregion,RU-ORE,Оренбургская область\n' +
    'fregion,RU-PNZ,Пензенская область\n' +
    'fregion,RU-SAM,Самарская область\n' +
    'fregion,RU-SAR,Саратовская область\n' +
    'fregion,RU-ULY,Ульяновская область\n' +
    'fdistrict,Volga,Приволжский округ\n' +
    'fregion,RU-KGN,Курганская область\n' +
    'fregion,RU-SVE,Свердловская область\n' +
    'fregion,RU-TYU,Тюменская область\n' +
    'fregion,RU-CHE,Челябинская область\n' +
    'fregion,RU-KHM,Ханты-мансийский авт.округ\n' +
    'fregion,RU-YAN,Ямало-ненецкий авт.округ\n' +
    'fdistrict,Urals,Уральский округ\n' +
    'fregion,RU-AL,Республика Алтай\n' +
    'fregion,RU-BU,Республика Бурятия\n' +
    'fregion,RU-TY,Республика Тыва\n' +
    'fregion,RU-KK,Республика Хакасия\n' +
    'fregion,RU-ALT,Алтайский край\n' +
    'fregion,RU-ZAB,Забайкальский край\n' +
    'fregion,RU-KYA,Красноярский край\n' +
    'fregion,RU-IRK,Иркутская область\n' +
    'fregion,RU-KEM,Кемеровская область\n' +
    'fregion,RU-NVS,Новосибирская область\n' +
    'fregion,RU-OMS,Омская область\n' +
    'fregion,RU-TOM,Томская область\n' +
    'fdistrict,Siberia,Сибирский округ\n' +
    'fregion,RU-SA,Республика Саха (Якутия)\n' +
    'fregion,RU-PRI,Приморский край\n' +
    'fregion,RU-KAM,Камчатский край\n' +
    'fregion,RU-KHA,Хабаровский край\n' +
    'fregion,RU-AMU,Амурская область\n' +
    'fregion,RU-MAG,Магаданская область\n' +
    'fregion,RU-SAK,Сахалинская область\n' +
    'fregion,RU-YEV,Еврейская автономная область\n' +
    'fregion,RU-CHU,Чукотский авт.округ\n' +
    'fdistrict,Far_Eastern,Дальневосточный округ\n';
} //====================================================================//

(function() {
  var out$ = window;
  out$['default'] = out$;
  var xmlNs = 'http://www.w3.org/2000/xmlns/';
  var xhtmlNs = 'http://www.w3.org/1999/xhtml';
  var svgNs = 'http://www.w3.org/2000/svg';
  var doctype =
    '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';
  var urlRegex = /url\(["']?(.+?)["']?\)/;
  var fontFormats = {
    woff2: 'font/woff2',
    woff: 'font/woff',
    otf: 'application/x-font-opentype',
    ttf: 'application/x-font-ttf',
    eot: 'application/vnd.ms-fontobject',
    sfnt: 'application/font-sfnt',
    svg: 'image/svg+xml'
  };

  var isElement = function isElement(obj) {
    return obj instanceof HTMLElement || obj instanceof SVGElement;
  };

  var requireDomNode = function requireDomNode(el) {
    if (!isElement(el))
      throw new Error(
        'an HTMLElement or SVGElement is required; got '.concat(el)
      );
  };

  var requireDomNodePromise = function requireDomNodePromise(el) {
    return new Promise(function(resolve, reject) {
      if (isElement(el)) resolve(el);
      else
        reject(
          new Error('an HTMLElement or SVGElement is required; got '.concat(el))
        );
    });
  };

  var isExternal = function isExternal(url) {
    return (
      url &&
      url.lastIndexOf('http', 0) === 0 &&
      url.lastIndexOf(window.location.host) === -1
    );
  };

  var getFontMimeTypeFromUrl = function getFontMimeTypeFromUrl(fontUrl) {
    var formats = Object.keys(fontFormats)
      .filter(function(extension) {
        return fontUrl.indexOf('.'.concat(extension)) > 0;
      })
      .map(function(extension) {
        return fontFormats[extension];
      });
    if (formats) return formats[0];
    console.error(
      'Unknown font format for '.concat(
        fontUrl,
        '. Fonts may not be working correctly.'
      )
    );
    return 'application/octet-stream';
  };

  var arrayBufferToBase64 = function arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);

    for (var i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary);
  };

  var getDimension = function getDimension(el, clone, dim) {
    var v =
      (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal[dim]) ||
      (clone.getAttribute(dim) !== null &&
        !clone.getAttribute(dim).match(/%$/) &&
        parseInt(clone.getAttribute(dim))) ||
      el.getBoundingClientRect()[dim] ||
      parseInt(clone.style[dim]) ||
      parseInt(window.getComputedStyle(el).getPropertyValue(dim));
    return typeof v === 'undefined' || v === null || isNaN(parseFloat(v))
      ? 0
      : v;
  };

  var getDimensions = function getDimensions(el, clone, width, height) {
    if (el.tagName === 'svg')
      return {
        width: width || getDimension(el, clone, 'width'),
        height: height || getDimension(el, clone, 'height')
      };
    else if (el.getBBox) {
      var _el$getBBox = el.getBBox(),
        x = _el$getBBox.x,
        y = _el$getBBox.y,
        _width = _el$getBBox.width,
        _height = _el$getBBox.height;

      return {
        width: x + _width,
        height: y + _height
      };
    }
  };

  var reEncode = function reEncode(data) {
    return decodeURIComponent(
      encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        var c = String.fromCharCode('0x'.concat(p1));
        return c === '%' ? '%25' : c;
      })
    );
  };

  var uriToBlob = function uriToBlob(uri) {
    var byteString = window.atob(uri.split(',')[1]);
    var mimeString = uri
      .split(',')[0]
      .split(':')[1]
      .split(';')[0];
    var buffer = new ArrayBuffer(byteString.length);
    var intArray = new Uint8Array(buffer);

    for (var i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }

    return new Blob([buffer], {
      type: mimeString
    });
  };

  var query = function query(el, selector) {
    if (!selector) return;

    try {
      return (
        el.querySelector(selector) ||
        (el.parentNode && el.parentNode.querySelector(selector))
      );
    } catch (err) {
      console.warn('Invalid CSS selector "'.concat(selector, '"'), err);
    }
  };

  var detectCssFont = function detectCssFont(rule, href) {
    // Match CSS font-face rules to external links.
    // @font-face {
    //   src: local('Abel'), url(https://fonts.gstatic.com/s/abel/v6/UzN-iejR1VoXU2Oc-7LsbvesZW2xOQ-xsNqO47m55DA.woff2);
    // }
    var match = rule.cssText.match(urlRegex);
    var url = (match && match[1]) || '';
    if (!url || url.match(/^data:/) || url === 'about:blank') return;
    var fullUrl = url.startsWith('../')
      ? ''.concat(href, '/../').concat(url)
      : url.startsWith('./')
      ? ''.concat(href, '/.').concat(url)
      : url;
    return {
      text: rule.cssText,
      format: getFontMimeTypeFromUrl(fullUrl),
      url: fullUrl
    };
  };

  var inlineImages = function inlineImages(el) {
    return Promise.all(
      Array.from(el.querySelectorAll('image')).map(function(image) {
        var href =
          image.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
          image.getAttribute('href');
        if (!href) return Promise.resolve(null);

        if (isExternal(href)) {
          href +=
            (href.indexOf('?') === -1 ? '?' : '&') +
            't=' +
            new Date().valueOf();
        }

        return new Promise(function(resolve, reject) {
          var canvas = document.createElement('canvas');
          var img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = href;

          img.onerror = function() {
            return reject(new Error('Could not load '.concat(href)));
          };

          img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            image.setAttributeNS(
              'http://www.w3.org/1999/xlink',
              'href',
              canvas.toDataURL('image/png')
            );
            resolve(true);
          };
        });
      })
    );
  };

  var cachedFonts = {};

  var inlineFonts = function inlineFonts(fonts) {
    return Promise.all(
      fonts.map(function(font) {
        return new Promise(function(resolve, reject) {
          if (cachedFonts[font.url]) return resolve(cachedFonts[font.url]);
          var req = new XMLHttpRequest();
          req.addEventListener('load', function() {
            // TODO: it may also be worth it to wait until fonts are fully loaded before
            // attempting to rasterize them. (e.g. use https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet)
            var fontInBase64 = arrayBufferToBase64(req.response);
            var fontUri =
              font.text.replace(
                urlRegex,
                'url("data:'
                  .concat(font.format, ';base64,')
                  .concat(fontInBase64, '")')
              ) + '\n';
            cachedFonts[font.url] = fontUri;
            resolve(fontUri);
          });
          req.addEventListener('error', function(e) {
            console.warn('Failed to load font from: '.concat(font.url), e);
            cachedFonts[font.url] = null;
            resolve(null);
          });
          req.addEventListener('abort', function(e) {
            console.warn('Aborted loading font from: '.concat(font.url), e);
            resolve(null);
          });
          req.open('GET', font.url);
          req.responseType = 'arraybuffer';
          req.send();
        });
      })
    ).then(function(fontCss) {
      return fontCss
        .filter(function(x) {
          return x;
        })
        .join('');
    });
  };

  var cachedRules = null;

  var styleSheetRules = function styleSheetRules() {
    if (cachedRules) return cachedRules;
    return (cachedRules = Array.from(document.styleSheets).map(function(sheet) {
      try {
        return {
          rules: sheet.cssRules,
          href: sheet.href
        };
      } catch (e) {
        console.warn('Stylesheet could not be loaded: '.concat(sheet.href), e);
        return {};
      }
    }));
  };

  var inlineCss = function inlineCss(el, options) {
    var _ref = options || {},
      selectorRemap = _ref.selectorRemap,
      modifyStyle = _ref.modifyStyle,
      modifyCss = _ref.modifyCss,
      fonts = _ref.fonts;

    var generateCss =
      modifyCss ||
      function(selector, properties) {
        var sel = selectorRemap ? selectorRemap(selector) : selector;
        var props = modifyStyle ? modifyStyle(properties) : properties;
        return ''.concat(sel, '{').concat(props, '}\n');
      };

    var css = [];
    var detectFonts = typeof fonts === 'undefined';
    var fontList = fonts || [];
    styleSheetRules().forEach(function(_ref2) {
      var rules = _ref2.rules,
        href = _ref2.href;
      if (!rules) return;
      Array.from(rules).forEach(function(rule) {
        if (typeof rule.style != 'undefined') {
          if (query(el, rule.selectorText))
            css.push(generateCss(rule.selectorText, rule.style.cssText));
          else if (detectFonts && rule.cssText.match(/^@font-face/)) {
            var font = detectCssFont(rule, href);
            if (font) fontList.push(font);
          } else css.push(rule.cssText);
        }
      });
    });
    return inlineFonts(fontList).then(function(fontCss) {
      return css.join('\n') + fontCss;
    });
  };

  var downloadOptions = function downloadOptions() {
    if (
      !navigator.msSaveOrOpenBlob &&
      !('download' in document.createElement('a'))
    ) {
      return {
        popup: window.open()
      };
    }
  };

  out$.prepareSvg = function(el, options, done) {
    requireDomNode(el);

    var _ref3 = options || {},
      _ref3$left = _ref3.left,
      left = _ref3$left === void 0 ? 0 : _ref3$left,
      _ref3$top = _ref3.top,
      top = _ref3$top === void 0 ? 0 : _ref3$top,
      w = _ref3.width,
      h = _ref3.height,
      _ref3$scale = _ref3.scale,
      scale = _ref3$scale === void 0 ? 1 : _ref3$scale,
      _ref3$responsive = _ref3.responsive,
      responsive = _ref3$responsive === void 0 ? false : _ref3$responsive;

    return inlineImages(el).then(function() {
      var clone = el.cloneNode(true);
      clone.style.backgroundColor =
        (options || {}).backgroundColor || el.style.backgroundColor;

      var _getDimensions = getDimensions(el, clone, w, h),
        width = _getDimensions.width,
        height = _getDimensions.height;

      if (el.tagName !== 'svg') {
        if (el.getBBox) {
          if (clone.getAttribute('transform') != null) {
            clone.setAttribute(
              'transform',
              clone.getAttribute('transform').replace(/translate\(.*?\)/, '')
            );
          }

          var svg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
          );
          svg.appendChild(clone);
          clone = svg;
        } else {
          console.error('Attempted to render non-SVG element', el);
          return;
        }
      }

      clone.setAttribute('version', '1.1');
      clone.setAttribute('viewBox', [left, top, width, height].join(' '));
      if (!clone.getAttribute('xmlns'))
        clone.setAttributeNS(xmlNs, 'xmlns', svgNs);
      if (!clone.getAttribute('xmlns:xlink'))
        clone.setAttributeNS(
          xmlNs,
          'xmlns:xlink',
          'http://www.w3.org/1999/xlink'
        );

      if (responsive) {
        clone.removeAttribute('width');
        clone.removeAttribute('height');
        clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');
      } else {
        clone.setAttribute('width', width * scale);
        clone.setAttribute('height', height * scale);
      }

      Array.from(clone.querySelectorAll('foreignObject > *')).forEach(function(
        foreignObject
      ) {
        foreignObject.setAttributeNS(
          xmlNs,
          'xmlns',
          foreignObject.tagName === 'svg' ? svgNs : xhtmlNs
        );
      });
      return inlineCss(el, options).then(function(css) {
        var style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.innerHTML = '<![CDATA[\n'.concat(css, '\n]]>');
        var defs = document.createElement('defs');
        defs.appendChild(style);
        clone.insertBefore(defs, clone.firstChild);
        var outer = document.createElement('div');
        outer.appendChild(clone);
        var src = outer.innerHTML.replace(
          /NS\d+:href/gi,
          'xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href'
        );
        if (typeof done === 'function') done(src, width, height);
        else
          return {
            src: src,
            width: width,
            height: height
          };
      });
    });
  };

  out$.svgAsDataUri = function(el, options, done) {
    requireDomNode(el);
    return out$.prepareSvg(el, options).then(function(_ref4) {
      var src = _ref4.src,
        width = _ref4.width,
        height = _ref4.height;
      var svgXml = 'data:image/svg+xml;base64,'.concat(
        window.btoa(reEncode(doctype + src))
      );

      if (typeof done === 'function') {
        done(svgXml, width, height);
      }

      return svgXml;
    });
  };

  out$.svgAsPngUri = function(el, options, done) {
    requireDomNode(el);

    var _ref5 = options || {},
      _ref5$encoderType = _ref5.encoderType,
      encoderType =
        _ref5$encoderType === void 0 ? 'image/png' : _ref5$encoderType,
      _ref5$encoderOptions = _ref5.encoderOptions,
      encoderOptions =
        _ref5$encoderOptions === void 0 ? 0.8 : _ref5$encoderOptions,
      canvg = _ref5.canvg;

    var convertToPng = function convertToPng(_ref6) {
      var src = _ref6.src,
        width = _ref6.width,
        height = _ref6.height;
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      var pixelRatio = window.devicePixelRatio || 1;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = ''.concat(canvas.width, 'px');
      canvas.style.height = ''.concat(canvas.height, 'px');
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      if (canvg) canvg(canvas, src);
      else context.drawImage(src, 0, 0);
      var png;

      try {
        png = canvas.toDataURL(encoderType, encoderOptions);
      } catch (e) {
        if (
          (typeof SecurityError !== 'undefined' &&
            e instanceof SecurityError) ||
          e.name === 'SecurityError'
        ) {
          console.error(
            'Rendered SVG images cannot be downloaded in this browser.'
          );
          return;
        } else throw e;
      }

      if (typeof done === 'function') done(png, canvas.width, canvas.height);
      return Promise.resolve(png);
    };

    if (canvg) return out$.prepareSvg(el, options).then(convertToPng);
    else
      return out$.svgAsDataUri(el, options).then(function(uri) {
        return new Promise(function(resolve, reject) {
          var image = new Image();

          image.onload = function() {
            return resolve(
              convertToPng({
                src: image,
                width: image.width,
                height: image.height
              })
            );
          };

          image.onerror = function() {
            reject(
              'There was an error loading the data URI as an image on the following SVG\n'
                .concat(
                  window.atob(uri.slice(26)),
                  "Open the following link to see browser's diagnosis\n"
                )
                .concat(uri)
            );
          };

          image.src = uri;
        });
      });
  };

  out$.download = function(name, uri, options) {
    if (navigator.msSaveOrOpenBlob)
      navigator.msSaveOrOpenBlob(uriToBlob(uri), name);
    else {
      var saveLink = document.createElement('a');

      if ('download' in saveLink) {
        saveLink.download = name;
        saveLink.style.display = 'none';
        document.body.appendChild(saveLink);

        try {
          var blob = uriToBlob(uri);
          var url = URL.createObjectURL(blob);
          saveLink.href = url;

          saveLink.onclick = function() {
            return requestAnimationFrame(function() {
              return URL.revokeObjectURL(url);
            });
          };
        } catch (e) {
          console.error(e);
          console.warn(
            'Error while getting object URL. Falling back to string URL.'
          );
          saveLink.href = uri;
        }

        saveLink.click();
        document.body.removeChild(saveLink);
      } else if (options && options.popup) {
        options.popup.document.title = name;
        options.popup.location.replace(uri);
      }
    }
  };

  out$.saveSvg = function(el, name, options) {
    var downloadOpts = downloadOptions(); // don't inline, can't be async

    return requireDomNodePromise(el)
      .then(function(el) {
        return out$.svgAsDataUri(el, options || {});
      })
      .then(function(uri) {
        return out$.download(name, uri, downloadOpts);
      });
  };

  out$.saveSvgAsPng = function(el, name, options) {
    var downloadOpts = downloadOptions(); // don't inline, can't be async

    return requireDomNodePromise(el)
      .then(function(el) {
        return out$.svgAsPngUri(el, options || {});
      })
      .then(function(uri) {
        return out$.download(name, uri, downloadOpts);
      });
  };
})();
