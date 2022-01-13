set_default_hash();
get_url_elm("ref");

var chart_name = "chart";
// WARNING: LEFT AND RIGHT MARGIN MUST BE EQUAL AMOUNTS
var margin = { top: 40, right: 40, bottom: 40, left: 40 };
console.assert(margin.left === margin.right,
    { right: margin.right, left: margin.left, errorMsg: "MARGINS NOT EQUAL" });
var scale = 1.5;
var height = Math.round(275 * scale);
const original_height = height;
var added_height = 0;
var width = Math.round(800 * scale);
var container = "";
var max_len = "";
var zoom = "";
var MAX_BED_ITEMS = 1000;
var BED_COUNT = 1;
var REF = get_url_elm("ref");
var QUERY = get_url_elm("query");
var draw_bed = function (d) { }

var l_aln_data = [
    {
        c1_nm: "Chr 1", c1_st: 0, c1_en: 100, c1_len: 1000,
        c2_nm: "Chr 2", c2_st: 20, c2_en: 120, c2_len: 2000,
        id: 90, strand: "+"
    },
];
var bed9_data = {
    "datasets/CenSat.bed": [
        { ct: "chr1", st: 0, en: 500, name: "Acro1", score: 500, strand: "+", tst: 0, ten: 500, color: "200,0,0", file: 1 },
    ]
};
var zoom_bed_9 = bed9_data;
var bed_yscale_mod = d3.scaleBand()//d3.scaleBand()
    .domain(Object.keys(bed9_data))
    .range([0, 20.0]);

// thing I want to be global
var t_name = "";
var q_name = "";
//var c2_offset = { "": 0, NULL: 0 }; // how much to offset the second contig to allow for centering 
var c2_offset = new Proxy({}, {
    get: (target, name) => name in target ? target[name] : 0
})
var yscale_d = "";
var yscale_c = "";
var xscale = "";
var xz = "";
var xz_offset = xz;
var alpha_scale = "";
const label_margin = 0;
const forward_color = "#2081f9";
const reverse_color = "#f99820";

function create_table(data) {
    l_aln_data = data.map(function (d) {
        var id = d.perID_by_events;
        if (id == "NA" | id == "0" | id == "") {
            id = "100";
        }
        m = +d.matches; mm = +d.mismatches;
        if (m + mm < 1) {
            id = "0"
        }

        return {
            c1_nm: d["#reference_name"],
            c1_st: +d.reference_start,
            c1_en: +d.reference_end,
            c1_len: +d.reference_length,
            strand: d.strand,
            c2_nm: "Query:" + d["query_name"],
            c2_st: +d.query_start,
            c2_en: +d.query_end,
            c2_len: +d.query_length,
            id: +id,
        };
    });
    var svg = d3.select("#" + chart_name);
    svg.selectAll("*").remove();
    new_target_selector(l_aln_data);
    miropeats_d3(l_aln_data);
    parse_url_change();
};
// load in the t2t alignments as defualt 
var tbl_file = `datasets/${QUERY}_to_${REF}.tbl`
d3.tsv(tbl_file)
    .then(function (d) {   // Handle the resolved Promise
        return create_table(d);
    });

// read in bed_9 data
function create_bed9(data, bed_file, is_query) {
    console.log(`creating bed data from (${is_query})` + bed_file);
    tmp_bed9_data = data.map(function (d) {
        var temp_name = d.ct;
        if (is_query) {
            temp_name = "Query:" + d.ct;
        };
        return {
            ct: temp_name,
            st: +d.st,
            en: +d.en,
            name: d.name,
            strand: d.strand,
            tst: +d.tst,
            ten: +d.ten,
            color: d.color,
            file: bed_file
        };
    });
    bed9_data[bed_file] = tmp_bed9_data;

    // bed data scale/offset
    console.log(Object.keys(bed9_data));
    bed_yscale_mod = d3.scaleBand()//d3.scaleBand()
        .domain(Object.keys(bed9_data))
        .range([0, 20.0]);
};

