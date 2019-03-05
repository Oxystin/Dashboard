import * as color from 'd3-color';
import { getNumberFormatter, NumberFormats} from '@superset-ui/number-format';
import { renderTooltipFactory } from './BigNumber';
import { getTimeFormatter} from '@superset-ui/time-format';
import { d3LocaleTimeFormat } from '../localeformat';

const TIME_COLUMN = '__timestamp';

export default function transformProps(chartProps) {
  const { width, height, formData, payload } = chartProps;
  const {
    colorPicker,
    fillColorPicker,
    compareLag: compareLagInput,
    compareSuffix = '',
    metric,
    showTrendLine,
    startYAxisAtZero,
    subheader = '',
    vizType,
    yAxisFormat,
    fillBackground,
    dateTimeFormat,
    showPerc,
    selectChart,
    steps,
    renderWithoutHeader,
  } = formData;
  const { data } = payload;

  let mainColor;
  let NegativeColor;

  if (colorPicker) {
    const { r, g, b } = colorPicker;
    mainColor = color.rgb(r, g, b).hex();
  }

  if (fillColorPicker) {
    const { r, g, b } = fillColorPicker;
    NegativeColor = color.rgb(r, g, b).hex();
  } else {
    NegativeColor = mainColor;
  }

  const isValidJson = function (json) {
    try {
        return JSON.parse(json);
    } catch (e) {
        return false;
    }
  }

  let bigNumber;
  let trendLineData;
  const metricName = metric && metric.label ? metric.label : metric;
  const compareLag = +compareLagInput || 0;
  const supportTrendLine = vizType === 'big_number';
  const supportAndShowTrendLine = supportTrendLine && showTrendLine;
  let percentChange = 0;
  let compareValue = 0;
  let formattedSubheader = subheader;
  if (supportTrendLine) {
    const sortedData = [...data].sort((a, b) => a[TIME_COLUMN] - b[TIME_COLUMN]);
    bigNumber = sortedData[sortedData.length - 1][metricName];
    if (compareLag > 0) {
      const compareIndex = sortedData.length - (compareLag + 1);
      if (compareIndex >= 0) {
        compareValue = sortedData[compareIndex][metricName];
        percentChange = compareValue === 0
          ? 0 : (bigNumber - compareValue) / Math.abs(compareValue);
        const formatPercentChange = getNumberFormatter(NumberFormats.PERCENT_CHANGE_1_POINT);
        formattedSubheader = `${formatPercentChange(percentChange)} ${compareSuffix}`;
      }
      bigNumber = showPerc ? bigNumber - compareValue : bigNumber;
    } else {
      formattedSubheader = compareSuffix;
    }
    trendLineData = supportAndShowTrendLine
      ? sortedData.map(point => ({ x: point[TIME_COLUMN], y: point[metricName] }))
      : null;
  } else {
    bigNumber = data[0][metricName];
    trendLineData = null;

    const colorsRange = steps == '' ? false : isValidJson(steps);
    var colorIndex = -1;
    try {
      if (colorsRange) {
        for(var i = 0; i < colorsRange.value.length; i++) {
          if (i == 0) {
            if (bigNumber < colorsRange.value[0] ) {
              colorIndex = 0;
              break;
            }
          } else {
            if (colorsRange.value[i-1] <= bigNumber && bigNumber < colorsRange.value[i] ) {
              colorIndex = i;
              break;
            }
          }
        }
        mainColor = colorIndex < 0 ? colorsRange.color[colorsRange.color.length-1] : colorsRange.color[colorIndex];
      }
    } catch (e) {
      console.log ('ERROR: ' + e.name + ' - ' + e.message );
    }
  }

  let className = '';
  if (bigNumber > 0) {
    className = 'positive';
  } else if (bigNumber < 0) {
    className = 'negative';
    mainColor = NegativeColor;
  }

  const formatValue = getNumberFormatter(yAxisFormat);
  const formatTime = d3LocaleTimeFormat(dateTimeFormat);

  return {
    width,
    height: renderWithoutHeader ? height + 30 : height,
    bigNumber,
    className,
    formatBigNumber: formatValue,
    mainColor,
    renderTooltip: renderTooltipFactory(formatValue, formatTime),
    showTrendLine: supportAndShowTrendLine,
    startYAxisAtZero,
    subheader: formattedSubheader,
    trendLineData,
    fillBackground,
    showPerc,
    selectChart,
    compareLag,
    renderWithoutHeader,
  };
}
