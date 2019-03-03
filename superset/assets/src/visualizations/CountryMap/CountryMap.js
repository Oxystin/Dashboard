import d3 from 'd3';
import PropTypes from 'prop-types';
import { extent as d3Extent } from 'd3-array';
import { getSequentialSchemeRegistry } from '@superset-ui/color';
import { getNumberFormatter } from '@superset-ui/number-format';
import './CountryMap.css';

const propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    country_id: PropTypes.string,
    metric: PropTypes.number,
  })),
  width: PropTypes.number,
  height: PropTypes.number,
  country: PropTypes.string,
  linearColorScheme: PropTypes.string,
  mapBaseUrl: PropTypes.string,
  numberFormat: PropTypes.string,
};

const maps = {};

function CountryMap(element, props) {
  const {
    data,
    width,
    height,
    country,
    linearColorScheme,
    mapBaseUrl = '/static/assets/src/visualizations/CountryMap/countries',
    numberFormat,
    metric_name,
  } = props;

  const container = element;
  const format = getNumberFormatter(numberFormat);
  const gradient = getSequentialSchemeRegistry().get(linearColorScheme);
  const colorScale = gradient ? gradient.createLinearScale(d3Extent(data, v => v.metric)) : getSequentialSchemeRegistry().get('black_white').createLinearScale(d3Extent(data, v => v.metric));
  const colorMap = {};
  data.forEach((d) => {
    colorMap[d.country_id] = colorScale(d.metric);
  });
  const colorFn = d => colorMap[d.properties.ISO] || 'none';

  var xd = 90;
  var yd = 30;
  const fontSize =12;
  const path = d3.geo.path();
  const div = d3.select(container);
  div.selectAll('*').remove();
  container.style.height = `${height}px`;
  container.style.width = `${width}px`;
  const svg = div.append('svg:svg')
    .attr('width', width)
    .attr('height', height)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  const backgroundRect = svg.append('rect')
    .attr('class', 'background')
    .attr('width', width)
    .attr('height', height);
  const g = svg.append('g');
  const mapLayer = g.append('g')
    .classed('map-layer', true);

  let centered;

  const clicked = function (d) {
    const hasCenter = !centered;
    let x;
    let y;
    let k;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    if (hasCenter) {
      const centroid = path.centroid(d);
      x = centroid[0];
      y = centroid[1];
      k = 4;
      centered = d;
    } else {
      x = halfWidth;
      y = halfHeight;
      k = 1;
      centered = null;
    }

    g.transition()
      .duration(750)
      .attr('transform', `translate(${halfWidth},${halfHeight})scale(${k})translate(${-x},${-y})`);

    mapLayer.select('g.map-label').transition().duration(750)
    .style("opacity", hasCenter ? 1 : 0);

  };

  backgroundRect.on('click', clicked);

  const selectAndDisplayNameOfRegion = function (feature) {
    let name = '';
    if (feature && feature.properties) {
      if (feature.properties.ID_2) {
        name = feature.properties.NAME_2;
      } else {
        name = feature.properties.NAME_1;
      }
    }
    return name;
  };

  const tooltip = div.append('div')
    .attr('class', 'map-tooltip')
    .style('opacity', 0);


  function getTooltipHtml(d) {
    const iso = data.filter(region => region.country_id === d.properties.ISO);
    const result = iso.length > 0 ? format(iso[0].metric) : '--';
    const gg = props;
    let html;
    html = [
      "<div class='maps_region'>", "<span>", selectAndDisplayNameOfRegion(d),"</span>", "</div>",
      "<div class='maps_result'>", "<span>", metric_name, ":</span> <span class='maps_metric'>", result , "</span>", "</div>"
    ].join('');
    return html;
  }

  const mouseenter = function (d) {

    const x = d3.event.offsetX + 10;
    const y = d3.event.offsetY - 40;

    tooltip
      .html(function () { return getTooltipHtml(d); })
      .transition()
      .duration(300)
      .style('left', x + 'px')
      .style('top', y + 'px')
      .style('opacity', 0.8);

  };

  const mouseout = function () {

  };

  function drawMap(mapData) {
    const features = mapData.features;
    const center = d3.geo.centroid(mapData);
    const scale = 100;
    const projection = d3.geo.mercator()
      .scale(scale)
      .center(center)
      .translate([width / 2, height / 2]);
    path.projection(projection);

    // Compute scale that fits container.
    const bounds = path.bounds(mapData);
    const hscale = scale * width / (bounds[1][0] - bounds[0][0]);
    const vscale = scale * height / (bounds[1][1] - bounds[0][1]);
    const newScale = (hscale < vscale) ? hscale : vscale;

    // Compute bounds and offset using the updated scale.
    projection.scale(newScale);
    const newBounds = path.bounds(mapData);
    projection.translate([
      width - (newBounds[0][0] + newBounds[1][0]) / 2,
      height - (newBounds[0][1] + newBounds[1][1]) / 2,
    ]);

    // Draw each province as a path
    mapLayer.selectAll('path')
      .data(features)
      .enter().append('path')
      .attr('d', path)
      .attr('class', 'region')
      .attr('vector-effect', 'non-scaling-stroke')
      .style('fill', colorFn)
      .on('mouseenter', mouseenter)
      .on('mouseout', mouseout)
      .on('click', clicked);

    // Add a text label.
    mapLayer.append('g')
    .style('fill', 'white')
    .style('stroke', 'none')
    .style("font-size", "2.5px")    
    .style("pointer-events", "none")
    .style("opacity", 0)
    .classed('map-label',true)
    .attr('text-anchor', 'middle')
    .selectAll('text')
    .data(features)
    .enter().append('text')
    .attr("x", d => path.centroid(d)[0])
    .attr("y",  d => path.centroid(d)[1] + 1)
    .text(function(d,i) {
      const iso = data.filter(region => region.country_id === d.properties.ISO);
      return iso.length > 0 ? format(iso[0].metric) : '';
    });

}

  const countryKey = country.toLowerCase();
  const map = maps[countryKey];
  if (map) {
    drawMap(map);
  } else {
    const url = `${mapBaseUrl}/${countryKey}.geojson`;
    d3.json(url, function (error, mapData) {
      if (!error) {
        maps[countryKey] = mapData;
        drawMap(mapData);
      }
    });
  }

}

CountryMap.displayName = 'CountryMap';
CountryMap.propTypes = propTypes;

export default CountryMap;