// this function check for bed files that exist for these references and loads them in
function read_in_bed9_defaults() {
    bed9_data = {};
    zoom_bed_9 = {};
    var bed_files = {
        ref: [
            `datasets/${REF}_CenSat.bed`,
            `datasets/${REF}_dupmasker_colors.bed`
        ],
        query: [
            `datasets/${QUERY}_dupmasker_colors.bed`,
            `datasets/${QUERY}_gaps.bed`,
        ]
    }
    for (const key in bed_files) {
        for (const bed_file of bed_files[key]) {
            console.log(`loading bed file for ${key} ${key == "query"} ${key}: ` + bed_file);
            d3.tsv(bed_file)
                .then(function (d) {   // Handle the resolved Promise
                    return create_bed9(d, bed_file, key == "query");
                });
        }
    }
}
read_in_bed9_defaults();

// handle upload button
function upload_button(el) {
    var uploader = document.getElementById(el);
    var reader = new FileReader();
    uploader.addEventListener("change", loadFile, false);

    function loadFile() {
        var file = document.querySelector('#uploader').files[0];
        reader.addEventListener("load", parseFile, false);
        if (file) {
            reader.readAsText(file);
        }
    }

    function parseFile() {
        REF = "USER_REF";
        QUERY = "USER_QUERY";
        set_user_hash();
        read_in_bed9_defaults();
        //var doesColumnExist = false;
        var data = d3.tsvParse(reader.result, function (d) {
            return d;
        });
        console.log("upload button parse");
        create_table(data);
    }
};

// handle upload bed
function uploadbed(el) {
    console.log("in upload_bed: " + el);
    var beduploader = document.getElementById(el);
    var bed_reader = new FileReader();
    beduploader.addEventListener("change", loadBedFile, false);

    function loadBedFile() {
        console.log("in loadBedFile");
        var bedfile = document.querySelector('#uploaderbed').files[0];
        bed_reader.addEventListener("load", parseBedFile, false);
        console.log("in loadBedFile: before reading bedfile text");
        if (bedfile) {
            console.log("in loadBedFile: reading bedfile text");
            bed_reader.readAsText(bedfile);
        }
    }

    function parseBedFile() {
        console.log("in upload_bed parser");
        var bed = "ct\tst\ten\tname\tscore\tstrand\ttst\tten\tcolor\n" + bed_reader.result;
        var data = d3.tsvParse(bed, function (d) {
            return d;
        });
        console.log("upload bed parse");
        console.log(data[0]);
        create_bed9(data, BED_COUNT);
        BED_COUNT = BED_COUNT + 1;
    }
};


var queryButton = d3.select("#queryButton");
var targetButton = d3.select("#targetButton");


new_target_selector(l_aln_data);

