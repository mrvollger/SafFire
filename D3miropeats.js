var chart_name="chart";
var margin = {top: 100, right: 0, bottom: 40, left: 0};
var scale = 1.5;
var height=Math.round(300*scale);
var width=Math.round(800*scale);

var l_aln_data = [
          {c1_nm: "Chr 1", c1_st: 0, c1_en: 100, c1_len: 1000,
           c2_nm: "Chr 2", c2_st: 20, c2_en: 120, c2_len: 1000,
           id: 90, strand: "+"},
      ];
// thing I want to be global
var t_name = "";
var q_name = "";
var c2_offset = 0; // how much to offset the second contig to allow for centering 
var yscale_d = "";
var xscale = "";
var alpha_scale = "";
var xz =  "";
var xz_offset = "";
const label_margin = 10;
const forward_color = "#2081f9";
const reverse_color = "#f99820";



// load dataset and create table
function load_dataset(csv) {
    var data = d3.tsvParse(csv)
    console.log(data[0]);
    create_table(data);
}

function create_table(data) {
    l_aln_data = data.map(function(d){
        return {
            c1_nm: d["#reference_name"],
            c1_st: +d.reference_start,
            c1_en: +d.reference_end,
            c1_len: +d.reference_length,
            strand: d.strand,
            c2_nm: d["query_name"] + ":0-" + d3.format(".2s")(d["query_length"])+"bp",
            c2_st: +d.query_start,
            c2_en: +d.query_end,
            c2_len: +d.query_length,
            id: +d.perID_by_events,
        };
    });
    var svg = d3.select("#"+chart_name);
    svg.selectAll("*").remove();
    new_target_selector(l_aln_data);
    miropeats_d3(l_aln_data);
};
// load in the t2t alignments as defualt 
d3.tsv("datasets/GRCh38_to_T2T.CHM13.v1.1.tbl")
    .then(function(d) {   // Handle the resolved Promise
        return create_table(d);
    });




// handle upload button
function upload_button(el, callback) {
    var uploader = document.getElementById(el);  
    var reader = new FileReader();
  
    reader.onload = function(e) {
      var contents = e.target.result;
      callback(contents);
    };
  
    uploader.addEventListener("change", handleFiles, false);  
  
    function handleFiles() {
      d3.select("#table").text("loading...");
      var file = this.files[0];
      reader.readAsText(file);
    };
};

var queryButton = d3.select("#queryButton");
var targetButton = d3.select("#targetButton");


new_target_selector(l_aln_data);

