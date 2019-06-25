import { throttle } from 'lodash';
import d3 from 'd3';
import nv from 'nvd3';
import mathjs from 'mathjs';
import moment from 'moment';
import PropTypes from 'prop-types';
import { t } from '@superset-ui/translation';
import { CategoricalColorNamespace } from '@superset-ui/color';
import { getNumberFormatter, formatNumber, NumberFormats } from '@superset-ui/number-format';
import { getTimeFormatter, smartDateVerboseFormatter } from '@superset-ui/time-format';
import 'nvd3/build/nv.d3.min.css';
import { d3LocaleTimeFormat } from '../localeformat';

import ANNOTATION_TYPES, { applyNativeColumns } from '../../modules/AnnotationTypes';
import { isTruthy } from '../../utils/common';
import {
  cleanColorInput,
  computeBarChartWidth,
  drawBarValues,
  RemoveTotalBarValues,
  generateBubbleTooltipContent,
  generateMultiLineTooltipContent,
  generateRichLineTooltipContent,
  getMaxLabelSize,
  getTimeOrNumberFormatter,
  hideTooltips,
  tipFactory,
  tryNumify,
  setAxisShowMaxMin,
  stringifyTimeRange,
  wrapTooltip,
} from './utils';
import {
  annotationLayerType,
  boxPlotValueType,
  bulletDataType,
  categoryAndValueXYType,
  rgbObjectType,
  numericXYType,
  numberOrAutoType,
  stringOrObjectWithLabelType,
} from './PropTypes';
import './NVD3Vis.css';

const { getColor, getScale } = CategoricalColorNamespace;

// Limit on how large axes margins can grow as the chart window is resized
const MAX_MARGIN_PAD = 30;
const ANIMATION_TIME = 300;
const MIN_HEIGHT_FOR_BRUSH = 480;

const BREAKPOINTS = {
  small: 340,
};

const TIMESERIES_VIZ_TYPES = [
  'line',
  'dual_line',
  'line_multi',
  'area',
  'compare',
  'bar',
  'time_pivot',
];

const propTypes = {
  data: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.oneOfType([
      // pie
      categoryAndValueXYType,
      // dist-bar
      PropTypes.shape({
        key: PropTypes.string,
        values: PropTypes.arrayOf(categoryAndValueXYType),
      }),
      // area, line, compare, bar
      PropTypes.shape({
        key: PropTypes.arrayOf(PropTypes.string),
        values: PropTypes.arrayOf(numericXYType),
      }),
      // dual-line
      PropTypes.shape({
        classed: PropTypes.string,
        key: PropTypes.string,
        type: PropTypes.string,
        values: PropTypes.arrayOf(numericXYType),
        yAxis: PropTypes.number,
      }),
      // box-plot
      PropTypes.shape({
        label: PropTypes.string,
        values: PropTypes.arrayOf(boxPlotValueType),
      }),
      // bubble
      PropTypes.shape({
        key: PropTypes.string,
        values: PropTypes.arrayOf(PropTypes.object),
      }),
    ])),
    // bullet
    bulletDataType,
  ]),
  width: PropTypes.number,
  height: PropTypes.number,
  annotationData: PropTypes.object,
  annotationLayers: PropTypes.arrayOf(annotationLayerType),
  bottomMargin: numberOrAutoType,
  colorScheme: PropTypes.string,
  comparisonType: PropTypes.string,
  contribution: PropTypes.bool,
  leftMargin: numberOrAutoType,
  onError: PropTypes.func,
  showLegend: PropTypes.bool,
  showMarkers: PropTypes.bool,
  useRichTooltip: PropTypes.bool,
  vizType: PropTypes.oneOf([
    'area',
    'bar',
    'box_plot',
    'bubble',
    'bullet',
    'compare',
    'column',
    'dist_bar',
    'line',
    'line_multi',
    'time_pivot',
    'pie',
    'dual_line',
  ]),
  xAxisFormat: PropTypes.string,
  xAxisLabel: PropTypes.string,
  xAxisShowMinMax: PropTypes.bool,
  xIsLogScale: PropTypes.bool,
  xTicksLayout: PropTypes.oneOf(['auto', 'staggered', '45°']),
  yAxisFormat: PropTypes.string,
  yAxisBounds: PropTypes.arrayOf(PropTypes.number),
  yAxisLabel: PropTypes.string,
  yAxisShowMinMax: PropTypes.bool,
  yIsLogScale: PropTypes.bool,
  // 'dist-bar' only
  orderBars: PropTypes.bool,
  // 'bar' or 'dist-bar'
  isBarStacked: PropTypes.bool,
  showBarValue: PropTypes.bool,
  // 'bar', 'dist-bar' or 'column'
  reduceXTicks: PropTypes.bool,
  // 'bar', 'dist-bar' or 'area'
  showControls: PropTypes.bool,
  // 'line' only
  showBrush: PropTypes.oneOf([true, false, 'auto']),
  onBrushEnd: PropTypes.func,
  // 'line-multi' or 'dual-line'
  yAxis2Format: PropTypes.string,
  // 'line', 'time-pivot', 'dual-line' or 'line-multi'
  lineInterpolation: PropTypes.string,
  // 'pie' only
  isDonut: PropTypes.bool,
  isPieLabelOutside: PropTypes.bool,
  pieLabelType: PropTypes.oneOf([
    'key',
    'value',
    'percent',
    'key_value',
    'key_percent',
  ]),
  showLabels: PropTypes.bool,
  // 'area' only
  areaStackedStyle: PropTypes.string,
  // 'bubble' only
  entity: PropTypes.string,
  maxBubbleSize: PropTypes.number,
  xField: stringOrObjectWithLabelType,
  yField: stringOrObjectWithLabelType,
  sizeField: stringOrObjectWithLabelType,
  // time-pivot only
  baseColor: rgbObjectType,
  steps: PropTypes.string,
};