function miropeats_d3(data) {
    var aln_data = data;
    var t_names = [...new Set(data.map(d => d.c1_nm))].sort(collator.compare);
    var q_names = [...new Set(data.map(d => d.c2_nm))];

    t_name = t_names[0];
    //q_name = q_names[0];
    var sel = document.getElementById('queryButton');
    q_name = sel.options[sel.selectedIndex].value

    //q_names = [q_name];
    // filter for contig of interest! 
    var aln_data = data.filter(function (e) {
        if (q_name == "All") {
            return e.c1_nm == t_name && e.id > 0 && Math.abs(e.c1_en - e.c1_st) > 1 && Math.abs(e.c2_en - e.c2_st) > 1;
        } else {
            return e.c1_nm == t_name && e.c2_nm == q_name && e.id > 0 && Math.abs(e.c1_en - e.c1_st) > 1 && Math.abs(e.c2_en - e.c2_st) > 1;
        }
    });

    q_names = order_q_names_by_start_point(aln_data);
    console.log("q_names: " + q_names);

    // height += 20 * q_names.length;
    // set up the view box
    container = d3.select("#" + chart_name)
        .append("svg")
        .attr("width", "100%")
        .attr("viewBox", `0 0 ${width} ${height + added_height}`) // top, left, width, down

    max_len = d3.max(aln_data, function (d) {
        return d3.max([d.c1_len, d.c2_en + 1e6])
    });
    // target xscale inital x scale
    xscale = d3.scaleLinear()
        .domain([0, max_len])
        .range([margin.left, width - margin.right])
    xz = xscale; // define a zoomed version

    // query xscale inital x scale
    function xz_offset(d, c2_nm) {
        var offset = 0;
        if (c2_offset.hasOwnProperty(c2_nm)) {
            offset = c2_offset[c2_nm]
        }
        return xz(d + offset);
    };

    other_y_poses = [];//Array(q_names.length).fill(margin.top).map(function (d, i) {d + i});
    other_y_poses.push(0.8 * height - margin.bottom);
    if (q_name == "All") {
        for (var i = q_names.length - 1; i >= 0; i--) {
            other_y_poses.push(margin.top + i * 7);
        }
    } else {
        other_y_poses.push(margin.top + 20);
    }

    console.log("other_y_poses: " + other_y_poses);
    // yscale
    var yscale_d = d3.scaleOrdinal()//d3.scaleBand()
        .domain([t_name].concat(q_names))
        .range(other_y_poses)
    //.paddingInner(1)
    //.align(0);
    console.log(yscale_d.domain());
    console.log(yscale_d.range());

    // perid scale
    var yscale_c = d3.scaleLinear()
        .domain([d3.max([89, d3.min(aln_data, function (d) { return d.id })]),
        d3.max(aln_data, function (d) { return d.id })])
        .range([height, height - 2 * margin.bottom + label_margin]);

    // opacity scale
    alpha_scale = d3.scaleLinear()
        .domain([d3.min(aln_data, function (d) { return d.id }),
        d3.max(aln_data, function (d) { return d.id })])
        .range([0.5, 0.7]);


    // zoom scale 
    zoom = d3.zoom()
        .scaleExtent([1, max_len])
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

        var st = Math.max(0, Math.round(xz.domain()[0]));
        var en = Math.min(aln_data[0].c1_len, Math.round(xz.domain()[1]));
        //
        var c1_st = xz(o_c1_st), c1_en = xz(o_c1_en),
            c2_st = xz_offset(o_c2_st, c2_nm), c2_en = xz_offset(o_c2_en, c2_nm);
        //console.log("pre error?" + c2_nm + " " + c2_st + " " + c2_en);
        var y_perid = yscale_c(perid);


        const path = d3.path(),
            c1_h = yscale_d(c1_nm) - label_margin,//+yscale_d.bandwidth(),
            c2_h = yscale_d(c2_nm) + label_margin, //yscale_d(c2_nm),
            mid = (c1_h + c2_h) / 2; //yscale((c1_h+c2_h)/2);
        //console.log(`${c1_h},${c2_h}:${c1_nm},${c2_nm}`);
        container.append("path")
            .attr("d", path)
            .attr("color", "black")
            .attr("stroke-width", 2)

        var color = forward_color
        if (strand == "-") {
            var tmp = c2_st;
            c2_st = c2_en;
            c2_en = tmp;
            var color = reverse_color;
        };
        // color alpha on identity 
        var opacity = alpha_scale(perid);
        if (o_c1_en < st && o_c1_st < st) {
            opacity = 0;
        }
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
            .on('mousemove', function (event) {
                // add the tooltip
                div.transition()
                    .duration(100)
                    .style("opacity", .6);
                div.html(
                    //label_fmt(o_c2_st) + "-" + label_fmt(o_c2_en) + "<br>"+
                    d3.format(".1f")(o_c2_en / 1000 - o_c2_st / 1000) + " kbp<br>" +
                    d3.format(".2f")(perid) + "%<br>" +
                    d3.format(".1f")(o_c1_en / 1000 - o_c1_st / 1000) + " kbp<br>" +
                    " <br> "
                    //"q_st: " + d3.format(".0f")(o_c2_st) + " <br>" +
                    //"q_en: " + d3.format(".0f")(o_c2_en) + " <br>" 
                )
                    .style("left", event.pageX - 80 + "px")
                    .style("top", event.pageY - 20 + "px");
            })
            .on('mouseout', function () {
                d3.select(this).transition()
                    .duration(1)
                    .attr('opacity', `${opacity}`);
                // remove tooltip
                div.transition()
                    .duration(0)
                    .style("opacity", 0);
            })

        if (aln_data.length < 0) {
            // target text         
            container.append('text')
                .attr("x", (c1_st + c1_en) / 2).attr("y", c1_h + 10)
                .style("fill", "black")
                .style("font-size", "10px")
                .attr("text-anchor", "middle")
                .attr("font-weight", "normal")
                .text(`${o_c1_st} - ${o_c1_en}`);
            // query text
            container.append('text')
                .attr("x", (c2_st + c2_en) / 2).attr("y", c2_h - 5)
                .style("fill", "black")
                .style("font-size", "10px")
                .attr("text-anchor", "middle")
                .attr("font-weight", "normal")
                .text(`${o_c2_st} - ${o_c2_en}`);
        }


        // add in the perid line
        const per_id_path = d3.path()
        per_id_path.moveTo(c1_st, y_perid);
        per_id_path.lineTo(c1_en, y_perid);
        per_id_path.closePath()
        container.append("path")
            .attr("d", per_id_path)
            .attr("stroke", "black")
            .attr("z-index", -10000);

    }
    // format the d as input for drawing the alignment
    function draw_alignment(d, i) {
        help_draw_alignment(d.c1_nm, d.c1_st, d.c1_en, d.c2_nm, d.c2_st, d.c2_en, d.id, d.strand);
    }

    function draw_bed(d, i) {
        const path = d3.path();
        container.append("path")
            .attr("d", path)
            .attr("color", "black")
            .attr("stroke-width", 2);

        var start = xz_offset(d.st, d.ct);
        var end = xz_offset(d.en, d.ct);
        if (d.strand == "-") {
            start = xz_offset(d.en, d.ct);
            end = xz_offset(d.st, d.ct);
        }

        if (d.ct == t_name) {
            var y = yscale_d(d.ct) + bed_yscale_mod(d.file) + 5;
        } else {
            var y = yscale_d(d.ct) - bed_yscale_mod(d.file);
        }
        var tri_width = bed_yscale_mod.bandwidth() / 2.0;
        path.moveTo(start, y - tri_width);
        path.lineTo(start, y + tri_width);
        path.lineTo(end, y);
        path.lineTo(start, y - tri_width);
        path.closePath();

        // make the highlight regions 
        container.append("path")
            .attr("d", path)
            .attr("stroke", "none")
            .attr("fill", d3.rgb("rgb(" + d.color + ")"))
            .attr('opacity', '0.8')
            .on('mousemove', function (event) {
                // add the tooltip
                div.transition()
                    .duration(100)
                    .style("opacity", .8);
                div.html(
                    //`<b>${d.st}-${d.en}<br>${d.name}</b>`
                    `<b>${d.name}</b>`
                )
                    .style("left", event.pageX + "px")
                    .style("top", event.pageY - 20 + "px")
                    .style("border-width", "0px");
            })
            .on('mouseout', function () {
                d3.select(this).transition()
                    .duration(1)
                    .attr('opacity', 1);
                // remove tooltip
                div.transition()
                    .duration(0)
                    .style("opacity", 0);
            })
    }

    function draw_x_and_y_scale() {
        // draw the x axis 
        var xAxis = (g, x) => g
            .attr('transform', `translate(0, ${height * 0.855 - margin.bottom})`)
            .style("font", "11px helvetica")
            .call(d3.axisBottom(x)
                .ticks(10)
            );

        container.append("g")
            .call(xAxis, xz);


        // draw the y axis
        container.append('g')
            .style("font", "10px helvetica")
            //.attr('transform', `translate(0, 0)`)
            .attr("opacity", 1)
            .attr("fill", "black")
            .attr("stroke-width", 0)
            .call(d3.axisRight(yscale_d))
            .selectAll("text")
            .attr("dy", "10px");

        container.append('g')
            .style("font", "8px helvetica")
            .attr('transform', `translate(0, 0)`)
            .call(d3.axisRight(yscale_c)
                .ticks(7)
            );

    };


    // add in the data 
    function draw_data(xz) {
        var st = Math.max(0, Math.round(xz.domain()[0]));
        var en = Math.min(aln_data[0].c1_len, Math.round(xz.domain()[1]));
        var coords = `${t_name}:${d3.format(",")(st + 1)}-${d3.format(",")(en)}`;
        d3.selectAll('.coordinates').remove();
        // define the coordinate box
        var coordinates = d3.select("body").append("div")
            .attr("class", "coordinates")
        coordinates.text(coords)
            .html(`<b> ${coords} </b>`)
            .on("click", function () {
                coordinates.select();
                navigator.clipboard.writeText(`${t_name}:${st + 1}-${en}`).then(function () {
                    console.log('Async: Copying to clipboard was successful!');
                }, function (err) {
                    console.error('Async: Could not copy text: ', err);
                });
            })
            .on('mousemove', function (event) {
                // add the tooltip
                div.transition()
                    .duration(100)
                    .style("opacity", .8);
                div.html(
                    "<b>Click to copy coordinates</b>"
                )
                    .style("left", event.pageX - 100 + "px")
                    .style("top", event.pageY + "px")
                    .style("border-width", "0px");
            })
            .on('mouseout', function () {
                d3.select(this).transition()
                    .duration(1)
                    .attr('opacity', 1);
                // remove tooltip
                div.transition()
                    .duration(0)
                    .style("opacity", 0);
            })

        // filter for region of interest! 
        var zoom_data = aln_data.filter(function (d) {
            return d.c1_en >= st - 10e6 && d.c1_st <= en + 10e6;
        });
        // center the query contig
        c2_offset = difference_in_mid_point(zoom_data);

        // add in the bezier curves
        container.selectAll('g.item')
            .data(zoom_data)
            .enter()
            .each(draw_alignment)
            .selectAll('path')

        // add contig bars
        var xc1 = xz(zoom_data[0].c1_len);
        var yc1 = yscale_d(zoom_data[0].c1_nm);
        const path = d3.path();
        path.moveTo(xz(0), yc1 - label_margin); // c1 start
        path.lineTo(xc1, yc1 - label_margin); // go to c1 en

        //
        var start_end_dict = make_start_end_dict(zoom_data);

        const dashed_path = d3.path();
        // add all query bars
        for (c2_nm in start_end_dict) {
            // add transparent bars
            var c2_len = start_end_dict[c2_nm].len;
            var xc2 = xz_offset(c2_len, c2_nm);
            var yc2 = yscale_d(c2_nm);
            dashed_path.moveTo(xz_offset(0, c2_nm), yc2 + label_margin);
            dashed_path.lineTo(xc2, yc2 + label_margin);

            // add solid bars
            var xc2 = xz_offset(start_end_dict[c2_nm].end, c2_nm);
            var yc2 = yscale_d(c2_nm);
            path.moveTo(xz_offset(start_end_dict[c2_nm].start, c2_nm), yc2 + label_margin);
            path.lineTo(xc2, yc2 + label_margin);
        }
        path.closePath();
        dashed_path.closePath();

        container.append("path")
            .attr("d", path)
            .attr("stroke", "black")
            .attr("stroke-width", 0.5)
            .attr('opacity', 1);

        container.append("path")
            .attr("d", dashed_path)
            .attr("stroke", "black")
            .attr("stroke-width", 0.5)
            .attr('opacity', 0.45)
            .style("stroke-dasharray", ("1, 1"));

        // draw the scales 
        draw_x_and_y_scale();

        // draw bed9
        for (var key in bed9_data) {
            var tmp_bed9_data = bed9_data[key];
            zoom_bed_9 = tmp_bed9_data.filter(function (d) {
                return d.ct == t_name && d.en >= st && d.st <= en
                    || start_end_dict.hasOwnProperty(d.ct) && d.en + c2_offset[d.ct] >= st && d.st + c2_offset[d.ct] <= en;
            });
            if (zoom_bed_9.length < MAX_BED_ITEMS) {
                container.selectAll('g.item2')
                    .data(zoom_bed_9)
                    .enter()
                    .each(draw_bed)
                    .selectAll('path')
            }
        }

    };
    draw_data(xz);

    // zooming 
    container.call(zoom)
        .transition()
        .duration(750)
        .call(zoom.scaleTo, 1, [xscale(width), 1]);

    function zoomed(event) {
        xz = event.transform.rescaleX(xscale);
        d3.selectAll("svg > *").remove();
        d3.selectAll('.coordinates').remove();
        draw_x_and_y_scale();
        draw_data(xz)
    }
}



