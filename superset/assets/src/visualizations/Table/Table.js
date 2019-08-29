import d3 from 'd3';
import $ from 'jquery';
import PropTypes from 'prop-types';
import dt from 'datatables.net-bs';
import 'datatables.net-bs/css/dataTables.bootstrap.css';
import dompurify from 'dompurify';
import { getNumberFormatter, NumberFormats } from '@superset-ui/number-format';
import { getTimeFormatter } from '@superset-ui/time-format';
import { fixDataTableBodyHeight } from '../../modules/utils';
import './Table.css';

dt(window, $);

const propTypes = {
  // Each object is { field1: value1, field2: value2 }
  data: PropTypes.arrayOf(PropTypes.object),
  height: PropTypes.number,
  showProgressBar: PropTypes.bool,
  alignPositiveNegative: PropTypes.bool,
  colorPositiveNegative: PropTypes.bool,
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string,
    label: PropTypes.string,
    format: PropTypes.string,
  })),
  filters: PropTypes.object,
  includeSearch: PropTypes.bool,
  metrics: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ])),
  onAddFilter: PropTypes.func,
  onRemoveFilter: PropTypes.func,
  orderDesc: PropTypes.bool,
  pageLength: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  percentMetrics: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ])),
  tableFilter: PropTypes.bool,
  tableTimestampFormat: PropTypes.string,
  timeseriesLimitMetric: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ]),
  chartId: PropTypes.number.isRequired,
  clearTableFilter: PropTypes.bool,
  clearTableElement: PropTypes.string,
};

const formatValue = getNumberFormatter(NumberFormats.INTEGER);
const formatPercent = getNumberFormatter(NumberFormats.PERCENT_3_POINT);


function NOOP() {}