function miropeats_d3(data){
    var aln_data = data;
    //var ct_names = d3.set(aln_data, function(d){return d.c2_nm;});
    var t_names = [...new Set(data.map(d => d.c1_nm))];
    var q_names = [...new Set(data.map(d => d.c2_nm))];
    
    t_name = t_names[0];
    q_name = q_names[0];

    // filter for contig of interest! 
    var aln_data = data.filter(function (e) {
        return e.c1_nm == t_name && e.c2_nm == q_name;
    });

    var ct_names = [q_name, t_name];
    console.log(ct_names);
   
    // set up the view box
    var container = d3.select("#"+chart_name)
        .append("svg")
        .attr("width", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`) // top, left, width, down
    
    // xscale inital x scale
    xscale = d3.scaleLinear()
            .domain([0,
                    d3.max(aln_data, function(d) { 
                        return d3.max([d.c1_len,d.c2_len]) 
                    })])
            .range([margin.left, width - margin.right])
    xz = xscale; // define a zoomed version
    function xz_offset(d){
        return xz(d + c2_offset);
    };

    // yscale
    var yscale_d = d3.scaleBand()
            .domain([t_name, q_name])
            .range([height - margin.bottom, margin.top])
            .paddingInner(1)
            .align(0);
    
    // opacity scale
    alpha_scale = d3.scaleLinear()
            .domain([d3.min(aln_data, function(d) { return d.id }),
                     d3.max(aln_data, function(d) { return d.id })])
            .range([0.5, 0.7]);

   
    // zoom scale 
    const zoom = d3.zoom()
        .scaleExtent([1, 100000])
        .extent([[margin.left, 0], [width - margin.right, height]])
        .translateExtent([[margin.left, -Infinity], [width - margin.right, Infinity]])
        .on("zoom", zoomed);

    // Define the div for the tooltip
    var div = d3.select("body").append("div")	
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")    
            
    // my draw the bezier curves and fill
    function help_draw_alignment(c1_nm, o_c1_st, o_c1_en, c2_nm,
         o_c2_st, o_c2_en,
         perid, strand) {
        
        //
        var c1_st = xz(o_c1_st), c1_en = xz(o_c1_en),
        c2_st = xz_offset(o_c2_st), c2_en = xz_offset(o_c2_en);
        
        const path = d3.path(),
        c1_h = yscale_d(c1_nm) - label_margin,//+yscale_d.bandwidth(),
        c2_h = yscale_d(c2_nm) + label_margin, //yscale_d(c2_nm),
        mid = (c1_h + c2_h) / 2; //yscale((c1_h+c2_h)/2);
        container.append("path")
            .attr("d", path)
            .attr("color", "black")
            .attr("stroke-width",2)
         
        var color = forward_color
        if( strand == "-"){
            var tmp = c2_st;
            c2_st = c2_en;
            c2_en = tmp;
            var color = reverse_color;
        };
        // color alpha on identity 
        var opacity = alpha_scale(perid);

        // connect c1 start and end
        path.moveTo(c1_st, c1_h);
        path.lineTo(c1_en, c1_h);
        // connect the ends ends
        path.bezierCurveTo(c1_en, mid, c2_en, mid, c2_en, c2_h);
        // at contig 2 end go to c2 start 
        path.lineTo(c2_st, c2_h);
        // make a bezier the goes from c2_st to c1_st 
        path.bezierCurveTo(c2_st, mid, c1_st, mid, c1_st, c1_h);
        // path.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x1, y1);
        path.closePath();

        // make the highlight regions 
        container.append("path")
            .attr("d", path)
            .attr("stroke", "none")
            .attr("fill", color)
            .attr('opacity', `${opacity}`)
            .on('mouseover', function (event) {
                d3.select(this).transition()
                        .duration(100)
                        .attr('opacity', '1');
            })
            .on('mousemove', function(event){
                // add the tooltip
                div.transition()		
                    .duration(100)		
                    .style("opacity", .6);		
                div.html(
                            d3.format(".1f")(o_c2_en/1000-o_c2_st/1000) + " kbp<br>"+
                            d3.format(".2f")(perid)+"%<br>" +
                            d3.format(".1f")(o_c1_en/1000-o_c1_st/1000) + " kbp<br>"
                        )	
                    .style("left", event.pageX -80 + "px")		
                    .style("top", event.pageY -20+ "px");
            })
            .on('mouseout', function () {
                d3.select(this).transition()
                        .duration(1)
                        .attr('opacity', `${opacity}`);
                // remove tooltip
                div.transition()		
                    .duration(10)		
                    .style("opacity", 0);	
            })
        
        if(aln_data.length < 0){ 
            // target text         
            container.append('text')
                .attr("x",(c1_st+c1_en)/2).attr("y",c1_h+10)
                .style("fill", "black")
                .style("font-size", "10px")
                .attr("text-anchor", "middle")
                .attr("font-weight", "normal") 
                .text(`${o_c1_st} - ${o_c1_en}`);
            // query text
            container.append('text')
                .attr("x",(c2_st+c2_en)/2).attr("y",c2_h-5)
                .style("fill", "black")
                .style("font-size", "10px")
                .attr("text-anchor", "middle")
                .attr("font-weight", "normal") 
                .text(`${o_c2_st} - ${o_c2_en}`);
        }
    }
    // format the d as input for drawing the alignment
    function draw_alignment(d, i){
        help_draw_alignment(d.c1_nm, d.c1_st, d.c1_en, d.c2_nm, d.c2_st, d.c2_en, d.id, d.strand);
    }

    function draw_x_and_y_scale(){
        // draw the x axis 
        var xAxis = (g, x) => g
            .attr('transform', `translate(0, ${height-20})`)
            .style("font", "11px helvetica")
            .call(d3.axisBottom(x)
                .ticks(10)
            );

        container.append("g")
            .call(xAxis, xz);
        
        // draw the y axis
        container.append('g')
            .style("font", "16px helvetica")
            .attr('transform', `translate(0, 0)`)
            .attr("opacity", 1)
            .attr("fill", "black")
            .attr("stroke-width", 0)
            .call(d3.axisRight(yscale_d));
        
    };
    draw_x_and_y_scale();
    
    
    // add in the data 
    function draw_data(xz){
        // center the query contig
        c2_offset = difference_in_mid_point(aln_data);

        // add in the bezier curves
        container.selectAll('g.item')
            .data(aln_data)
            .enter()
            .each(draw_alignment)
            .selectAll('path')
        
        // add contig bars
        var xc1 = xz(aln_data[0].c1_len);
        var xc2 = xz_offset(aln_data[0].c2_len);
        var yc1 = yscale_d(aln_data[0].c1_nm);
        var yc2 = yscale_d(aln_data[0].c2_nm);

        const path = d3.path();
        path.moveTo(xz(0),yc1-label_margin); // c1 start
        path.lineTo(xc1,yc1-label_margin); // go to c1 en
        path.moveTo(xz_offset(0),yc2+label_margin);
        path.lineTo(xc2, yc2+label_margin);
        path.closePath();

        container.append("path")
            .attr("d", path)
            .attr("stroke", "black")
            .attr("stroke-width", 3)
            .attr('opacity', 1);
            
    };
    draw_data(xz);

    // zooming 
    container.call(zoom)
        .transition()
        .duration(750)
        .call(zoom.scaleTo, 1, [xscale(width),1] );

    function zoomed(event) {
        xz = event.transform.rescaleX(xscale);
        d3.selectAll("svg > *").remove();
        draw_x_and_y_scale();
        draw_data(xz)
    console.log(margin.left/width)
    }



   
    // change things when selector is used 
    targetButton.on("change", function(d) {
        var target_name = this.value;
        // filter the second button
        filter_query_button_by_target(target_name);
        // update the drawings
        change_contigs();
    })

    queryButton.on("change", function(d) {
        change_contigs();
    })

    function change_contigs(){
        var sel = document.getElementById('queryButton');
        var q_name = sel.options[sel.selectedIndex].value
        var sel = document.getElementById('targetButton');
        var t_name = sel.options[sel.selectedIndex].value
        console.log("selected option query:" + q_name);
        console.log("selected option target:" + t_name);

        d3.selectAll("svg").remove();
        // filter for contig of interest! 
        var aln_data = l_aln_data.filter(function (e) {
            return e.c1_nm == t_name && e.c2_nm == q_name;
        });
        miropeats_d3(aln_data)
    }



}

miropeats_d3(l_aln_data);
    

function reload(){
    var user = document.getElementById("UCSCuser").value;
    var UCSCsession = document.getElementById("UCSCsession").value;
    console.log(user + " " + UCSCsession);
    var start = "http://genome.ucsc.edu/cgi-bin/hgRenderTracks?"
    var session = "hgS_doOtherUser=submit&hgS_otherUserName="+user+"&hgS_otherUserSessionName="+UCSCsession+"&"
    var b_st = Math.round( xz.domain()[0] );
    var b_en = Math.round( xz.domain()[1] );
    var b_chr = t_name;//.slice(8);
    var position = "position=" + b_chr + "%3A" + b_st + "-" + b_en + "&"; 
    //var b_width = "pix=" + (document.body.clientWidth - margin.left -margin.right);
    var b_width = "pix=" + (document.getElementById(chart_name).clientWidth - margin.left+15);
    var url = start + session + position + b_width;
    console.log(url);
    document.getElementById("browser-img").src = url;
}

/*
##################################################################################
*/

 // Change the selection box for group2, dependent on the group1 selection
function filter_query_button_by_target(target_name){
    var filtered = l_aln_data.filter(function(d) {
        return d.c1_nm == target_name;
    });
    var uniq_q = [...new Set(filtered.map(d => d.c2_nm))];
    // remove options previously in the q selector
    d3.selectAll("#queryButton").selectAll("option").remove()
    // enter in the new data 
    queryButton
        .selectAll('#queryButton')
        .data(uniq_q)
        .enter()
        //.filter(function(d) { return d.c1_nm == t_name })
        .append('option')
        .text(function (d) { return d; }) // text showed in the menu
        .attr("value", function (d) { return d; }) // corresponding value returned by the button
        .property("selected", function(d){ return d === uniq_q[0]; })
}

function new_target_selector(new_data){
    // remove previous selections 
    d3.selectAll("option").remove()
    
    // add the options to the button
    var t_names = [...new Set(new_data.map(d => d.c1_nm))];
    console.log("new target names:" + t_names);
    targetButton
        .selectAll('myOptions')
        .data(t_names)
        .enter()
        .append('option')
        .text(function (d) { return d; }) // text showed in the menu
        .attr("value", function (d) { return d; }); // corresponding value returned by the button
    
    var sel = document.getElementById('targetButton');
    t_name = sel.options[sel.selectedIndex].value
    filter_query_button_by_target(t_name);
}


function difference_in_mid_point(data){
    //console.log("finding mid point on the target");
    var mid_target = 0;
    var mid_query = 0;
    var max=0;

    data.map(function(d){
        var weight = (d.c2_en - d.c2_st);
        if(weight > max){
            max=weight;
            mid_target= (d.c1_en + d.c1_st)/2;
            mid_query= (d.c2_en + d.c2_st)/2;
        }
    });
    //console.log(mid_target-mid_query);
    return(  mid_target-mid_query  )
}

function add_text(container){
    // target text         
            container.append('text')
                .attr("x",(c1_st+c1_en)/2).attr("y",c1_h+10)
                .style("fill", "black")
                .style("font-size", "10px")
                .attr("text-anchor", "middle")
                .attr("font-weight", "normal") 
                .text(`${o_c1_st} - ${o_c1_en}`);
            // query text
            container.append('text')
                .attr("x",(c2_st+c2_en)/2).attr("y",c2_h-5)
                .style("fill", "black")
                .style("font-size", "10px")
                .attr("text-anchor", "middle")
                .attr("font-weight", "normal") 
                .text(`${o_c2_st} - ${o_c2_en}`);
}