const NOOP = () => {};
const formatter = getNumberFormatter();

function nvd3Vis(element, props) {
  const {
    data,
    width: maxWidth,
    height: maxHeight,
    annotationData,
    annotationLayers = [],
    areaStackedStyle,
    baseColor,
    bottomMargin,
    colorScheme,
    comparisonType,
    contribution,
    entity,
    isBarStacked,
    isDonut,
    isPieLabelOutside,
    leftMargin,
    lineInterpolation = 'linear',
    maxBubbleSize,
    onBrushEnd = NOOP,
    onError = NOOP,
    orderBars,
    pieLabelType,
    reduceXTicks = false,
    showBarValue,
    showBrush,
    showControls,
    showLabels,
    showLegend,
    showMarkers,
    sizeField,
    useRichTooltip,
    vizType,
    xAxisFormat,
    xAxisLabel,
    xAxisShowMinMax = false,
    xField,
    xIsLogScale,
    xTicksLayout,
    yAxisFormat,
    yAxis2Format,
    yAxisBounds,
    yAxisLabel,
    yAxisShowMinMax = false,
    yField,
    yIsLogScale,
    selectChart,
    selectChart2,
    scaleY,
    scaleY2,
    autoScaleNegative,
    steps,
    chartid,
    tooltipProportion,
  } = props;

  const isExplore = document.querySelector('#explorer-container') !== null;
  const container = element;
  container.innerHTML = '';
  const activeAnnotationLayers = annotationLayers.filter(layer => layer.show);

  const translateControlBar = {"grouped":"Рядом","stacked":"Стопкой"}
	const translateControlStack = {"stacked":"Стопка","stream":"Поток","expanded":"Процент"}

  let chart;
  let width = maxWidth;
  let colorKey = 'key';

  function isVizTypes(types) {
    return types.indexOf(vizType) >= 0;
  }

  const Custom_Style_Lines = function (svg, data){
    try { //code validator !!!
      if (steps.length > 0) {
        const json = JSON.parse(steps);
        const keys = data.filter(series => !series.disabled).map(series => series.key);
        const legends = data.map(series => series.key);
      
        json.key.forEach(function(series_name) {
          const index = keys.indexOf(series_name);
          const legend_index = legends.indexOf(series_name);
          if (index > 0 ){
            const path = svg.selectAll('.nv-series-' + index + ' .nv-line');
            path
            .classed("line-dash", true)
            .attr("stroke-dashoffset", 24)
            .style("opacity", 1)
            .transition()
            .duration(2000)
            .style("opacity", 0.8)
            .attr("stroke-dashoffset", 0)
            .style('stroke-dasharray', ('4', '4'));
      
            if (showLegend) {
              const legend = svg.selectAll('circle.nv-legend-symbol')[0];
              d3.select(legend[legend_index])
                .classed("legend-dash", true)
                .style('stroke-dasharray', '0.9')
                .style('stroke', '#595959');
            };
          }
        });      
      }
    } catch(e) {};
  };

  const addDualAxisBarValue = function (svg, axisFormat) {
	  const format = d3.format(axisFormat || '.3s');
	  const countShowBar = 1;
	
	  const rectsToBeLabeled = svg.selectAll('g.nv-group').selectAll('rect');
	
	    const groupLabels = svg.select('g.bars1Wrap').append('g');
	    rectsToBeLabeled.each(
	      function (d) {
          const rectObj = d3.select(this);
	        if (rectObj.attr('class').includes('positive')) {
	          const transformAttr = rectObj.attr('transform');
	          const yPos = parseFloat(rectObj.attr('y'));
	          const xPos = parseFloat(rectObj.attr('x'));
	          const rectWidth = parseFloat(rectObj.attr('width'));
	          const t = groupLabels.append('text')
	            .attr('x', xPos) // rough position first, fine tune later
	            .attr('y', yPos - 5)
	            .text(format(d.y))
	            .attr('transform', transformAttr)
	            .attr('class', 'bar-chart-label')
	            .style("opacity", 0);
	          const labelWidth = t.node().getBBox().width;
	          t.transition().duration(300).style("opacity", 1).attr('x', xPos + rectWidth / 2 - labelWidth / 2); // fine tune
	        }
	      });
	};

  const AutoScaleNegativeBar = function (stacked) {
    if (showBarValue && autoScaleNegative) {

        let yMin;
        let yMax=0;
        let MaxMin;

        if (!stacked) {
          if (chart.state.disabled) {
            yMin = d3.min(data.map(function(array, i) {
              if (!chart.state.disabled[i]){
                return d3.min(array.values, d => (d.y < 0 ? d.y : 0));
              } 
            }));

            if (yMin < 0) {
              yMax = d3.max(data.map(function(array,i) {
                if (!chart.state.disabled[i]){
                  return d3.max(array.values, d => (d.y > 0 ? d.y : 0));
                } 
              }));
            }
          } else {
            yMin = d3.min(data.map(function(array) {
              return d3.min(array.values, d => (d.y));
            }));

            if (yMin < 0) {
              yMax = d3.max(data.map(function(array) {
                return d3.max(array.values, d => (d.y));
              }));
            }
          }
        } else {
          if (chart.state.disabled) {
            MaxMin = data[0].values.map(function (_, column_index) {
              return data.map(series => series.values[column_index].y).reduce(function(prev, item, i) {
                if (!chart.state.disabled[i]) {
                  if (item < 0) {
                    return [prev[0], item + prev[1]]
                  } else {
                    return [prev[0] + item, prev[1]]
                  }
                } else {
                  return [prev[0],prev[1]]
                }
              },[0,0]);
            });
          } else {
            MaxMin = data[0].values.map(function (_, column_index) {
              return data.map(series => series.values[column_index].y).reduce(function(prev, item, i) {
                if (item < 0) {
                  return [prev[0], item + prev[1]]
                } else {
                  return [prev[0] + item, prev[1]]
                }
              },[0,0]);
            });     
          }
          yMin = d3.min(MaxMin, d => d[1]);
          yMax = d3.max(MaxMin, d => d[0]);
        }

        if (yMin<0) {
          if (yMax === 0 ) {
            chart.forceY([(yMin - yMax) * 0.1 + yMin,0]);
          } else {
            chart.forceY([(yMin - yMax) * 0.1 + yMin]);
          }
        } else if (yMin === 0) {
          chart.forceY([0]);
        }
    }
  }

  const drawGraph = function () {
    const d3Element = d3.select(element);
    let svg = d3Element.select('svg');
    if (svg.empty()) {
      svg = d3Element.append('svg');
    }
    const height = vizType === 'bullet' ? Math.min(maxHeight, 50) : maxHeight;
    const isTimeSeries = isVizTypes(TIMESERIES_VIZ_TYPES);

    // Handling xAxis ticks settings
    const staggerLabels = xTicksLayout === 'staggered';
    const xLabelRotation =
      ((xTicksLayout === 'auto' && isVizTypes(['column', 'dist_bar']))
      || xTicksLayout === '45°')
      ? 45 : 0;
    if (xLabelRotation === 45 && isTruthy(showBrush)) {
      onError(t('You cannot use 45° tick layout along with the time range filter'));
      return null;
    }

    const canShowBrush = (
      isTruthy(showBrush) ||
      (showBrush === 'auto' && maxHeight >= MIN_HEIGHT_FOR_BRUSH && xTicksLayout !== '45°')
    );

    switch (vizType) {
      case 'line':
        if (canShowBrush) {
          chart = nv.models.lineWithFocusChart();
          if (staggerLabels) {
            // Give a bit more room to focus area if X axis ticks are staggered
            chart.focus.margin({ bottom: 40 });
            chart.focusHeight(80);
          }
          chart.focus.xScale(d3.time.scale.utc());
        } else {
          chart = nv.models.lineChart();
        }
        chart.xScale(d3.time.scale.utc());
        chart.interpolate(lineInterpolation);


        const SetYDomain = function (linedisabled) {
          const scale = 0.05;
          let yMax;
          let yMin;

          if (linedisabled) {
            yMax = d3.max(data.map(function(array, i) {
              if (linedisabled[i] === false) {return d3.max(array.values, d => (d.y))};
            }));

            yMin = d3.min(data.map(function(array, i) {
              if (linedisabled[i] === false) {return d3.min(array.values, d => (d.y))};
            }));

          } else {

            yMax = d3.max(data.map(function(array) {
              return d3.max(array.values, d => (d.y));
            }));

            yMin = d3.min(data.map(function(array) {
              return d3.min(array.values, d => (d.y));
            }));
          }

          return [yMin - (yMax - yMin) * scale, yMax + (yMax - yMin) * scale];
        }

        chart.yDomain(SetYDomain());

        chart.dispatch.on('stateChange', function(e) {
            chart.yDomain(SetYDomain(e.disabled));
        });

        chart.dispatch.on('renderEnd', function(){
          Custom_Style_Lines(svg, data);
          if (showMarkers) {
            svg.selectAll('.nv-point').filter((d) => d[0].y !== null)
            .style('stroke-opacity', 1)
            .style('fill-opacity', 1);
          }
        });


        break;

      case 'time_pivot':
        chart = nv.models.lineChart();
        chart.xScale(d3.time.scale.utc());
        chart.interpolate(lineInterpolation);
        break;

      case 'dual_line':
      case 'line_multi':
        chart = nv.models.multiChart();
        chart.interpolate(lineInterpolation);
        break;

      case 'bar':
        chart = nv.models.multiBarChart()
          .showControls(showControls)
          .groupSpacing(0.1)
          .duration(ANIMATION_TIME)
          .controlLabels(translateControlBar);

        if (!reduceXTicks) {
          width = computeBarChartWidth(data, isBarStacked, maxWidth);
        }
        chart.width(width);
        chart.xAxis.showMaxMin(false);
        chart.stacked(isBarStacked);
        chart.state.stacked = isBarStacked;

        AutoScaleNegativeBar(isBarStacked);
    
        if (showBarValue) {
          setTimeout(function () {
            drawBarValues(svg, chart, data, isBarStacked, yAxisFormat);
          }, ANIMATION_TIME+300);
        }
    
        chart.dispatch.on('stateChange', function(e) {
          if (showBarValue) {
            RemoveTotalBarValues(svg);
            AutoScaleNegativeBar(e.stacked);
            setTimeout(function () {
              drawBarValues(svg, chart, data, e.stacked, yAxisFormat);
            }, ANIMATION_TIME+300);
          }
        });

        break;

      case 'dist_bar':
        chart = nv.models.multiBarChart()
          .duration(ANIMATION_TIME)
          .showControls(showControls)
          .reduceXTicks(reduceXTicks)
          .controlLabels(translateControlBar)
          .groupSpacing(0.1); // Distance between each group of bars.

        chart.xAxis.showMaxMin(false);

        chart.stacked(isBarStacked);
        if (orderBars) {
          data.forEach((d) => {
            d.values.sort((a, b) => tryNumify(a.x) < tryNumify(b.x) ? -1 : 1);
          });
        }
        if (!reduceXTicks) {
          width = computeBarChartWidth(data, isBarStacked, maxWidth);
        }
        chart.width(width);

        chart.state.stacked = isBarStacked;

        AutoScaleNegativeBar(isBarStacked);
    
        if (showBarValue) {
          setTimeout(function () {
            drawBarValues(svg, chart, data, isBarStacked, yAxisFormat);
          }, ANIMATION_TIME+300);
        }
    
        chart.dispatch.on('stateChange', function(e) {
          if (showBarValue) {
            RemoveTotalBarValues(svg);
            AutoScaleNegativeBar(e.stacked);
            setTimeout(function () {
              drawBarValues(svg, chart, data, e.stacked, yAxisFormat);
            }, ANIMATION_TIME+300);
          }
        });

        break;

      case 'pie':
        chart = nv.models.pieChart();
        colorKey = 'x';
        chart.valueFormat(formatter);
        if (isDonut) {
          chart.donut(true);
        }
        chart.showLabels(showLabels);
        chart.labelsOutside(isPieLabelOutside);
        // Configure the minimum slice size for labels to show up
        chart.labelThreshold(0.05);
        chart.cornerRadius(true);

        if (pieLabelType !== 'key_percent' && pieLabelType !== 'key_value') {
          chart.labelType(pieLabelType);
        } else if (pieLabelType === 'key_value') {
          chart.labelType(d => `${d.data.x}: ${formatNumber(NumberFormats.SI, d.data.y)}`);
        }

        if (pieLabelType === 'percent' || pieLabelType === 'key_percent') {
          const total = d3.sum(data, d => d.y);
          chart.tooltip.valueFormatter(d => `${((d / total) * 100).toFixed()}%`);
          if (pieLabelType === 'key_percent') {
            chart.labelType(d => `${d.data.x}: ${((d.data.y / total) * 100).toFixed()}%`);
          }
        }
        // Pie chart does not need top margin
        chart.margin({ top: 0 });
        break;

      case 'column':
        chart = nv.models.multiBarChart()
          .reduceXTicks(false);
        break;

      case 'compare':
        chart = nv.models.cumulativeLineChart();
        chart.xScale(d3.time.scale.utc());
        chart.useInteractiveGuideline(true);
        chart.xAxis.showMaxMin(false);
        chart.interactiveLayer.tooltip.contentGenerator(d => generateRichLineTooltipContent(d, xAxisFormatter, yAxisFormatter));
        break;

      case 'bubble':
        chart = nv.models.scatterChart();
        chart.showDistX(true);
        chart.showDistY(true);
        chart.tooltip.contentGenerator(d =>
          generateBubbleTooltipContent({
            point: d.point,
            entity,
            xField,
            yField,
            sizeField,
            xFormatter: getTimeOrNumberFormatter(xAxisFormat),
            yFormatter: getTimeOrNumberFormatter(yAxisFormat),
            sizeFormatter: formatter,
          }));
        chart.pointRange([5, maxBubbleSize ** 2]);
        chart.pointDomain([0, d3.max(data, d => d3.max(d.values, v => v.size))]);
        break;

      case 'area':
        chart = nv.models.stackedAreaChart();
        chart.showControls(showControls);
        chart.style(areaStackedStyle);
        chart.xScale(d3.time.scale.utc());
        chart.controlLabels(translateControlStack);
        break;

      case 'box_plot':
        colorKey = 'label';
        chart = nv.models.boxPlotChart();
        chart.x(d => d.label);
        chart.maxBoxWidth(75); // prevent boxes from being incredibly wide
        break;

      case 'bullet':
        chart = nv.models.bulletChart();
        break;

      default:
        throw new Error('Unrecognized visualization for nvd3' + vizType);
    }
    // Assuming the container has padding already other than for top margin
    chart.margin({ left: 0, right: 0, bottom: 0 });

    if (canShowBrush && onBrushEnd !== NOOP) {
      chart.focus.dispatch.on('brush', (event) => {
        const timeRange = stringifyTimeRange(event.extent);
        if (timeRange) {
          event.brush.on('brushend', () => { onBrushEnd(timeRange); });
        }
      });
    }

    if (chart.xAxis && chart.xAxis.staggerLabels) {
      chart.xAxis.staggerLabels(staggerLabels);
    }
    if (chart.xAxis && chart.xAxis.rotateLabels) {
      chart.xAxis.rotateLabels(xLabelRotation);
    }
    if (chart.x2Axis && chart.x2Axis.staggerLabels) {
      chart.x2Axis.staggerLabels(staggerLabels);
    }
    if (chart.x2Axis && chart.x2Axis.rotateLabels) {
      chart.x2Axis.rotateLabels(xLabelRotation);
    }

    if ('showLegend' in chart && typeof showLegend !== 'undefined') {
      if (width < BREAKPOINTS.small && vizType !== 'pie') {
        chart.showLegend(false);
      } else {
        chart.showLegend(showLegend);
        chart.legend.margin({top: 5, bottom: 30});
      }
    }

    if (chart.forceY && yAxisBounds &&
        (yAxisBounds[0] !== null || yAxisBounds[1] !== null)) {
      chart.forceY(yAxisBounds);
    }
    if (yIsLogScale) {
      chart.yScale(d3.scale.log());
    }
    if (xIsLogScale) {
      chart.xScale(d3.scale.log());
    }

    let xAxisFormatter;
    if (isTimeSeries) {
      xAxisFormatter = d3LocaleTimeFormat(xAxisFormat);
      // In tooltips, always use the verbose time format
      //chart.interactiveLayer.tooltip.headerFormatter(smartDateVerboseFormatter);
    } else {
      xAxisFormatter = getTimeOrNumberFormatter(xAxisFormat);
    }
    if (chart.x2Axis && chart.x2Axis.tickFormat) {
      chart.x2Axis.tickFormat(xAxisFormatter);
    }
    const isXAxisString = isVizTypes(['dist_bar', 'box_plot']);
    if (!isXAxisString && chart.xAxis && chart.xAxis.tickFormat) {
      chart.xAxis.tickFormat(xAxisFormatter);
    }

    let yAxisFormatter = getTimeOrNumberFormatter(yAxisFormat);
    if (chart.yAxis && chart.yAxis.tickFormat) {
      if (contribution || comparisonType === 'percentage') {
        // When computing a "Percentage" or "Contribution" selected, we force a percentage format
        yAxisFormatter = getNumberFormatter(NumberFormats.PERCENT_1_POINT);
      }
      chart.yAxis.tickFormat(yAxisFormatter);
    }
    if (chart.y2Axis && chart.y2Axis.tickFormat) {
      chart.y2Axis.tickFormat(yAxisFormatter);
    }



    // Set showMaxMin for all axis
    setAxisShowMaxMin(chart.xAxis, xAxisShowMinMax);
    setAxisShowMaxMin(chart.x2Axis, xAxisShowMinMax);
    setAxisShowMaxMin(chart.yAxis, yAxisShowMinMax);
    setAxisShowMaxMin(chart.y2Axis, yAxisShowMinMax);

    if (vizType === 'time_pivot') {
      if (baseColor) {
        const { r, g, b } = baseColor;
        chart.color((d) => {
          const alpha = d.rank > 0 ? d.perc * 0.5 : 1;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        });
      }
    } else if (vizType !== 'bullet') {
      const colorFn = getScale(colorScheme);
      chart.color(d => d.color || colorFn(cleanColorInput(d[colorKey])));
    }

    if (isVizTypes(['line', 'area']) && useRichTooltip) {
      chart.useInteractiveGuideline(true);
      if (vizType === 'line') {
        chart.interactiveLayer.tooltip.contentGenerator(d =>
          generateRichLineTooltipContent(d, xAxisFormatter, yAxisFormatter, tooltipProportion));
      }
    }

    if (isVizTypes(['dual_line', 'line_multi'])) {
      const yAxisFormatter1 = getNumberFormatter(yAxisFormat);
      const yAxisFormatter2 = getNumberFormatter(yAxis2Format);
      chart.yAxis1.tickFormat(yAxisFormatter1);
      chart.yAxis2.tickFormat(yAxisFormatter2);
      const yAxisFormatters = data.map(datum => (
        datum.yAxis === 1 ? yAxisFormatter1 : yAxisFormatter2));
      chart.useInteractiveGuideline(true);
      chart.noData("");
      chart.interactiveLayer.tooltip.contentGenerator(d =>
        generateMultiLineTooltipContent(d, xAxisFormatter, yAxisFormatters));
      if (vizType === 'dual_line') {
        chart.showLegend(width > BREAKPOINTS.small);

        chart.legendRightAxisHint('');

        data[0].type = selectChart;
        data[1].type = selectChart2;

        const SetYLineDomain = function () {
	        const domain = [chart.yDomain1,chart.yDomain2];
          const MinScale = 0.05;
	        const MaxScale = [scaleY,scaleY2];
          
          data.forEach(function(series,i) {
            let yMax = d3.max(series.values, d => (d.y));
            let yMin = d3.min(series.values, d => (d.y));
            let y = yMin < (yMax - yMin) * MinScale ? 0 : (yMax - yMin) * MinScale;
            domain[i]([yMin - y, yMax * MaxScale[i]]);
          });

        };

        chart.interpolate('cardinal');
        chart.lines1.padData(true);
        chart.lines2.padData(true);

        chart.stack1.padData(true);
        chart.stack2.padData(true);
        chart.stack1.clipEdge(true);
        chart.stack2.clipEdge(true);

        chart.bars1.clipEdge(true);
        chart.bars2.clipEdge(true);

        chart.scatters1.padData(true);
        chart.scatters2.padData(true);
        chart.yAxis1.showMaxMin(true);
	      chart.yAxis2.showMaxMin(true);
        

        SetYLineDomain();

        [chart.bars1, chart.bars2].forEach(function(bar){
          bar.dispatch.on('renderEnd', function(e){
            svg.selectAll('.nv-point').filter((d) => d[0].y !== null)
            .style('stroke-opacity', 1)
            .style('fill-opacity', 1);
    
            setTimeout(function () {
              let current = svg.select('g.bars1Wrap').selectAll('text.bar-chart-label');
              if (!current.empty()) {
                current.transition().duration(300).attr("y", 0).style("opacity", 0).remove();
              }
              addDualAxisBarValue(svg, yAxisFormat);
            }, 200);
          });
        });
        
      } else {
        chart.showLegend(showLegend);
      }
    }
    // This is needed for correct chart dimensions if a chart is rendered in a hidden container
    chart.width(width);
    chart.height(height);
    container.style.height = `${height}px`;

    svg
      .datum(data)
      .transition().duration(500)
      .attr('height', height)
      .attr('width', width)
      .call(chart);

    // align yAxis1 and yAxis2 ticks
    if (isVizTypes(['line_multi'])) {
      const count = chart.yAxis1.ticks();
      const ticks1 = chart.yAxis1.scale()
        .domain(chart.yAxis1.domain())
        .nice(count)
        .ticks(count);
      const ticks2 = chart.yAxis2.scale()
        .domain(chart.yAxis2.domain())
        .nice(count)
        .ticks(count);

      // match number of ticks in both axes
      const difference = ticks1.length - ticks2.length;
      if (ticks1.length && ticks2.length && difference !== 0) {
        const smallest = difference < 0 ? ticks1 : ticks2;
        const delta = smallest[1] - smallest[0];
        for (let i = 0; i < Math.abs(difference); i++) {
          if (i % 2 === 0) {
            smallest.unshift(smallest[0] - delta);
          } else {
            smallest.push(smallest[smallest.length - 1] + delta);
          }
        }
        chart.yDomain1([ticks1[0], ticks1[ticks1.length - 1]]);
        chart.yDomain2([ticks2[0], ticks2[ticks2.length - 1]]);
        chart.yAxis1.tickValues(ticks1);
        chart.yAxis2.tickValues(ticks2);
      }
    }

    // align yAxis1 and yAxis2 ticks
    if (isVizTypes(['dual_line'])) {
      const count = chart.yAxis1.ticks();
      const t1 = chart.yAxis1.scale().domain(chart.yAxis1.domain()).nice(count).ticks(count);
      const t2 = chart.yAxis2.scale().domain(chart.yAxis2.domain()).nice(count).ticks(count);
      const diff = t1.length - t2.length;

      const big = diff<0 ? t2 : t1;
      const small = diff<0 ? t1 : t2;

      const start = small[0];
      const delta = small[1] - start;

      for (let i = 0; i < Math.abs(diff); i++) {
          small.push(small[small.length - 1] + delta);
      }

      chart.yDomain1([t1[0], t1[t1.length - 1]]);
      chart.yDomain2([t2[0], t2[t2.length - 1]]);
      chart.yAxis1.tickValues(t1);
      chart.yAxis2.tickValues(t2);

    }

    if (showMarkers) {
      svg.selectAll('.nv-point').filter((d) => d[0].y !== null)
        .style('stroke-opacity', 1)
        .style('fill-opacity', 1);
    }

    if (chart.yAxis !== undefined || chart.yAxis2 !== undefined) {
      // Hack to adjust y axis left margin to accommodate long numbers
      const marginPad = Math.ceil(
        Math.min(maxWidth * (isExplore ? 0.01 : 0.03), MAX_MARGIN_PAD),
      );
      // Hack to adjust margins to accommodate long axis tick labels.
      // - has to be done only after the chart has been rendered once
      // - measure the width or height of the labels
      // ---- (x axis labels are rotated 45 degrees so we use height),
      // - adjust margins based on these measures and render again
      const margins = chart.margin();
      if (chart.xAxis) {
        margins.bottom = 18;
      }
      const maxYAxisLabelWidth = getMaxLabelSize(svg, chart.yAxis2 ? 'nv-y1' : 'nv-y');
      const maxXAxisLabelHeight = getMaxLabelSize(svg, 'nv-x');
      margins.right = 5;
      margins.top = 0;
      margins.left = 45; //maxYAxisLabelWidth + marginPad;

      if (yAxisLabel && yAxisLabel !== '') {
        margins.left += 25;
      }
      if (showBarValue) {
        // Add more margin to avoid label colliding with legend.
        margins.top += 18;
      }
      if (xAxisShowMinMax && !isVizTypes(['dist_bar', 'bar'])) {
        // If x bounds are shown, we need a right margin
        margins.right = 20; //Math.max(20, maxXAxisLabelHeight / 2) + marginPad;
      }
      if (xLabelRotation === 45) {
        margins.bottom = (
          maxXAxisLabelHeight * Math.sin(Math.PI * xLabelRotation / 180)
        ) + marginPad;
        margins.right = (
          maxXAxisLabelHeight * Math.cos(Math.PI * xLabelRotation / 180)
        ) + marginPad;
      } else if (staggerLabels) {
        margins.bottom = 30;
      }

      if (isVizTypes(['dual_line', 'line_multi'])) {
        const maxYAxis2LabelWidth = getMaxLabelSize(svg, 'nv-y2');
        margins.right = maxYAxis2LabelWidth + marginPad;
      }
      if (bottomMargin && bottomMargin !== 'auto') {
        margins.bottom = parseInt(bottomMargin, 10);
      }
      if (leftMargin && leftMargin !== 'auto') {
        margins.left = leftMargin;
      }

      if (xAxisLabel && xAxisLabel !== '' && chart.xAxis) {
        margins.bottom += 25;
        let distance = 0;
        if (margins.bottom && !Number.isNaN(margins.bottom)) {
          distance = margins.bottom - 45;
        }
        // nvd3 bug axisLabelDistance is disregarded on xAxis
        // https://github.com/krispo/angular-nvd3/issues/90
        chart.xAxis.axisLabel(xAxisLabel).axisLabelDistance(distance);
      }

      if (yAxisLabel && yAxisLabel !== '' && chart.yAxis) {
        let distance = 0;
        if (margins.left && !Number.isNaN(margins.left)) {
          distance = margins.left - 70;
        }
        chart.yAxis.axisLabel(yAxisLabel).axisLabelDistance(distance);
      }
      if (isTimeSeries && annotationData && activeAnnotationLayers.length > 0) {
        // Time series annotations add additional data
        const timeSeriesAnnotations = activeAnnotationLayers
          .filter(layer => layer.annotationType === ANNOTATION_TYPES.TIME_SERIES)
          .reduce((bushel, a) =>
            bushel.concat((annotationData[a.name] || []).map((series) => {
              if (!series) {
                return {};
              }
              const key = Array.isArray(series.key) ?
                `${a.name}, ${series.key.join(', ')}` : `${a.name}, ${series.key}`;
              return {
                ...series,
                key,
                color: a.color,
                strokeWidth: a.width,
                classed: `${a.opacity} ${a.style} nv-timeseries-annotation-layer showMarkers${a.showMarkers} hideLine${a.hideLine}`,
              };
            })), []);
        data.push(...timeSeriesAnnotations);
      }

      // render chart
      svg
        .datum(data)
        .transition().duration(500)
        .attr('width', width)
        .attr('height', height)
        .call(chart);

      // on scroll, hide tooltips. throttle to only 4x/second.
      //window.addEventListener('scroll', throttle(() => hideTooltips(element), 250));
      //window.addEventListener('scroll', throttle(() => hideTooltips(false), 250));

      // on scroll, hide tooltips. 
      d3.select(window).on("scroll." + chartid, function() {
        chart.tooltip.hidden(true);
        chart.interactiveLayer.tooltip.hidden(true);
      });

      // The below code should be run AFTER rendering because chart is updated in call()
      if (isTimeSeries && activeAnnotationLayers.length > 0) {
        // Formula annotations
        const formulas = activeAnnotationLayers
          .filter(a => a.annotationType === ANNOTATION_TYPES.FORMULA)
          .map(a => ({ ...a, formula: mathjs.parse(a.value) }));

        let xMax;
        let xMin;
        let xScale;
        if (vizType === 'bar') {
          xMin = d3.min(data[0].values, d => (d.x));
          xMax = d3.max(data[0].values, d => (d.x));
          xScale = d3.scale.quantile()
            .domain([xMin, xMax])
            .range(chart.xAxis.range());
        } else {
          xMin = chart.xAxis.scale().domain()[0].valueOf();
          xMax = chart.xAxis.scale().domain()[1].valueOf();
          if (chart.xScale) {
            xScale = chart.xScale();
          } else if (chart.xAxis.scale) {
            xScale = chart.xAxis.scale();
          } else {
            xScale = d3.scale.linear();
          }
        }
        if (xScale && xScale.clamp) {
          xScale.clamp(true);
        }

        if (formulas.length > 0) {
          const xValues = [];
          if (vizType === 'bar') {
            // For bar-charts we want one data point evaluated for every
            // data point that will be displayed.
            const distinct = data.reduce((xVals, d) => {
              d.values.forEach(x => xVals.add(x.x));
              return xVals;
            }, new Set());
            xValues.push(...distinct.values());
            xValues.sort();
          } else {
            // For every other time visualization it should be ok, to have a
            // data points in even intervals.
            let period = Math.min(...data.map(d =>
              Math.min(...d.values.slice(1).map((v, i) => v.x - d.values[i].x))));
            const dataPoints = (xMax - xMin) / (period || 1);
            // make sure that there are enough data points and not too many
            period = dataPoints < 100 ? (xMax - xMin) / 100 : period;
            period = dataPoints > 500 ? (xMax - xMin) / 500 : period;
            xValues.push(xMin);
            for (let x = xMin; x < xMax; x += period) {
              xValues.push(x);
            }
            xValues.push(xMax);
          }
          const formulaData = formulas.map(fo => ({
            key: fo.name,
            values: xValues.map((x => ({ y: fo.formula.eval({ x }), x }))),
            color: fo.color,
            strokeWidth: fo.width,
            classed: `${fo.opacity} ${fo.style}`,
          }));
          data.push(...formulaData);
        }
        const xAxis = chart.xAxis1 ? chart.xAxis1 : chart.xAxis;
        const yAxis = chart.yAxis1 ? chart.yAxis1 : chart.yAxis;
        const chartWidth = xAxis.scale().range()[1];
        const annotationHeight = yAxis.scale().range()[0];

        if (annotationData) {
          // Event annotations
          activeAnnotationLayers
            .filter(x => (
              x.annotationType === ANNOTATION_TYPES.EVENT &&
              annotationData && annotationData[x.name]
            )).forEach((config, index) => {
            const e = applyNativeColumns(config);
            // Add event annotation layer
            const annotations = d3.select(element)
              .select('.nv-wrap')
              .append('g')
              .attr('class', `nv-event-annotation-layer-${index}`);
            const aColor = e.color || getColor(cleanColorInput(e.name), colorScheme);

            const tip = tipFactory(e);
            const records = (annotationData[e.name].records || []).map((r) => {
              const timeValue = new Date(moment.utc(r[e.timeColumn]));

              return {
                ...r,
                [e.timeColumn]: timeValue,
              };
            }).filter(record => !Number.isNaN(record[e.timeColumn].getMilliseconds()));

            if (records.length) {
              annotations.selectAll('line')
                .data(records)
                .enter()
                .append('line')
                .attr({
                  x1: d => xScale(new Date(d[e.timeColumn])),
                  y1: 0,
                  x2: d => xScale(new Date(d[e.timeColumn])),
                  y2: annotationHeight,
                })
                .attr('class', `${e.opacity} ${e.style}`)
                .style('stroke', aColor)
                .style('stroke-width', e.width)
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .call(tip);
            }

            // update annotation positions on brush event
            chart.focus.dispatch.on('onBrush.event-annotation', function () {
              annotations.selectAll('line')
                .data(records)
                .attr({
                  x1: d => xScale(new Date(d[e.timeColumn])),
                  y1: 0,
                  x2: d => xScale(new Date(d[e.timeColumn])),
                  y2: annotationHeight,
                  opacity: (d) => {
                    const x = xScale(new Date(d[e.timeColumn]));
                    return (x > 0) && (x < chartWidth) ? 1 : 0;
                  },
                });
            });
          });

          // Interval annotations
          activeAnnotationLayers
            .filter(x => (
              x.annotationType === ANNOTATION_TYPES.INTERVAL &&
              annotationData && annotationData[x.name]
            )).forEach((config, index) => {
            const e = applyNativeColumns(config);
            // Add interval annotation layer
            const annotations = d3.select(element)
              .select('.nv-wrap')
              .append('g')
              .attr('class', `nv-interval-annotation-layer-${index}`);

            const aColor = e.color || getColor(cleanColorInput(e.name), colorScheme);
            const tip = tipFactory(e);

            const records = (annotationData[e.name].records || []).map((r) => {
              const timeValue = new Date(moment.utc(r[e.timeColumn]));
              const intervalEndValue = new Date(moment.utc(r[e.intervalEndColumn]));
              return {
                ...r,
                [e.timeColumn]: timeValue,
                [e.intervalEndColumn]: intervalEndValue,
              };
            }).filter(record => (
              !Number.isNaN(record[e.timeColumn].getMilliseconds()) &&
              !Number.isNaN(record[e.intervalEndColumn].getMilliseconds())
            ));

            if (records.length) {
              annotations.selectAll('rect')
                .data(records)
                .enter()
                .append('rect')
                .attr({
                  x: d => Math.min(xScale(new Date(d[e.timeColumn])),
                    xScale(new Date(d[e.intervalEndColumn]))),
                  y: 0,
                  width: d => Math.max(Math.abs(xScale(new Date(d[e.intervalEndColumn])) -
                    xScale(new Date(d[e.timeColumn]))), 1),
                  height: annotationHeight,
                })
                .attr('class', `${e.opacity} ${e.style}`)
                .style('stroke-width', e.width)
                .style('stroke', aColor)
                .style('fill', aColor)
                .style('fill-opacity', 0.2)
                .on('mouseover', tip.show)
                .on('mouseout', tip.hide)
                .call(tip);
            }

            // update annotation positions on brush event
            chart.focus.dispatch.on('onBrush.interval-annotation', function () {
              annotations.selectAll('rect')
                .data(records)
                .attr({
                  x: d => xScale(new Date(d[e.timeColumn])),
                  width: (d) => {
                    const x1 = xScale(new Date(d[e.timeColumn]));
                    const x2 = xScale(new Date(d[e.intervalEndColumn]));
                    return x2 - x1;
                  },
                });
            });
          });
        }

        // rerender chart appended with annotation layer
        svg.datum(data)
          .attr('height', height)
          .attr('width', width)
          .call(chart);

        // Display styles for Time Series Annotations
        d3.selectAll('.slice_container .nv-timeseries-annotation-layer.showMarkerstrue .nv-point')
          .style('stroke-opacity', 1)
          .style('fill-opacity', 1);
        d3.selectAll('.slice_container .nv-timeseries-annotation-layer.hideLinetrue')
          .style('stroke-width', 0);
      }
    }

    wrapTooltip(chart, maxWidth);
    return chart;
  };

  // hide tooltips before rendering chart, if the chart is being re-rendered sometimes
  // there are left over tooltips in the dom,
  // this will clear them before rendering the chart again.
  hideTooltips(element);

  nv.addGraph(drawGraph);
}

nvd3Vis.displayName = 'NVD3';
nvd3Vis.propTypes = propTypes;
export default nvd3Vis;