// change things when selector is used 
targetButton.on("change", function (d) {
    var sel = document.getElementById('targetButton');
    t_name = sel.options[sel.selectedIndex].value;
    // filter the second button
    filter_query_button_by_target(t_name);
    // update the drawings
    change_contigs();
})

queryButton.on("change", function (d) {
    change_contigs();
});

function change_contigs() {
    var sel = document.getElementById('targetButton');
    t_name = sel.options[sel.selectedIndex].value;
    var sel = document.getElementById('queryButton');
    q_name = sel.options[sel.selectedIndex].value

    console.log("selected option query:" + q_name);
    console.log("selected option target:" + t_name);

    d3.selectAll("svg").remove();
    d3.selectAll('.coordinates').remove();
    // filter for contig of interest! 
    var aln_data = l_aln_data.filter(function (e) {
        return e.c1_nm == t_name //&& e.c2_nm == q_name;
    });
    miropeats_d3(aln_data)
}


// check for url updates
function parse_url_change() {
    const parsedHash = new URLSearchParams(
        window.location.hash.substr(1) // skip the first char (#)
    );
    var url = parsedHash.get("url");
    console.log(`url: ${url}`);
    if (url != null) {
        d3.tsv(url)
            .then(function (d) {   // Handle the resolved Promise
                return create_table(d);
            }
            );
    }
    // check if ref or query updated
    var ref = parsedHash.get("ref");
    var query = parsedHash.get("query");
    if (ref != REF || query != QUERY) {
        REF = ref;
        QUERY = query;
        var tbl_file = `datasets/${QUERY}_to_${REF}.tbl`
        d3.tsv(tbl_file)
            .then(function (d) {   // Handle the resolved Promise
                return create_table(d);
            });
    }

    var max_bed_items = parsedHash.get("max_bed_items");
    if (max_bed_items != null && max_bed_items != MAX_BED_ITEMS) {
        MAX_BED_ITEMS = max_bed_items;
        draw_bed();
    }
    if (parsedHash.get("pos") != null) {
        var x0 = 1e6; var x1 = x0 + 2e7;
        [chrm, pos] = parsedHash.get("pos").split(":");
        console.log(`chr: ${chrm}    pos: ${pos} maxlen: ${max_len}`);
        if (chrm != t_name) {
            let element = document.getElementById('targetButton');
            element.value = chrm;
            // filter the second button
            filter_query_button_by_target(chrm);
            // update the drawings
            change_contigs();
        }
        [st, x1] = pos.split("-");
        var x0 = st - 1;
        console.log(`x0: ${x0}    x1: ${x1} maxlen: ${max_len}`);
        container.call(zoom).transition()
            .duration(2000)
            .call(
                zoom.transform,
                d3.zoomIdentity
                    .translate((width) / 2, height / 2)
                    .scale((max_len) / (x1 - x0))
                    .translate(-(xscale(x0) + xscale(x1)) / 2, height)
            )
            .on("end", function () {
                if (parsedHash.get("save") != null) {
                    save_svg();
                }
            });
    }
    else if (parsedHash.get("save") != null) {
        save_svg();
    }
    if (parsedHash.get("view") != null) {
        view_svg();
    }
}
window.addEventListener("hashchange", parse_url_change);




