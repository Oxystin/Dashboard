import React from 'react';
import PropTypes from 'prop-types';
import shortid from 'shortid';
import { XYChart, AreaSeries, CrossHair, LinearGradient, BarSeries, LineSeries } from '@data-ui/xy-chart';
import { BRAND_COLOR } from '@superset-ui/color';
import { computeMaxFontSize } from '../../modules/visUtils';

import './BigNumber.css';

const CHART_MARGIN = {
  top: 4,
  right: 4,
  bottom: 4,
  left: 4,
};

const PROPORTION = {
  HEADER: 0.4,
  SUBHEADER: 0.14,
  HEADER_WITH_TRENDLINE: 0.35,
  SUBHEADER_WITH_TRENDLINE: 0.14,
  TRENDLINE: 0.35,
};

export function renderTooltipFactory(formatValue, formatTime) {
  return function renderTooltip({ datum }) { // eslint-disable-line
    const { x: rawDate, y: rawValue } = datum;
    const formattedDate = formatTime(rawDate);
    const value = formatValue(rawValue);

    return (
      <div style={{ padding: '4px 8px' }}>
        {formattedDate}
        <br />
        <strong>{value}</strong>
      </div>
    );
  };
}

function identity(x) {
  return x;
}

const propTypes = {
  className: PropTypes.string,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  bigNumber: PropTypes.number.isRequired,
  formatBigNumber: PropTypes.func,
  subheader: PropTypes.string,
  showTrendLine: PropTypes.bool,
  startYAxisAtZero: PropTypes.bool,
  trendLineData: PropTypes.array,
  mainColor: PropTypes.string,
  renderTooltip: PropTypes.func,
  fillBackground: PropTypes.bool,
  dateTimeFormat: PropTypes.string,
  showPerc: PropTypes.bool,
  selectChart: PropTypes.string,
};
const defaultProps = {
  className: '',
  formatBigNumber: identity,
  subheader: '',
  showTrendLine: true,
  startYAxisAtZero: false,
  trendLineData: null,
  mainColor: BRAND_COLOR,
  renderTooltip: renderTooltipFactory(identity),
  fillBackground: false,
  showPerc: false,
  selectChart: 'area',
};

class BigNumberVis extends React.PureComponent {
  constructor(props) {
    super(props);
    this.gradientId = shortid.generate();
  }

  getClassName() {
    const { className, showTrendLine } = this.props;
    const names = `big_number ${className}`;
    if (showTrendLine) {
      return names;
    }
    return `${names} no_trendline`;
  }

  createTemporaryContainer() {
    const container = document.createElement('div');
    container.className = this.getClassName();
    container.style.position = 'absolute'; // so it won't disrupt page layout
    container.style.opacity = 0;           // and not visible
    return container;
  }

  renderHeader(maxHeight) {
    const { bigNumber, formatBigNumber, width, mainColor, fillBackground, showPerc} = this.props;
    const text = showPerc && bigNumber> 0 ? '+' + formatBigNumber(bigNumber): formatBigNumber(bigNumber);
    const fillcolor = fillBackground ? "#fff" : mainColor;
    const container = this.createTemporaryContainer();
    document.body.appendChild(container);
    const fontSize = computeMaxFontSize({
      text,
      maxWidth: Math.floor(width),
      maxHeight,
      className: 'header_line',
      container,
    });
    document.body.removeChild(container);

    return (
      <div
        className="header_line"
        style={{
          fontSize,
          height: maxHeight,
          color: fillcolor,
        }}
      >
        <span>{text}</span>
      </div>
    );
  }

  renderSubheader(maxHeight) {
    const { subheader, width, mainColor, fillBackground} = this.props;
    const fillcolor = fillBackground ? "#fff" : mainColor;
    let fontSize = 0;
    if (subheader) {
      const container = this.createTemporaryContainer();
      document.body.appendChild(container);
      fontSize = computeMaxFontSize({
        text: subheader,
        maxWidth: Math.floor(width),
        maxHeight,
        className: 'subheader_line',
        container,
      });
      document.body.removeChild(container);
    }

    return (
      <div
        className="subheader_line"
        style={{
          fontSize,
          height: maxHeight,
          color: fillcolor,
        }}
      >
        {subheader}
      </div>
    );
  }

