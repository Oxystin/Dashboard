import dt from 'datatables.net-bs';
import 'datatables.net-bs/css/dataTables.bootstrap.css';
import $ from 'jquery';
import PropTypes from 'prop-types';
import { formatNumber } from '@superset-ui/number-format';
import { fixDataTableBodyHeight } from '../../modules/utils';
import './PivotTable.css';

dt(window, $);

const propTypes = {
  data: PropTypes.shape({
    // TODO: replace this with raw data in SIP-6
    html: PropTypes.string,
    columns: PropTypes.arrayOf(PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ])),
  }),
  height: PropTypes.number,
  columnFormats: PropTypes.objectOf(PropTypes.string),
  numberFormat: PropTypes.string,
  numGroups: PropTypes.number,
  verboseMap: PropTypes.objectOf(PropTypes.string),
  jsonParameter: PropTypes.string,
  jsonParameter2: PropTypes.string,
  showProgressBar: PropTypes.bool,
  alignPositiveNegative: PropTypes.bool,
  colorPositiveNegative: PropTypes.bool,
};

function PivotTable(element, props) {
  const {
    data,
    height,
    columnFormats,
    numberFormat,
    numGroups,
    verboseMap,
    jsonParameter,
    jsonParameter2,
    showProgressBar,
    alignPositiveNegative,
    colorPositiveNegative,
  } = props;

  const { html, columns } = data;
  const container = element;
  const $container = $(element);

  var forceClassName;
  try {
     forceClassName = jsonParameter.length > 0 ? JSON.parse(jsonParameter) : false;
     forceClassName = forceClassName.range && forceClassName.classname && forceClassName ;
  } catch (e) {
     forceClassName = false;
  }

  var categoryClassname;
  try {
    categoryClassname = jsonParameter2.length > 0 ? JSON.parse(jsonParameter2) : false;
    categoryClassname = categoryClassname.keys && categoryClassname.classname && categoryClassname ;
 } catch (e) {
    categoryClassname = false;
 }

  function getClassnameValue (val) {
    var index = -1;
      if (forceClassName) {
        for(var i = 0; i < forceClassName.range.length; i++) {
          if (i == 0) {
            if (val < forceClassName.range[0] ) {
              index = 0;
              break;
            }
          } else {
            if (forceClassName.range[i-1] <= val && val < forceClassName.range[i] ) {
              index = i;
              break;
            }
          }
        }
        return index < 0 ? forceClassName.classname[forceClassName.classname.length-1] : forceClassName.classname[index];
      }
  }

  // payload data is a string of html with a single table element
  container.innerHTML = html;

  const cols = Array.isArray(columns[0])
    ? columns.map(col => col[0])
    : columns;

  // jQuery hack to set verbose names in headers
  const replaceCell = function () {
    const s = $(this)[0].textContent;
    $(this)[0].textContent = verboseMap[s] || s;
  };
  $container.find('thead tr:first th').each(replaceCell);
  $container.find('thead tr th:first-child').each(replaceCell);

  const maxes = {};
  const mins = {};

  var column_count;

  if (showProgressBar) {
    var data_table = $container.find('tbody tr').find('td').map(function(){
      var value = $(this).text();
      if(!isNaN(value) && value.length != 0) {
        return parseFloat(value);
      } else {
        return 0
      }
    }).get()
  
    column_count = cols.length;
    const arr_count = data_table.length;
  
    for (let i = 0; i < column_count; i += 1) {
      let min=0;
      let max=0;
      for (let n = 0; n < arr_count; n += column_count) {
        if (data_table[i+n] < min) {
          min = data_table[i+n]
        }
        if (data_table[i+n] > max) {
          max = data_table[i+n]
        }
      }
      maxes['col_'+i] = max;
      mins['col_'+i] = min;
    }
  }

  // jQuery hack to format number
  $container.find('tbody tr').each(function () {
    $(this).find('td').each(function (i) {
      const metric = cols[i];
      const format = columnFormats[metric] || numberFormat || '.3s';
      const tdText = $(this)[0].textContent;
      if (!Number.isNaN(tdText) && tdText !== '') {
        if (tdText == 0) {
          $(this).addClass('zero');
        } else {
          tdText < 0 ? $(this).addClass('col_' + i + ' negative') : $(this).addClass('col_' + i + ' positive') ;
        }
        // Add classname depending of the value
        $(this).addClass(getClassnameValue(tdText));
        $(this).addClass('text_progress_right')
        $(this).text(formatNumber(format, tdText));
        $(this).attr('data-sort', tdText);
      }
    });
  });

  if (showProgressBar) {
    // Progress Bar
    $container.find('tbody tr').each(function (row) {
      $(this).find('td').each(function (i) {
        const value = data_table[row*column_count+i];

        $(this).append("<div id='pivot_progress_bar'><div id='child_progress_bar'></div></div>");

        $("#child_progress_bar",this)
        .addClass(function() {
          if (colorPositiveNegative) {
            return value>=0 ? 'positive_bar progress_bar' : 'negative_bar progress_bar'
          } else {
            return 'neutral_bar progress_bar'
          }           
        })
        .css("left", function (d) {
          let perc=0;
          const total_col = Math.abs(maxes['col_'+i]) + Math.abs(mins['col_'+i]);
          if (!alignPositiveNegative) {
            if (value>=0 ) {
              perc = total_col!=0 ? Math.abs(mins['col_'+i]) / total_col * 100 : 0;
            } else {
              perc = total_col!=0 ? Math.abs((mins['col_'+i])-value) / total_col * 100 : 0;
            }
          }
        return perc.toFixed(2) + '%'
        })
        .css('width', function () {
          let perc;
          if (alignPositiveNegative) {
            const total_col = Math.max(maxes['col_'+i],Math.abs(mins['col_'+i]));
            perc = total_col!=0 ? Math.abs(value) / total_col * 100 : 0;
          } else {
            const total_col = Math.abs(maxes['col_'+i]) + Math.abs(mins['col_'+i]);
            perc = total_col!=0 ? Math.abs(value) / total_col * 100 : 0;
          }
          return perc.toFixed(2) + '%'
        })
      });
    });
    data_table = [];
  }

  // Add classname depending of the Category name
  if (categoryClassname) {
    $container.find('tr th:nth-child(1)').each(function() {
      const index = categoryClassname.keys.indexOf($(this).html());
      if (index > -1 ) {
        $(this).parent().addClass(categoryClassname.classname[index]);
      }
    });
  }

  if (numGroups === 1) {
    // When there is only 1 group by column,
    // we use the DataTable plugin to make the header fixed.
    // The plugin takes care of the scrolling so we don't need
    // overflow: 'auto' on the table.
    container.style.overflow = 'hidden';
    const table = $container.find('table').DataTable({
      paging: false,
      searching: false,
      bInfo: false,
      scrollY: `${height}px`,
      scrollCollapse: true,
      scrollX: true,
    });
    table.column('-1').order('desc').draw();
    fixDataTableBodyHeight($container.find('.dataTables_wrapper'), height);
  } else {
    // When there is more than 1 group by column we just render the table, without using
    // the DataTable plugin, so we need to handle the scrolling ourselves.
    // In this case the header is not fixed.
    container.style.overflow = 'auto';
    container.style.height = `${height + 10}px`;
  }
}

PivotTable.displayName = 'PivotTable';
PivotTable.propTypes = propTypes;

export default PivotTable;