function reload() {
    var user = document.getElementById("UCSCuser").value;
    var UCSCsession = document.getElementById("UCSCsession").value;
    console.log(user + " " + UCSCsession);
    var start = "https://genome.ucsc.edu/cgi-bin/hgRenderTracks?"
    var session = "hgS_doOtherUser=submit&hgS_otherUserName=" + user + "&hgS_otherUserSessionName=" + UCSCsession + "&"
    var b_st = Math.round(xz.domain()[0]);
    var b_en = Math.round(xz.domain()[1]);
    var b_chr = t_name;//.slice(8);
    var position = "position=" + b_chr + "%3A" + b_st + "-" + b_en + "&";
    //var b_width = "pix=" + (document.body.clientWidth - margin.left -margin.right);
    var b_width = "pix=" + (document.getElementById(chart_name).clientWidth - margin.left + 15);
    var url = start + session + position + b_width;
    console.log(url);
    document.getElementById("browser-img").src = url;
}

/*
##################################################################################
*/

// Change the selection box for group2, dependent on the group1 selection
function filter_query_button_by_target(target_name) {
    var filtered = l_aln_data.filter(function (d) {
        return d.c1_nm == target_name;
    });
    var uniq_q = order_q_names(filtered);
    // uniq_q.reverse();
    // var uniq_q = [...new Set(filtered.map(d => d.c2_nm))];
    uniq_q.push("All");
    d3.selectAll('.coordinates').remove();
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
        .property("selected", function (d) { return d === uniq_q[0]; })
}