  renderTrendline(maxHeight) {
    const {
      width,
      trendLineData,
      mainColor,
      subheader,
      renderTooltip,
      startYAxisAtZero,
      fillBackground,
      selectChart,
    } = this.props;

    const grad = fillBackground ? mainColor : "#fff";
    const fillcolor = fillBackground ? "#fff" : mainColor;
    
    switch (selectChart) {
      case 'bar': 
        return (
          <XYChart
            ariaLabel={`Big number visualization ${subheader}`}
            xScale={{ type: 'timeUtc' }}
            yScale={{
              type: 'linear',
              includeZero: startYAxisAtZero,
            }}
            width={Math.floor(width)}
            height={maxHeight}
            margin={CHART_MARGIN}
            renderTooltip={renderTooltip}
            snapTooltipToDataX
          >
            <LinearGradient
              id={this.gradientId}
              from={fillcolor}
              to={grad}
            />
            <BarSeries
              data={trendLineData}
              fill={`url(#${this.gradientId})`}
              stroke={fillcolor}
            />
          </XYChart>
        );
        break;
      case 'line':
        return (
          <XYChart
            ariaLabel={`Big number visualization ${subheader}`}
            xScale={{ type: 'timeUtc' }}
            yScale={{
              type: 'linear',
              includeZero: startYAxisAtZero,
            }}
            width={Math.floor(width)}
            height={maxHeight}
            margin={CHART_MARGIN}
            renderTooltip={renderTooltip}
            snapTooltipToDataX
          >
            <LinearGradient
              id={this.gradientId}
              from={fillcolor}
              to={grad}
            />
            <LineSeries
              data={trendLineData}
              curve="linear"
              stroke={fillcolor}
            />
            <CrossHair
              stroke={fillcolor}
              circleFill={fillcolor}
              circleStroke="#fff"
              showHorizontalLine={false}
              fullHeight
              strokeDasharray="5,2"
            />
          </XYChart>
        );
        break;
      default:
        return (
          <XYChart
            ariaLabel={`Big number visualization ${subheader}`}
            xScale={{ type: 'timeUtc' }}
            yScale={{
              type: 'linear',
              includeZero: startYAxisAtZero,
            }}
            width={Math.floor(width)}
            height={maxHeight}
            margin={CHART_MARGIN}
            renderTooltip={renderTooltip}
            snapTooltipToDataX
          >
            <LinearGradient
              id={this.gradientId}
              from={fillcolor}
              to={grad}
            />
            <AreaSeries
              data={trendLineData}
              fill={`url(#${this.gradientId})`}
              stroke={fillcolor}
            />
            <CrossHair
              stroke={fillcolor}
              circleFill={fillcolor}
              circleStroke="#fff"
              showHorizontalLine={false}
              fullHeight
              strokeDasharray="5,2"
            />
          </XYChart>
        );
    }
  }

  render() {
    const { showTrendLine, height, mainColor, fillBackground} = this.props;
    const className = this.getClassName();
    const fillcolor = fillBackground ? mainColor : 'transparent';

    if (showTrendLine) {
      const chartHeight = Math.floor(PROPORTION.TRENDLINE * height);
      const allTextHeight = height - chartHeight;
      return (
        <div className={className}
        style = {{background: fillcolor}}
        >
          <div
            className="text_container"
            style={{ height: allTextHeight }}
          >
            {this.renderHeader(Math.ceil(PROPORTION.HEADER_WITH_TRENDLINE * height))}
            {this.renderSubheader(Math.ceil(PROPORTION.SUBHEADER_WITH_TRENDLINE * height))}
          </div>
          {this.renderTrendline(chartHeight)}
        </div>
      );
    }
    return (
      <div
        className={className}
        style={{height,  background: fillcolor }}
      >
        {this.renderHeader(Math.ceil(PROPORTION.HEADER * height))}
        {this.renderSubheader(Math.ceil(PROPORTION.SUBHEADER * height))}
      </div>
    );
  }
}

BigNumberVis.propTypes = propTypes;
BigNumberVis.defaultProps = defaultProps;

export default BigNumberVis;