function TableVis(element, props) {
  const {
    data,
    height,
    alignPositiveNegative = false,
    colorPositiveNegative = false,
    columns,
    filters = {},
    includeSearch = false,
    metrics: rawMetrics,
    onAddFilter = NOOP,
    onRemoveFilter = NOOP,
    orderDesc,
    pageLength,
    percentMetrics,
    tableFilter,
    tableTimestampFormat,
    timeseriesLimitMetric,
    chartId,
    clearTableFilter,
    clearTableElement,
    showProgressBar,
  } = props;

  const $container = $(element);
  const id_filter = 'clear_filter_' + chartId;
  var isFilters = false;
  var force_event_click;
  try {
     force_event_click = tableFilter ? JSON.parse(clearTableElement) : false;
  } catch (e) {
     force_event_click = false;
  }

  function Clear_Filter_Button () {
    if (clearTableFilter && tableFilter) {
      isFilters = true;
      $container.prepend('<div id="' + id_filter + '" class="clear_filter"></div>');
      $('#' +id_filter).on( "click", function(e) {
        const $filter_item = $container.find('td:first')
        if ($filter_item.length>0) {
          const key = $filter_item[0].__data__.col;
          $filter_item.removeClass('filtered');
          onAddFilter(key,[],false,true);
          $('#' +id_filter).remove();
          isFilters = false;
        }
      });
    }
  };

  const metrics = (rawMetrics || []).map(m => m.label || m)
    // Add percent metrics
    .concat((percentMetrics || []).map(m => '%' + m))
    // Removing metrics (aggregates) that are strings
    .filter(m => (typeof data[0][m]) === 'number');

  function col(c) {
    const arr = [];
    for (let i = 0; i < data.length; i += 1) {
      arr.push(data[i][c]);
    }
    return arr;
  }
  const maxes = {};
  const mins = {};
  for (let i = 0; i < metrics.length; i += 1) {
      maxes[metrics[i]] = d3.max(col(metrics[i]).map(d => d>=0 ? d: 0));
      mins[metrics[i]] = d3.min(col(metrics[i]).map(d => d<0 ? d: 0));
  }

  const tsFormatter = getTimeFormatter(tableTimestampFormat);

  const div = d3.select(element);
  div.html('');
  const table = div.append('table')
    .classed(
      'dataframe dataframe table table-striped ' +
      'table-condensed table-hover dataTable no-footer', true)
    .attr('width', '100%');

  table.append('thead').append('tr')
    .selectAll('th')
    .data(columns.map(c => c.label))
    .enter()
    .append('th')
    .text(d => d);

  table.append('tbody')
    .selectAll('tr')
    .data(data)
    .enter()
    .append('tr')
    .selectAll('td')
    .data(row => columns.map(({ key, format }) => {
      const val = row[key];
      let html;
      const isMetric = metrics.indexOf(key) >= 0;
      if (key === '__timestamp') {
        html = tsFormatter(val);
      }
      if (typeof (val) === 'string') {
        html = `<span class="like-pre">${dompurify.sanitize(val)}</span>`;
      }
      if (isMetric) {
        html = getNumberFormatter(format)(val);
      }
      if (key[0] === '%') {
        html = formatPercent(val);
      }

      return {
        col: key,
        val,
        html,
        isMetric,
      };
    }))
    .enter()
    .append('td')
    .classed('text-right', d => d.isMetric)
    //.attr('title', d => (!Number.isNaN(d.val) ? formatValue(d.val) : d.val))
    //.attr('title', d => d.val)
    .attr('data-sort', d => (d.isMetric) ? d.val : null)
    // Check if the dashboard currently has a filter for each row
    .classed('filtered', d =>
      filters &&
      filters[d.col] &&
      filters[d.col].indexOf(d.val) >= 0,
    )
    .on('click', function (d) {
      if (!d.isMetric && tableFilter) {
        const td = d3.select(this);
        if (!(td.classed('filtered'))) {
          table.selectAll('td').classed('filtered', false);
          if (force_event_click && force_event_click.keys) {
            if ( force_event_click.keys.some (k => k == d.val) ) {
              onAddFilter(d.col,[],false,true) ;
            } else {
              onAddFilter(d.col, [d.val],false,true);
              if (!isFilters) Clear_Filter_Button ();             
            }
          } else {
            onAddFilter(d.col, [d.val],false,true);
            if (!isFilters) Clear_Filter_Button ();
          }
          td.classed('filtered', true);
        }
      }
    })
    .on('dblclick', function (d) {
      table.selectAll('td').classed('filtered', false);
      onAddFilter(d.col, [],false,true);
    })
    .style('cursor', d => (!d.isMetric) ? 'pointer' : '')
    .html(d => d.html ? d.html : d.val);

    if (showProgressBar) {
        table.selectAll('td')
        .filter(d => d.isMetric)
        .append('div')
        .attr("id",'cell_progress_bar')
        .append('div')
        .attr("class", function (d) {
          if (colorPositiveNegative) {
            return d.val>=0 ? 'positive_bar progress_bar' : 'negative_bar progress_bar'
          } else {
            return 'neutral_bar progress_bar'
          } 
        })
        .style("left", function (d) {
          let perc=0;
          const total_col = Math.abs(maxes[d.col]) + Math.abs(mins[d.col]);
          if (!alignPositiveNegative) {
            if (d.val>=0 ) {
              perc = total_col!=0 ? Math.abs(mins[d.col]) / total_col * 100 : 0;
            } else {
              perc = total_col!=0 ? Math.abs((mins[d.col])-d.val) / total_col * 100 : 0;
            }
          }
        return perc.toFixed(2) + '%'
        })
        .style('width', "0%").transition().duration(1000)
        .style('width', function (d) {
          let perc;
          if (alignPositiveNegative) {
            const total_col = Math.max(maxes[d.col],Math.abs(mins[d.col]));
            perc = total_col ? Math.abs(d.val) / total_col * 100 : 0;
          } else {
            const total_col = Math.abs(maxes[d.col]) + Math.abs(mins[d.col]);
            perc = total_col!=0 ? Math.abs(d.val) / total_col * 100 : 0;
          }
          return perc.toFixed(2) + '%'
        })
      }

  const paging = pageLength && pageLength > 0;

  const datatable = $container.find('.dataTable').DataTable({
    dom: '<"top"i>rtp<"bottom"><"clear">',
    paging,
    pageLength,
    aaSorting: [],
    searching: includeSearch,
    bInfo: false,
    scrollY: `${height}px`,
    scrollCollapse: true,
    scrollX: true,
  });

  if (includeSearch) {
    $container.prepend('<input id="searchBox_' + chartId + '" class="dataTables_filter" type="search" placeholder="Поиск">');
    $('#searchBox_' + chartId ).on( 'keyup click', function () {
      datatable.search(this.value).draw();
    });
  }

  fixDataTableBodyHeight($container.find('.dataTables_wrapper'), height);
  // Sorting table by main column
  let sortBy;
  const limitMetric = Array.isArray(timeseriesLimitMetric)
    ? timeseriesLimitMetric[0]
    : timeseriesLimitMetric;
  if (limitMetric) {
    // Sort by as specified
    sortBy = limitMetric.label || limitMetric;
  } else if (metrics.length > 0) {
    // If not specified, use the first metric from the list
    sortBy = metrics[0];
  }
  if (sortBy) {
    const keys = columns.map(c => c.key);
    const index = keys.indexOf(sortBy);
    datatable.column(index).order(orderDesc ? 'desc' : 'asc');
    if (metrics.indexOf(sortBy) < 0) {
      // Hiding the sortBy column if not in the metrics list
      datatable.column(index).visible(false);
    }
  }
  datatable.draw();

  if ($container.find('td.filtered').length>0) {
    Clear_Filter_Button ();
  } else {
    isFilters = false;
    // clear force key
    if (force_event_click && force_event_click.keys) {
      const $filter_item = $container.find('td')
      $filter_item.each(function (i,obj){
        if (force_event_click.keys.includes(obj.__data__.val)) {
          $(obj).addClass('filtered');
        }
      })
    }

  };
}

TableVis.displayName = 'TableVis';
TableVis.propTypes = propTypes;

export default TableVis;