function new_target_selector(new_data) {
    // remove previous selections 
    d3.selectAll("option").remove()
    d3.selectAll('.coordinates').remove();

    // add the options to the button
    var t_names = [...new Set(new_data.map(d => d.c1_nm))].sort(collator.compare);
    //var myArray = ['1_Document', '11_Document', '2_Document'];
    //console.log(t_names);

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


function add_text(container) {
    // target text         
    container.append('text')
        .attr("x", (c1_st + c1_en) / 2).attr("y", c1_h + 10)
        .style("fill", "black")
        .style("font-size", "10px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "normal")
        .text(`${o_c1_st} - ${o_c1_en}`);
    // query text
    container.append('text')
        .attr("x", (c2_st + c2_en) / 2).attr("y", c2_h - 5)
        .style("fill", "black")
        .style("font-size", "10px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "normal")
        .text(`${o_c2_st} - ${o_c2_en}`);
}


d3.select('#invert').on('click', function () {
    console.log("invert button!!!");
    l_aln_data = l_aln_data.map(function (d) {
        var s = "+";
        if (d.strand == "+") {
            s = "-";
        }
        return {
            c1_nm: d.c1_nm,
            c1_st: +d.c1_st,
            c1_en: +d.c1_en,
            c1_len: +d.c1_len,
            strand: s,
            c2_nm: d.c2_nm,
            c2_st: d.c2_len - d.c2_en,
            c2_en: d.c2_len - d.c2_st,
            c2_len: +d.c2_len,
            id: +d.id,
        };
    });
    d3.selectAll("svg").remove();
    d3.selectAll('.coordinates').remove();
    miropeats_d3(l_aln_data);
});

function view_svg() {
    var st = Math.round(xz.domain()[0]);
    var en = Math.round(xz.domain()[1]);
    var svgEl = d3.selectAll("svg").node();//#"+chart_name);
    console.log(svgEl);
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    var svgData = svgEl.outerHTML;
    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
    var svgUrl = URL.createObjectURL(svgBlob);
    window.location = (svgUrl)
}

function save_svg() {
    var st = Math.round(xz.domain()[0]);
    var en = Math.round(xz.domain()[1]);

    var svgEl = d3.selectAll("svg").node();//#"+chart_name);
    console.log(svgEl);
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    var svgData = svgEl.outerHTML;
    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
    var svgUrl = URL.createObjectURL(svgBlob);

    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `SafFire_${t_name}:${st + 1}-${en}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

miropeats_d3(l_aln_data);