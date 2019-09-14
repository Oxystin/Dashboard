import d3 from 'd3';
import PropTypes from 'prop-types';
import { getSequentialSchemeRegistry } from '@superset-ui/color';
import { getNumberFormatter } from '@superset-ui/number-format';
import { CategoricalColorNamespace } from '@superset-ui/color';
import { d3LocaleTimeFormat } from '../localeformat';
import './Waterfall.css';

const propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
};

function Waterfall(element, props) {
  const {
    data,
    width,
    height,
    chartId,
    numberFormat,
    ColorTotal,
    ColorPositive,
    ColorNegative,
    dateTimeFormat,
    waterfallLabelRotate, 
    waterfallTimeShift,
    waterfallHideControl,
  } = props;

  const NL = d3.locale ({
    "decimal": ".",
    "thousands": " ",
    "grouping": [3],
    "currency": ["",""],
    "dateTime": "",
    "date": "",
    "time": "",
    "periods": [],
    "days": [],
    "shortDays": [],
    "months": [],
    "shortMonths": []
  })

  const format_num = NL.numberFormat("$,.f");

  const div = d3.select(element)
    .attr("class", "waterfall_chart");

  div.selectAll('*').remove();
  const svg = div.append('svg')
    .attr("width",  width)
    .attr("height", height)
    .attr("class", "waterfall_svg");

   const format = numberFormat ? getNumberFormatter(numberFormat) : d3.format('.3sl;');

  WaterFallDraw (svg[0], data, waterfallTimeShift, ColorTotal,ColorPositive,ColorNegative,waterfallLabelRotate);

  function WaterFallDraw(svg_area, data_raw, shift, colorTotal, colorPositive, colorNegative, labelRotate){

    var date_sort = data_raw[0].values.map (d => d.x).sort((a, b) => a - b);
    var month1 = date_sort[date_sort.length-1];
    var month2 = date_sort[date_sort.length-shift-1];
    date_sort =[];

    var svg = d3.select(svg_area[0]).attr("class", "wf-chart");
    var svgParent =  d3.select(element).attr("style", "position:relative;");
    var tooltip = d3.select('body').append("div").attr("class", "wf-chart-tooltip");
    var margin=25;
    
    var xLn; // длина оси X
    var yLn; // длина оси Y

    //область графика
    var chart = svg.append("g").attr("class", "chart");
    
    var SortArr = [month1,month2].sort(); // сортируем отображаемые месяца от раннего к познему
    month1 = SortArr[0];
    month2 = SortArr[1];

    // функция получения адекватного месяца и года
    function GetDateString(date_num){
        const date_format = d3LocaleTimeFormat(dateTimeFormat);
        return date_format(date_num);
    }

    // отрисовка графика
    function UpdateChart(month1,month2) {

        var marginBottom = margin; // нижний отступ для отрисовки подписей оси X

        var data =[]; //массив с данными для отрисовки
        var ttl1 = 0; // тотал 1 месяца
        var ttl2 = 0; // тотал 2 месяца

        // считаем тоталы
        for(let itemFactor of data_raw){
            for(let ItemDate of itemFactor.values){
                if (ItemDate.x==month1) ttl1=ttl1+ItemDate.y
                if (ItemDate.x==month2) ttl2=ttl2+ItemDate.y
            } 
        }

        // заносим тотал 1го месяца в массив
        data.push({
            label: GetDateString(month1),
            value: ttl1,
            total: ttl1,
            class: "total"
        });

        // считаем перепады
        var agregate_sum = ttl1; //аккумулятивный итог изменеия итоговой суммы для расчета перепада
        for (let itemFactor of data_raw) {
            var fName = itemFactor.key; //имя фактора
            var fValueArr1 = itemFactor.values.filter(function(itemDate){return itemDate.x==month1}); //значение фактора в 1 периоде
            var fValue1, fValue2;
            if (fValueArr1.length>0) fValue1 = fValueArr1[0].y;
            else fValue1=0;
            var fValueArr2 = itemFactor.values.filter(function(itemDate){return itemDate.x==month2}); //значение фактора во 2 периоде
            if (fValueArr2.length>0) fValue2 = fValueArr2[0].y;
            else fValue2=0;

            var diff = fValue2 - fValue1; //смещение
            agregate_sum = agregate_sum + diff; //Полная сумма по фактору
            var class_value ="";
            if (diff > 0) class_value = "plus";  //Для установки класса для раскрашивания
            else class_value = "minus";

            // заносим в массив    
            data.push({
                label: fName,
                value: diff,
                total: agregate_sum,
                class: class_value
            });
        }


        // заносим тотал 2 месяца в массив
        data.push({
            label: GetDateString(month2) + ' ',
            value: ttl2,
            total: ttl2,
            class: "total"
        });
       
        // очищаем канву
        chart.selectAll("*").remove();

        // длина оси X
        xLn = width - 2*margin; 

        // масштабирование значений по X
        var xScale = d3.scale.ordinal()
                .domain(data.map(function(d) { return d.label; }))
                .rangeRoundBands([0, xLn], 0.3, 0.4);

        // ось X   
        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom");
            
        // добавляем Х             
        chart.append("g")       
            .attr("class", "x-axis")
            .attr("transform", "translate(" + margin + "," + (height - margin) + ")")
            .call(xAxis);

        chart.select(".x-axis").selectAll("line").remove();
        chart.select(".x-axis").selectAll("path").remove();


        // Расчет высоты при задании угла разворота лейблов оси X
        var xTicks = chart.select('.x-axis').selectAll("g").select("text");
        var maxTextHeight = margin;
        
        if (labelRotate%360){
            var textY = xTicks.attr("y");
            xTicks
                .attr('transform', 'rotate(' + labelRotate + ') translate('+ textY + ','+ (-textY) + ')')
                .style('text-anchor', labelRotate%360 > 0 ? 'start' : 'end');

            xTicks.each(function(d,i){
                var box = this.getBoundingClientRect();
                var width = box.width;
                var textHeight = box.height;
                if(textHeight > maxTextHeight) maxTextHeight = textHeight;   
            });
            marginBottom += maxTextHeight;
            chart.select('.x-axis').attr("transform", "translate(" + margin + "," + (height - marginBottom) + ")"); 
        }

        
        //длина оси Y
        yLn = height - margin - marginBottom;

        // масштабирование значений по Y (инициализация шкалы без домена)
        var yScale = d3.scale.linear().range([yLn, 0]);
        
        // екстремумы графика
        var minTotal = d3.min(data,function(d) { return d.total; });
        var maxTotal = d3.max(data,function(d) { return d.total; });

        //расчитываем необходимость разрыва графика по нижней границе
        var lowLimit=0;
        if (minTotal>0){
            yScale.domain([minTotal, maxTotal]);
            lowLimit = yScale.invert(yLn+20);
            yScale.clamp(true); // ограничеваем ось только значениями диапозона. Выход за нижнюю границу обрезается.
        }
        else lowLimit=minTotal;
        
        // добавляем расчитаный домен
        yScale.domain([lowLimit, maxTotal]);       
        
        // ось Y             
        var yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left");
                    
        // добавляем Y 
        /*chart.append("g")       
            .attr("class", "y-axis")
            .attr("transform","translate(" + margin + "," + margin + ")")
            .call(yAxis);*/


        // добавляем нулевую линию, если это необходимо    
        if (minTotal<0) {
            chart.append("line")
            .attr("x1", margin)
            .attr("y1", yScale(0)+margin)
            .attr("x2", xLn+margin)
            .attr("y2", yScale(0)+margin)
            .attr("stroke-dasharray", "50 10")
            .style({"stroke-width": "1px", "stroke": "#585858"})
        }

        // смещение области графика
        var bars = chart.append("g")
            .attr("class","bars")
            .attr("transform","translate(" + (margin) + ", 0)");

        
        // добавляем домены 
        var bar = bars.selectAll(".bar")
            .data(data)
            .enter().append("g")
            .attr("class", "bar");

        // добавляем столбец    
        bar.append("rect")
            .attr("class", function(d) { return  d.class; })   
            .attr("x", function(d) { return xScale(d.label); })
            .attr("width", xScale.rangeBand())
            .attr("y", function(d) { return yScale(Math.max(d.total, (d.total-d.value)))+ margin; })
            .attr("height", function(d) { return Math.abs(yScale(d.total - d.value) - yScale(d.total));})
            .attr("rx", 1)
            .attr("style", function(d){
                var fill = "fill: ";
                var color;
                if (d.class === "total") color=colorTotal;
                if (d.class === "plus") color=colorPositive;
                if (d.class === "minus") color=colorNegative;
                return fill+color;
            })
            .on('mouseover', function (d) { /* при наведении меняем прозрачность */
                d3.select(this).transition()
                    .duration('100')
                    .attr('opacity', '.85');})
            .on("mousemove", function(d){ /* при движении мыши включаем тултип */
                tooltip
                  .style("left", d3.event.pageX + 15 + "px")
                  .style("top", d3.event.pageY + 5 + "px")
                  .style("display", "inline-block")
                  .html((d.label) + "<br>" + format_num(d.value));
                })
            .on("mouseout", function(d){ /* при убирании мыши скрываем тултип и ставим прозрачность 1 */
                tooltip.style("display", "none");
                d3.select(this).transition()
                .duration('100')
                .attr('opacity', '1');})         
            ;
            
        // добавляем подпись над столбцами
        bar.append("text")
            .attr("x",function(d) { return xScale(d.label) + xScale.rangeBand()/2 })
            .attr("y", function(d) { return yScale(Math.max(d.total, (d.total - d.value)))+20;})
            .style({"text-anchor": "middle"})
            .text(d => format(d.value))
            ;

        // добавляем разрыв тоталов   
        bar.each(addGap);  

        function addGap(d){
            if (d.class === "total" && yScale.clamp()) {
                var gap = d3.select(this).append("g").attr("class","gap");

                gap.append("svg")
                    .attr("width",xScale.rangeBand()+1)
                    .attr("height",xScale.rangeBand()/7)
                    .attr("x",function(d) { return xScale(d.label); })
                    .attr("y",yLn+margin-15)
                    .attr("viewBox","0 0 93 13.4")
                    .attr("preserveAspectRatio","none")

                    .append("polyline")
                    .attr("points","0.7,13.7 13.4,0.8 25.3,12.8 37.2,0.8 49,12.8 60.9,0.8 72.8,12.8 84.7,0.8 96.6,12.8")
                    .style({"fill":"none", "stroke":"#fff", "stroke-width": 4})
                ;

            }
        }
    }
    

    UpdateChart(month1,month2); //первоначальная отрисовка


   /*============ Слайдер  =================*/

    // размеры области слайдера
    var SliderW = width - 2*margin;
    var SliderH = 20;

    //высота области баров
    var sl_bar_h=30;

    /*var dropdown = svg.append("g").attr("class","wf-chart-dropdown");
    dropdown.append("foreignObject").attr("style","width: 100%");

    var dropdownContainer = dropdown.select("foreignObject").append("xhtml:div").attr("class","dropdown-container")
    .attr("style", "height: "+(SliderH+margin+sl_bar_h)+"px;")
    .classed("hide", true);
    ;*/

    var dropdown = svgParent.append("div").attr("class","wf-chart-dropdown").attr("style","z-index: 2;");

    var dropdownContainer= dropdown.append("div").attr("class","wf-chart-dropdown-container")
    .attr("style","width:" + width +"px; " + "height: "+(SliderH+margin+sl_bar_h)+"px; position:absolute; top:0px;")
    .classed("hide", true);
    ;
    
    dropdownContainer.append("svg")
        .attr("width", width)
        .attr("height", SliderH+sl_bar_h)
        .style("position", "absolute")
        .style("top", margin + "px")
        //.attr("transform", "translate("+ 0 +","+ margin +")")
    ;

    var DatesArr = []; //массив дат для слайдера
    var ObjDate ={}; //вспомогательный объект для удаления дублей по датам + хранение тотальных сумм

    for(let itemFactor of data_raw){
        for(let ItemDate of itemFactor.values){
            if (!(ItemDate.x in ObjDate)) ObjDate[ItemDate.x] = 0; 
            ObjDate[ItemDate.x] = ObjDate[ItemDate.x] + ItemDate.y; // дубли по датам удаляться, т.к. ключи в объектах не дублируются
        } 
    }
    
    DatesArr = Object.keys(ObjDate).map(function(item){return Number(item)}); // записываем ключи из вспомогательного объекта в массив с датами
    DatesArr.sort();

    // массив с начальными позициями
    var SelectValues = [month1,month2];

    // масштабирование слайдера
    var slScale = d3.scale.ordinal()
            .domain(DatesArr)
            .rangeRoundPoints([0, xLn]);

    // позиции баров по x        
    var sl_bar_x = d3.scale.ordinal()
            .domain(DatesArr)
            .rangeBands([0, xLn], 0.8, 0);

    // масштабирование баров по y       
    var sl_bar_scale = d3.scale.linear()
        .domain([d3.min(Object.values(ObjDate))-d3.min(Object.values(ObjDate))*0.1 , d3.max(Object.values(ObjDate))])
        .range([sl_bar_h,0])
        ;

    var slider_bars = dropdownContainer.select("svg").append("g")
    .attr("class", "slider-previw")
    .attr("transform", "translate("+ margin +","+ 0 +")")
    ;

    slider_bars.append("g")
    .selectAll(".bar")
    .data(Object.entries(ObjDate))
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return sl_bar_x(d[0]); })
    .attr("width", sl_bar_x.rangeBand())
    .attr("y", function(d) { return sl_bar_scale(d[1]); })
    .attr("height", function(d) { return (sl_bar_h) - sl_bar_scale(d[1]); })
    .attr("fill", "#6a7485")
    .attr("rx",1);
    ;
 
    // квантование для обратной привязки диапозонов координат к значениям данных.
    // к каждому значению периода будет привязана не отдельная точка, а диапозон, 
    // чтобы можно было прявызвать значения переодов с любым положением маркеров слайдера.
    var slStep = Math.floor((slScale.range()[1] - slScale.range()[0])/2); // вычисляем половину шага 
    var slMinX = d3.min(slScale.range(), function(d) { return d; }) - slStep; 
    var slMaxX = d3.max(slScale.range(), function(d) { return d; }) + slStep;  
    var quantScale = d3.scale.quantize().domain([slMinX, slMaxX]).range(slScale.domain()); //вычисляем шкалу квантования
    
    // размеры маркеров
    var slHandleH=12;
    var slHandleW=18;

    //верхнеуровневая группа
    var slider = dropdownContainer.select("svg").append("g")
        .attr("class", "slider")
        .attr("transform", "translate("+ margin +","+ (sl_bar_h+2) +")")
        ;

    // направляющая
    slider.append("line")
        .attr("class", "track")
        .attr("x1", slMinX+slStep)
        .attr("x2", slMaxX-slStep)
        .attr("y1", slHandleH/2)
        .attr("y2", slHandleH/2)
        ;

    slider.append("line")
        .attr("class", "track-inner")
        .attr("x1", slMinX+slStep)
        .attr("x2", slMaxX-slStep)
        .attr("y1", slHandleH/2)
        .attr("y2", slHandleH/2)
        ;


    // центральная линия
    var dragline = slider.append("line")
        .attr("class", "track-drag")
        .attr("x1", slScale(SelectValues[0]))
        .attr("x2", slScale(SelectValues[1]))
        .attr("y1", slHandleH/2)
        .attr("y2", slHandleH/2)
        .call(
            d3.behavior.drag()                      
            .on("dragstart", draglineStartDrag)
            .on("drag", draglineMove)
            .on("dragend", draglineEnd)
        );

    // невидимая линия для перетаскивания
    var hideline = slider.append("line")
        .attr("class", "hide-handle")
        .attr("x1", slScale(SelectValues[0]))
        .attr("x2", slScale(SelectValues[1]))
        .attr("y1", slHandleH/2)
        .attr("y2", slHandleH/2)
        .attr("style", "visible:hide")
        ;


    // рисуем 2 маркера
    var handle = slider
        .selectAll("rect")
        .data([month1, month2])
        .enter()
        .append("rect",)
        .attr("class", "handle")
        .attr("x", function(d,i) { return slScale(SelectValues[i])-slHandleW/2; }) //устанавливаем позиции по-умолчанию, смещаем маркер на середину метки
        .attr("rx", 1)
        .attr("height", slHandleH)
        .attr("width", slHandleW)
        .call(
            d3.behavior.drag() //привязываем события мыши
            .on("dragstart", startDrag)
            .on("drag", drag)
            .on("dragend", endDrag)
        )
        .on("mouseover", tooltipVis )
        .on("mouseout", function(d){ tooltip.style("display", "none");});
        ;

    

    // обработчик по нажатию
    function startDrag(){
        d3.select(this).classed("active", true);
        
    }

    // обработчик по перемещению
    function drag(d,i){
         
        var x=d3.event.x; //получем текущую коррдинату мыши 
        var dx = quantScale(x), // получаем значение периода, к которому привязана координата
            xd = slScale(dx); // получаем позицию периода на слайдере
        if( 
            (i==0 && dx!=SelectValues[1] && x<slScale(SelectValues[1]))
            ||
            (i==1 && dx!=SelectValues[0] && x>slScale(SelectValues[0]))
        ) {
            d3.select(this).attr("x", xd-slHandleW/2); //фиксируем маркер на позиции периода, смещаем на центр 
            SelectValues[i]=dx;
            handle.data(SelectValues);
            tooltipVis(d,i); 
            dragline.attr("x1", slScale(SelectValues[0]))
                    .attr("x2", slScale(SelectValues[1]));
        }

    }

    //обработчик по завершению события мыши
    function endDrag(d){
        d3.select(this).classed("active", false);
        UpdateChart(SelectValues[0],SelectValues[1]); //обновление графика
        tooltip.style("display", "none");         
    }


    // центральная линия - начало перетаскивания
    function draglineStartDrag(){

        hideline.attr("x1", dragline.attr("x1")).attr("x2", dragline.attr("x2"));
        
    }

    // перемещение центральной линии
    function draglineMove(){
        //console.log(d3.event);

        hideline.attr("x1", (Number(hideline.attr("x1")) + d3.event.dx) ).attr("x2", (Number(hideline.attr("x2")) + d3.event.dx) )
   
        var x1 = Number(hideline.attr("x1"));
        var x2 = Number(hideline.attr("x2"));
        
        var dx1 = quantScale(x1);
        var dx2 = quantScale(x2); 
        var xd1 = slScale(dx1);
        var xd2 = slScale(dx2); 

        if (x1>=d3.min(slScale.range()) && x2<=d3.max(slScale.range()))
        {
            dragline.attr("x1", xd1)
                    .attr("x2", xd2);

            SelectValues[0]=dx1;
            SelectValues[1]=dx2;

            handle.data(SelectValues).attr("x", function(d,i) { return slScale(SelectValues[i])-slHandleW/2; });

            tooltip
                .style("display", "inline-block")
                .style("left", d3.event.sourceEvent.pageX + (-30) + "px")
                .style("top", d3.event.sourceEvent.pageY + 30 + "px")
                .html(GetDateString(SelectValues[0]) + " - " + GetDateString(SelectValues[1])); 
        }

    }

    // центральная линия - конец события перетаскивания
    function draglineEnd(){

        hideline.attr("x1", dragline.attr("x1")).attr("x2", dragline.attr("x2"));
        UpdateChart(SelectValues[0],SelectValues[1]);
        tooltip.style("display", "none"); 

    }

    // функция визуализации тултипа для маркеров
    function tooltipVis(d,i){
        tooltip
        .style("left", d3.event.pageX + "px")
        .style("top", d3.event.pageY + 20 + "px")
        .style("display", "inline-block")
        .html(GetDateString(SelectValues[i]));
       // console.log(d3.event);    
    }

    var dropdownbtn =  dropdown.append("svg")
        .attr("width",24)
        .attr("height",24)
        .attr("viewBox","0 0 54 54")
        /*.attr("x",(width-margin))
        .attr("y",5)*/
        .attr("style","position: absolute; top: 5px; left:"+(width-margin)+"px;")
        .attr("hidden",waterfallHideControl ? waterfallHideControl : null)
        .on("click",dropDownClick)
    ;

    dropdownbtn.append("circle")
        .attr("class", "dropdownbtn") 
        .attr("cx", 27)
        .attr("cy", 27)
        .attr("r", 27)
    ;

    dropdownbtn.append("line")
        .attr("x1", 15)
        .attr("y1", 16)
        .attr("x2", 39)
        .attr("y2", 16)
        .style({"stroke":"#FFFFFF","stroke-width":2})
    ;
    
    dropdownbtn.append("line")
        .attr("x1", 15)
        .attr("y1", 27)
        .attr("x2", 39)
        .attr("y2", 27)
        .style({"stroke":"#FFFFFF","stroke-width":2})
    ;

    dropdownbtn.append("line")
        .attr("x1", 15)
        .attr("y1", 38)
        .attr("x2", 39)
        .attr("y2", 38)
        .style({"stroke":"#FFFFFF","stroke-width":2})
    ;
    
    function dropDownClick() {
        dropdownContainer.classed("visible", !dropdownContainer.classed("visible"));
        dropdownContainer.classed("hide", !dropdownContainer.classed("hide"));
    };
}

}

Waterfall.displayName = 'WaterfallChart';
Waterfall.propTypes = propTypes;

export default Waterfall;
