import d3 from 'd3';
import PropTypes from 'prop-types';
import { getSequentialSchemeRegistry } from '@superset-ui/color';
import { getNumberFormatter } from '@superset-ui/number-format';
import { CategoricalColorNamespace } from '@superset-ui/color';
import './Radar.css';

const propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
};

function Radar(element, props) {
  const {
    data,
    width,
    height,
    colorScheme,
    numberFormat,
    radarScale,
    radarFillArea, 
    radarLineSmooth,
    radarShowLegend,
    radarLevels,
    radarLabelDist,
    radarLabelWrap,
  } = props;

/////////////////////////////////////////////////////////
/////////////// The Radar Chart Function ////////////////
/////////////// Written by Nadieh Bremer ////////////////
////////////////// VisualCinnamon.com ///////////////////
/////////// Inspired by the code of alangrafu ///////////
/////////////////////////////////////////////////////////

  var cfg = {
    w: width,				//Width of the circle
    h: height,				//Height of the circle
    margin: {top: 0, right: 0, bottom: 0, left: 0}, //The margins of the SVG
    levels: radarLevels ? radarLevels : 5,				//How many levels or inner circles should there be drawn
    maxValue: 0, 			//What is the value that the biggest circle will represent
    labelFactor: radarLabelDist ? radarLabelDist : 1.1 , 	//How much farther than the radius of the outer circle should the labels be placed
    wrapWidth: radarLabelWrap ? radarLabelWrap : 60, 		//The number of pixels after which a label needs to be given a new line
    opacityArea: radarFillArea ? 0.35: 0, 	//The opacity of the area of the blob
    dotRadius: 4, 			//The size of the colored circles of each blog
    opacityCircles: 0.1, 	//The opacity of the circles of each blob
    strokeWidth: 1, 		//The width of the stroke around each blob
    roundStrokes: radarLineSmooth,	//If true the area and stroke will follow a round path (cardinal-closed)
    color: d3.scale.category10(),	//Color function
    legendPosition: { x: 10, y: 10 }
  };

  const format = numberFormat ? getNumberFormatter(numberFormat) : d3.format('%');
  const colorFn = CategoricalColorNamespace.getScale(colorScheme);
  const position = ['min','middle','max'].indexOf(radarScale);
  const radius_scale = position > -1 ? [0.6, 0.7, 0.8][position] : 0.8;
  
  //If the supplied maxValue is smaller than the actual one, replace by the max in the data
  var maxValue = Math.max(cfg.maxValue, d3.max(data, function(i){return d3.max(i.values.map(function(o){return o.value;}))}));
    
  var allAxis = (data[0].values.map(function(i, j){return i.axis})),	//Names of each axis
    total = allAxis.length,					//The number of different axes
    radius = Math.min(cfg.w/2, cfg.h/2)*radius_scale, 	//Radius of the outermost circle
    angleSlice = Math.PI * 2 / total;		//The width in radians of each "slice"
  
  //Scale for the radius
  var rScale = d3.scale.linear()
    .range([0, radius])
    .domain([0, maxValue]);
    
  /////////////////////////////////////////////////////////
  //////////// Create the container SVG and g /////////////
  /////////////////////////////////////////////////////////

  //Remove whatever chart with the same id/class was present before
  //d3.select(id).select("svg").remove();
  
  //Initiate the radar chart SVG
  const div = d3.select(element);

  const tooltip = div.append('div')
    .attr('class', 'radar-tooltip')
    .style('opacity', 0);
  
  function getTooltipHtml(d) {
      return [
        "<div class='radar_group'>", "<span>","<b>Group: </b>", data[d.id].name ,"</span>", "</div>",
        "<div class='radar_category'>", "<span>","<b>Category: </b>", d.axis,"</span>", "</div>",
        "<div class='radar_value'>", "<span>","<b>Value : </b>", format(d.value) ,"</span>", "</div>",
      ].join('');
  }

  div.select('.radar_chart').remove();
  const svg = div.append('svg')
    .attr("width",  width)
    .attr("height", height)
    //.attr("width",  cfg.w + cfg.margin.left + cfg.margin.right)
    //.attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
    .attr("class", "radar_chart");
  //Append a g element		
  var g = svg.append("g")
    .attr("transform", "translate(" + (cfg.w/2 + cfg.margin.left) + "," + (cfg.h/2 + cfg.margin.top) + ")");
  
  /////////////////////////////////////////////////////////
  ////////// Glow filter for some extra pizzazz ///////////
  /////////////////////////////////////////////////////////
  
  //Filter for the outside glow
  var filter = g.append('defs').append('filter').attr('id','glow'),
    feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur'),
    feMerge = filter.append('feMerge'),
    feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
    feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');

  /////////////////////////////////////////////////////////
  /////////////// Draw the Circular grid //////////////////
  /////////////////////////////////////////////////////////
  
  //Wrapper for the grid & axes
  var axisGrid = g.append("g").attr("class", "axisWrapper");
  
  //Draw the background circles
  axisGrid.selectAll(".levels")
    .data(d3.range(1,(cfg.levels+1)).reverse())
    .enter()
    .append("circle")
    .attr("class", "gridCircle")
    .attr("r", function(d, i){return radius/cfg.levels*d;})
    .style("fill", "#CDCDCD")
    .style("stroke", "#CDCDCD")
    .style("fill-opacity", cfg.opacityCircles)
    .style("filter" , "url(#glow)");

  //Text indicating at what % each level is
  axisGrid.selectAll(".axisLabel")
      .data(d3.range(1,(cfg.levels+1)).reverse())
      .enter().append("text")
      .attr("class", "axisLabel")
      .attr("x", 4)
      .attr("y", function(d){return -d*radius/cfg.levels;})
      .attr("dy", "0.4em")
      .style("font-size", "10px")
      .attr("fill", "#737373")
      .text(function(d,i) { return format(maxValue * d/cfg.levels); });

  /////////////////////////////////////////////////////////
  //////////////////// Draw the axes //////////////////////
  /////////////////////////////////////////////////////////
  
  //Create the straight lines radiating outward from the center
  var axis = axisGrid.selectAll(".axis")
    .data(allAxis)
    .enter()
    .append("g")
    .attr("class", "axis");
  //Append the lines
  axis.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", function(d, i){ return rScale(maxValue) * Math.cos(angleSlice*i - Math.PI/2); })
    .attr("y2", function(d, i){ return rScale(maxValue) * Math.sin(angleSlice*i - Math.PI/2); })
    .attr("class", "line")
    .style("stroke", "#737373")
    .style("stroke-width", "1px")
    .style("stroke-opacity", 0.1);

  //Append the labels at each axis
  axis.append("text")
    .attr("class", "category_legend")
    .style("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x", function(d, i){ return rScale(maxValue * cfg.labelFactor) * Math.cos(angleSlice*i - Math.PI/2); })
    .attr("y", function(d, i){ return rScale(maxValue * cfg.labelFactor) * Math.sin(angleSlice*i - Math.PI/2); })
    .text(function(d){return d})
    .call(wrap, cfg.wrapWidth);

  /////////////////////////////////////////////////////////
  ///////////// Draw the radar chart blobs ////////////////
  /////////////////////////////////////////////////////////
  
  //The radial line function
  var radarLine = d3.svg.line.radial()
    .interpolate("linear-closed")
    .radius(function(d) { return rScale(d.value); })
    .angle(function(d,i) {	return i*angleSlice; });
    
  if(cfg.roundStrokes) {
    radarLine.interpolate("cardinal-closed");
  }
        
  //Create a wrapper for the blobs	
  var blobWrapper = g.selectAll(".radarWrapper")
    .data(data)
    .enter().append("g")
    .attr("class", "radarWrapper");
      
  //Append the backgrounds	
  blobWrapper
    .append("path")
    .attr("class", "radarArea")
    .attr("d", function(d,i) { return radarLine(d.values); })
    .style("fill", function(d,i) { return colorFn(d.name); })
    .style("fill-opacity", cfg.opacityArea)
    .on('mouseover', function (d,i){
      //Dim all blobs
      d3.selectAll(".radarArea")
        .transition().duration(200)
        .style("fill-opacity", 0.1); 
      //Bring back the hovered over blob
      d3.select(this)
        .transition().duration(200)
        .style("fill-opacity", 0.7);	
    })
    .on('mouseout', function(){
      //Bring back all blobs
      d3.selectAll(".radarArea")
        .transition().duration(200)
        .style("fill-opacity", cfg.opacityArea);
    });
    
  //Create the outlines	
  blobWrapper.append("path")
    .attr("class", "radarStroke")
    .attr("d", function(d,i) { return radarLine(d.values); })
    .style("stroke-width", cfg.strokeWidth + "px")
    .style("stroke", function(d,i) { return colorFn(d.name); })
    .style("fill", "none")
    .style("filter" , "url(#glow)");		
  
  //Append the circles
  blobWrapper.selectAll(".radarCircle")
    .data(function(d,i) { 
      return d.values.map(function(item) {
        item.id = i;
        return item;
      }); 
    })
    .enter().append("circle")
    .attr("class", "radarCircle")
    .attr("r", cfg.dotRadius)
    .attr("cx", function(d,i){ return rScale(d.value) * Math.cos(angleSlice*i - Math.PI/2); })
    .attr("cy", function(d,i){ return rScale(d.value) * Math.sin(angleSlice*i - Math.PI/2); })
    .style("fill", function(d) { return colorFn(data[d.id].name); })
    .style("fill-opacity", 0.8);

  /////////////////////////////////////////////////////////
  //////// Append invisible circles for tooltip ///////////
  /////////////////////////////////////////////////////////
  
  //Wrapper for the invisible circles on top
  var blobCircleWrapper = g.selectAll(".radarCircleWrapper")
    .data(data)
    .enter().append("g")
    .attr("class", "radarCircleWrapper");
    
  //Append a set of invisible circles on top for the mouseover pop-up
  blobCircleWrapper.selectAll(".radarInvisibleCircle")
 //   .data(function(d,i) { return d.values; })
   .data(function(d,i) { 
      return d.values.map(function(item) {
        item.id = i;
        return item;
      }); 
    })
    .enter().append("circle")
    .attr("class", "radarInvisibleCircle")
    .attr("r", cfg.dotRadius*1.5)
    .attr("cx", function(d,i){ return rScale(d.value) * Math.cos(angleSlice*i - Math.PI/2); })
    .attr("cy", function(d,i){ return rScale(d.value) * Math.sin(angleSlice*i - Math.PI/2); })
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mouseover", function(d) {
      const halfWidth = width / 2;
      const newX =  d3.event.offsetX > halfWidth + 25 ?  d3.event.offsetX - Math.floor(width/4) : d3.event.offsetX + 10;
      const newY =  d3.event.offsetY - 20;

      tooltip
          .html(function () { return getTooltipHtml(d); })
          .transition()
          .duration(100)
          .style('left', newX + 'px')
          .style('top', newY + 'px')
          .style('opacity', 0.8);
    })
    .on("mouseout", function(){
      tooltip.transition().duration(100)
        .style("opacity", 0);
    });
  
  /////////////////////////////////////////////////////////
  /////////////////// Helper Function /////////////////////
  /////////////////////////////////////////////////////////

  //Taken from http://bl.ocks.org/mbostock/7555321
  //Wraps SVG text	
  function wrap(text, width) {
    text.each(function() {
    var text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 1.4, // ems
      y = text.attr("y"),
      x = text.attr("x"),
      dy = parseFloat(text.attr("dy")),
      tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
      
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
      line.pop();
      tspan.text(line.join(" "));
      line = [word];
      tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
    });

    // ///////////////////////////////////////////////////////
    // //////// DRAW THE LEGEND //////////////////////////////
    // ///////////////////////////////////////////////////////

    if (radarShowLegend) {
      const legend = svg.append('g')
      // .attr('class', 'legendOrdinal')
        .attr('transform', 'translate(' + cfg.legendPosition.x + ',' + cfg.legendPosition.y + ')');
      const rectHeight = data.length * 30;

      // Calculate width of legend according to number of characters in longest category name
      let rectWidth = 150;
      const longestName = data.reduce((a, b) => a.length > b.name.length ? a : b, '').name;
      if (longestName !== undefined) {
        if (longestName.length >= 15 && longestName.length < 25) {
          const MULTIPLIER = 8.5;
          rectWidth = Math.round(longestName.length * MULTIPLIER);
        } else if (longestName.length >= 25) {
          const MULTIPLIER = 7.5;
          rectWidth = Math.round(longestName.length * MULTIPLIER);
        }
      }

      // Legend text
      legend
        .selectAll('text')
        .data(data)
        .enter()
        .append('text')
        .attr("class", "radar_legend_text")
        .attr('x', 20)
        .attr('y', (d, i) => (i + 1) * 13)
        .text(d => d.name)
        .style('fill', "grey");

      // Legend circles
      legend
        .selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', 10)
        .attr('cy', (d, i) => ((i + 1) * 13) - 5)
        .attr('r', 5)
        .style("stroke", "#CDCDCD")
        .style('fill', d => colorFn(d.name))
        .on('mouseover', (d) => {
          cellover(d, data);
        })
        .on('mouseout', () => {
          // used to carry d in here, not sure why as it wasn't being used
          cellout(cfg);
        });
    }
  }//wrap	

}

Radar.displayName = 'RadarChart';
Radar.propTypes = propTypes;

export default Radar;
