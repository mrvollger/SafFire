function miropeats_d3(data) {
    var t_names = [...new Set(data.map(d => d.c1_nm))].sort(collator.compare);
    var q_names = [...new Set(data.map(d => d.c2_nm))];
    t_name = t_names[0];

    var sel = document.getElementById('queryButton');
    q_name = sel.options[sel.selectedIndex].value

    //filter for contig of interest! 
    var aln_data = data.filter(function (e) {
        if (q_name == "All") {
            return e.c1_nm == t_name && e.id > 0 && Math.abs(e.c1_en - e.c1_st) > 1 && Math.abs(e.c2_en - e.c2_st) > 1;
        } else {
            return e.c1_nm == t_name && e.c2_nm == q_name && e.id > 0 && Math.abs(e.c1_en - e.c1_st) > 1 && Math.abs(e.c2_en - e.c2_st) > 1;
        }
    });

    // q_names for this contig
    q_names = order_q_names_by_start_point(aln_data);
    console.log("q_names: " + q_names);

    // filter current bed 9 data for the selection
    // var cur_bed9_data = bed9_data;
    // not working on initial load
    var cur_q_names = [...new Set(aln_data.map(d => d.c2_nm))];
    cur_bed9_data = {};
    for (var key in bed9_data) {
        var tmp_bed9_data = bed9_data[key].filter(function (d) {
            return d.ct == t_name || cur_q_names.includes(d.ct);
        });
        cur_bed9_data[key] = tmp_bed9_data;
    }


    // height += 20 * q_names.length;
    // set up the view box
    container = d3.select("#" + chart_name)
        .append("svg")
        .attr("width", "100%")
        .attr("viewBox", `0 0 ${width} ${height + added_height}`) // top, left, width, down

    max_len = d3.max(aln_data, function (d) {
        return d3.max([d.c1_len, d.c2_en + 1e6 + get_offset_for_query(d.c2_nm, c2_offset)])
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
    var dist_between_q_lines = Math.min(space_for_bed, 80 / q_names.length);
    console.log("dist_between_q_lines: " + dist_between_q_lines);
    if (q_name == "All") {
        for (var i = q_names.length - 1; i >= 0; i--) {
            other_y_poses.push(margin.top + i * dist_between_q_lines);
        }
    } else {
        other_y_poses.push(margin.top + 20);
    }
    console.log("other_y_poses: " + other_y_poses);
    // yscale
    var yscale_d = d3.scaleOrdinal()
        .domain([t_name].concat(q_names))
        .range(other_y_poses)
    console.log(yscale_d.domain());
    console.log(yscale_d.range());

    // perid scale
    var yscale_c = d3.scaleLinear()
        .domain([d3.max([89, d3.min(aln_data, function (d) { return d.id })]),
        d3.max(aln_data, function (d) { return d.id })])
        .range([height, height - space_for_bed + 10 - margin.bottom + label_margin]);

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

        var c1_st = xz(o_c1_st), c1_en = xz(o_c1_en),
            c2_st = xz_offset(o_c2_st, c2_nm), c2_en = xz_offset(o_c2_en, c2_nm);
        var y_perid = yscale_c(perid);


        const path = d3.path(),
            c1_h = yscale_d(c1_nm) - label_margin,
            c2_h = yscale_d(c2_nm) + label_margin,
            mid = (c1_h + c2_h) / 2;

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
                    "Target " + my_coord_fmt(o_c1_st) + "-" + my_coord_fmt(o_c1_en) + "<br>" +
                    "Query " + my_coord_fmt(o_c2_st) + "-" + my_coord_fmt(o_c2_en) + "<br>" +
                    //my_coord_fmt(o_c2_en - o_c2_st) + "bp<br>" +
                    //my_coord_fmt(o_c1_en - o_c1_st) + "bp<br>"
                    //"q_st: " + d3.format(".0f")(o_c2_st) + " <br>" +
                    //"q_en: " + d3.format(".0f")(o_c2_en) + " <br>" +
                    my_coord_fmt(perid) + "%<br>"
                )
                    .style("left", event.pageX - 80 + "px")
                    .style("top", event.pageY - 80 + "px");
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
        // setup height
        if (d.ct == t_name) {
            var y = yscale_d(d.ct) + bed_yscale_mod(d.file) / 1.0 + 5;
            var tri_width = bed_yscale_mod.bandwidth() / 2;
        } else {
            var y = yscale_d(d.ct) - bed_yscale_mod_query(d.file) / 1.0 - 5;
            var tri_width = bed_yscale_mod_query.bandwidth() / 2;
        }

        const path = d3.path();
        // draw the triangle(s)
        for (var i = 0; i < d.b_st.length; i++) {
            var size = d.b_sz[i];
            var offset = d.b_st[i];

            var start = xz_offset(d.st + offset, d.ct);
            var end = xz_offset(d.st + offset + size, d.ct);
            if (d.strand == "-") {
                start = xz_offset(d.st + offset + size, d.ct);
                end = xz_offset(d.st + offset, d.ct);
            }

            path.moveTo(start, y - tri_width);
            path.lineTo(start, y + tri_width);
            path.lineTo(end, y + tri_width / 2.5);
            path.lineTo(end, y - tri_width / 2.5);
            path.lineTo(start, y - tri_width);
        }
        path.closePath();

        // draw connecting lines
        const path2 = d3.path();
        var tdiv = 5;
        path2.moveTo(xz_offset(d.st, d.ct), y - tri_width / tdiv);
        path2.lineTo(xz_offset(d.en, d.ct), y - tri_width / tdiv);
        path2.lineTo(xz_offset(d.en, d.ct), y + tri_width / tdiv);
        path2.lineTo(xz_offset(d.st, d.ct), y + tri_width / tdiv);
        path2.lineTo(xz_offset(d.st, d.ct), y - tri_width / tdiv);
        path2.closePath();

        // make the highlight regions 
        bed_path(path, d, div);

        // add the straight line
        bed_path(path2, d, div)
    }

    function draw_x_and_y_scale() {
        // draw the x axis 
        var xAxis = (g, x) => g
            .attr('transform', `translate(0, ${height * 0.8 + 10 + space_for_bed - margin.bottom})`)
            .style("font", "11px helvetica")
            .call(d3.axisBottom(x)
                .ticks(10)
            );

        container.append("g")
            .call(xAxis, xz);


        // add white squares for the text 
        var square_data = []
        get_contig_names(aln_data).forEach(function (key) {
            var tname = format_y_axis(key);
            var x1 = 5;
            var x2 = 10 + 5 * tname.length;
            var y1 = yscale_d(key) - 5.5;
            var y2 = yscale_d(key) + 5.5;
            square_data.push([[x1, y1], [x2, y2]]);
        });
        var rects = container.selectAll("foo")
            .data(square_data)
            .enter()
            .append("rect")
            .attr("x", d => d[0][0])
            .attr("y", d => d[0][1])
            .attr("width", d => d[1][0] - d[0][0])
            .attr("height", d => d[1][1] - d[0][1])
            .attr("opacity", 0.6)
            .attr("stroke", "black")
            .attr("stroke-opacity", "0.5")
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', '.5')
            .attr("fill", "white");

        // draw the y axis
        container.append('g')
            .style("font", "8px helvetica")
            //.attr('transform', `translate(0, 0)`)
            .attr("opacity", 1)
            .attr("fill", "black")
            .attr("stroke-width", 0)
            .call(d3.axisRight(yscale_d)
                .tickFormat(format_y_axis)
            )
        //.selectAll("text")
        //.attr("dy", "10px");

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
        //set_url_hash_elm("pos", `${t_name}:${st}-${en}`, false);
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
        /*
        // this just messes things up so I am hiding it
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
        })*/

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
        for (var key in cur_bed9_data) {
            var tmp_bed9_data = cur_bed9_data[key];
            zoom_bed_9 = tmp_bed9_data.filter(function (d) {
                in_target = (d.ct == t_name) && (d.en >= st) && (d.st <= en);
                in_query = (
                    d.en + Math.abs(c2_offset[d.ct]) + 2e6 >= st
                ) && (
                        d.st - Math.abs(c2_offset[d.ct]) - 2e6 <= en
                    );
                large_enough = (d.en - d.st) > ((en - st) / 3000);
                return (in_target || in_query) && large_enough;
            });
            if (zoom_bed_9.length < MAX_BED_ITEMS) {
                zoom_bed_9 = zoom_bed_9.slice(0, MAX_BED_ITEMS);
            }
            container.selectAll('g.item2')
                .data(zoom_bed_9)
                .enter()
                .each(draw_bed)
                .selectAll('path')

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
        draw_x_and_y_scale();
        draw_data(xz)
    }

    d3.select('#invert').on('click', function () {
        console.log("invert button!!!");
        // TODO: also invert the bed files
        aln_data = aln_data.map(function (d) {
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
        clean_hover_text();
        d3.selectAll("svg > *").remove();
        d3.selectAll('.coordinates').remove();
        draw_x_and_y_scale();
        draw_data(xz)
    });
}


/// This code allows rust to bind before drawing the data
const { my_greet, mmstats, simple } = wasm_bindgen;
async function run() {
    await wasm_bindgen('./pkg/saffire_bg.wasm');
    await read_in_bed9_defaults();
    await change_contigs();
    //my_greet("hello from rust");
    console.log(
        "REAL RUST CODE " +
        simple([
            { x: 10, y: 2, z: "asdf" },
            { x: 10, y: 2, z: "asdf" }
        ])
    );
    // overflows if more than ~1345 elements. 
    console.log(
        "REAL RUST CODE " +
        await mmstats(l_aln_data.slice(0, 100))
    );
}
//run();
change_contigs();