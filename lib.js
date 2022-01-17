
function get_url_elm(tag) {
    const parsedHash = new URLSearchParams(
        window.location.hash.substr(1) // skip the first char (#)
    );
    var val = parsedHash.get(tag);
    console.log(`url ${tag}: ${val}`);
    return val;
}

function set_default_hash() {
    window.location.hash = "#ref=CHM13_v1.1&query=CHM1";
    window.location.hash = "#ref=CHM13_v1.1&query=GRCh38";
}

function set_user_hash() {
    window.location.hash = "#ref=USER_REF&query=USER_QUERY";
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// natural sorting function
var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });


function order_q_names(aln_data) {
    var dict = {};
    for (var i = 0; i < aln_data.length; i++) {
        var key = aln_data[i].c2_nm;
        var value = aln_data[i].c2_en - aln_data[i].c2_st;
        if (!(key in dict)) {
            dict[key] = 0;
        }
        dict[key] = dict[key] + value;
    }
    // Create items array
    var items = Object.keys(dict).map(function (key) {
        return [key, dict[key]];
    });
    // Sort the array based on the second element
    items.sort(function (first, second) {
        return second[1] - first[1];
    });

    return items.map(function (d) { return d[0] });
}

function order_q_names_by_start_point(aln_data) {
    var dict = {};
    for (var i = 0; i < aln_data.length; i++) {
        var key = aln_data[i].c2_nm;
        var value = aln_data[i].c1_st;
        if (!(key in dict)) {
            dict[key] = value;
        }
        if (dict[key] > value) {
            dict[key] = value;
        }
    }
    // Create items array
    var items = Object.keys(dict).map(function (key) {
        return [key, dict[key]];
    });
    // Sort the array based on the second element
    items.sort(function (first, second) {
        return first[1] - second[1];
    });

    return items.map(function (d) { return d[0] });
}

function update_container() {
    // set up the view box
    height += 50;
    console.log(`added height: ${added_height}`);
    container = d3.select("#" + chart_name)
        .append("svg")
        .attr("width", "100%")
        .attr("viewBox", `${added_height} 0 ${width} ${height + added_height}`)
    // top, left, width, down
}

function difference_in_mid_point(data) {
    rtn = {};
    var temp_c2_nms = data.map(d => d.c2_nm);
    var c2_nms = [...new Set(temp_c2_nms)];
    for (const c2_nm of c2_nms) {
        var mid_target = 0;
        var mid_query = 0;
        var total = 0;

        data.map(function (d) {
            if (d.c2_nm == c2_nm) {
                var weight = (d.c2_en - d.c2_st);
                mid_target += weight * (d.c1_en + d.c1_st) / 2;
                mid_query += weight * (d.c2_en + d.c2_st) / 2;
                total += weight;
            }
        });
        rtn[c2_nm] = ((mid_target - mid_query) / total)
    }
    return rtn
}

function get_contig_names(data) {
    var temp_c1_nms = data.map(d => d.c1_nm);
    var c1_nms = [...new Set(temp_c1_nms)];
    var temp_c2_nms = data.map(d => d.c2_nm);
    const c2_nms = [...new Set(temp_c2_nms)];
    return c1_nms.concat(c2_nms);
}

// get the start, end, and length of the query contigs 
function make_start_end_dict(zoom_data) {
    var start_end_dict = {};
    zoom_data.map(function (d) {
        if (!start_end_dict.hasOwnProperty(d.c2_nm)) {
            start_end_dict[d.c2_nm] = { start: d.c2_st, end: d.c2_en, len: d.c2_len };
        };
        if (d.c2_st < start_end_dict[d.c2_nm].start) {
            start_end_dict[d.c2_nm].start = d.c2_st;
        };
        if (d.c2_en > start_end_dict[d.c2_nm].end) {
            start_end_dict[d.c2_nm].end = d.c2_en;
        };
    });
    return start_end_dict;
}

var format_y_axis = function (d) {
    return d.replace(/^(Query:)/, '');;
}


function get_contig_names_and_lengths(data) {
    var dict = {}
    data.forEach(d => {
        if (!dict.hasOwnProperty(d.c2_nm)) {
            dict[d.c2_nm] = d.c2_len;
            var nm = d.c2_nm.replace(/(\+|-)$/g, "");
            dict[nm] = d.c2_len;
        };
        if (!dict.hasOwnProperty(d.c1_nm)) {
            dict[d.c1_nm] = d.c1_len;
            var nm = d.c1_nm.replace(/(\+|-)$/g, "");
            dict[nm] = d.c1_len;
        };
    });
    console.log("contig names and lengths", dict);
    return dict
}



// read in the rustybam table and make a dataframe
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
    genome_selector();
    //miropeats_d3(l_aln_data);
    change_contigs();
    parse_url_change();
};

function add_to_bed_contig_name(data, addition) {
    var dict_lengths = get_contig_names_and_lengths(l_aln_data);
    console.log("dict_lengths", dict_lengths);
    tmp = data.map(d => {
        var st = d.st;
        var en = d.en;
        var strand = d.strand;
        if (addition == "-") {
            st = dict_lengths[d.ct] - d.en;


            en = dict_lengths[d.ct] - d.st;
            if (strand == "-") {
                strand = "+";
            } else {
                strand = "-";
            }
        }
        return {
            ct: d.ct + addition,
            st: st,
            en: en,
            name: d.name,
            strand: strand,
            tst: d.tst,
            ten: d.ten,
            color: d.color,
            b_ct: d.b_ct,
            b_st: d.b_st,
            b_sz: d.b_sz,
            file: d.file,
            is_query: d.is_query
        };
    });
    return tmp;
}

// 
function split_bed_blocks(s) {
    var rtn = s.split(",").map(function (d) {
        return +d; // convert to number
    });
    return rtn;
}

// read in bed_9 data
function create_bed9(data, bed_file, is_query) {
    console.log(`creating bed data from (${is_query})` + bed_file);

    tmp_bed9_data = data.map(function (d) {
        var temp_name = d["#ct"];
        if (is_query) {
            temp_name = "Query:" + d["#ct"];
        };
        if (d.b_ct == undefined | d.b_ct == "") {
            d["b_ct"] = 1;
            d["b_st"] = "0";
            d["b_sz"] = `${+d.en - +d.st}`;
        }
        return {
            ct: temp_name,
            st: +d.st,
            en: +d.en,
            name: d.name,
            strand: d.strand,
            tst: +d.tst,
            ten: +d.ten,
            color: d.color,
            b_ct: +d.b_ct,
            b_st: split_bed_blocks(d.b_st),
            b_sz: split_bed_blocks(d.b_sz),
            file: bed_file,
            is_query: is_query
        };
    });
    if (is_query) {
        minus = add_to_bed_contig_name(tmp_bed9_data, "-");
        plus = add_to_bed_contig_name(tmp_bed9_data, "+");
        tmp_bed9_data = tmp_bed9_data.concat(minus, plus);
    }
    bed9_data[bed_file] = tmp_bed9_data;

    // bed data scale/offset
    var keys = Object.keys(bed9_data)
        .filter(key => bed9_data[key][0].is_query == is_query);
    console.log(`KEYS FOR BED FILES ${is_query}`, keys);
    if (is_query) {
        bed_yscale_mod_query = d3.scaleBand()
            .domain(keys)
            .range([0, space_for_bed]);
    } else {
        bed_yscale_mod = d3.scaleBand()
            .domain(keys)
            .range([0, space_for_bed]);
    }
};

// this function check for bed files that exist for these references and loads them in
function read_in_bed9_defaults() {
    bed9_data = {};
    zoom_bed_9 = {};
    var bed_files = {
        ref: [
            `datasets/${REF}_CenSat.bed`,
            `datasets/${REF}_dupmasker_colors.bed`,
            `datasets/${REF}_genes_small.bed`,
        ],
        query: [
            `datasets/${QUERY}_dupmasker_colors.bed`,
            `datasets/${QUERY}_gaps.bed`,
            `datasets/${QUERY}_CenSat.bed`,
        ]
    }
    for (const key in bed_files) {
        for (const bed_file of bed_files[key]) {
            console.log(`loading bed file for ${key} ${key == "query"} ${key}: ` + bed_file);
            d3.tsv(bed_file)
                .then(function (d) {   // Handle the resolved Promise
                    return create_bed9(d, bed_file, key == "query");
                });
            /*
            d3.text(bed_file, function (text) {
                data = d3.csvParseRows(text);
                create_bed9(data, bed_file, key == "query");
            });*/
        }
    }
}




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
        /*var data = [];
        d3.text(bed, function (text) {
            data = d3.tsvParseRows(text);
        });*/

        console.log("upload bed parse");
        console.log(data[0]);
        create_bed9(data, BED_COUNT);
        BED_COUNT = BED_COUNT + 1;
    }
};




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
        read_in_bed9_defaults();
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



// UCSC reload button
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





///////////////////////////////////
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





// genome selectors
function genome_selector() {
    // add the options to the button
    var q_genomes = ["GRCh38", "CHM1"]
    var t_genomes = ["CHM13_v1.1"]

    console.log("TARGET GENOMES: " + t_genomes);
    d3.selectAll("#targetGenome").selectAll("option").remove();
    targetGenome
        .selectAll('#targetGenome')
        .data(t_genomes)
        .enter()
        .append('option')
        .text(function (d) { return d; }) // text showed in the menu
        .attr("value", function (d) { return d; });

    console.log("QUERY GENOMES: " + q_genomes);
    d3.selectAll("#queryGenome").selectAll("option").remove();
    queryGenome
        .selectAll('#queryGenome')
        .data(q_genomes)
        .enter()
        .append('option')
        .text(function (d) { return d; }) // text showed in the menu
        .attr("value", function (d) { return d; });

    // set the right defaults 
    var element = document.getElementById("targetGenome");
    element.value = REF;
    var element = document.getElementById("queryGenome");
    element.value = QUERY;

    //let element = document.getElementById('targetButton');

}

function update_genomes() {
    clean_hover_text();

    var sel = document.getElementById('targetGenome');
    var target = sel.options[sel.selectedIndex].value

    var sel = document.getElementById('queryGenome');
    var query = sel.options[sel.selectedIndex].value

    // update the  hash
    window.location.hash = `#ref=${target}&query=${query}`;
    console.log("genome selection:" + target + " " + query);

    allow_bed_to_load()
}


function clean_hover_text() {
    document.querySelectorAll('.tooltip').forEach(e => e.remove());
    document.querySelectorAll('.coordinates').forEach(e => e.remove());
}


function my_coord_fmt(num, round = false) {
    if (num > 1e5 && round) {
        num = Math.round(num / 1000)
    }
    return d3.format(".4s")(num)
}

function allow_bed_to_load() {
    sleep(2000).then(function () {
        change_contigs();
    });
}

// draw a bed path
function bed_path(path, d, div) {
    container.append("path")
        .attr("d", path)
        .attr("stroke", "none")
        .attr("fill", d3.rgb("rgb(" + d.color + ")"))
        .attr("opacity", 0.8)
        .on('mousemove', function (event) {
            // add the tooltip
            div.transition()
                .duration(100)
                .style("opacity", 0.9);
            div.html(
                `<b>${d.name}</b>`
            )
                .style("left", event.pageX + "px")
                .style("top", event.pageY - 20 + "px")
                .style("border-width", "0px");
            d3.select(this).transition()
                .duration(100)
                .attr('opacity', 1)
                .attr("stroke", "black")
                .attr("stroke-width", "0.75px");
        })
        .on('mouseout', function () {
            d3.select(this).transition()
                .duration(1)
                .attr('opacity', 0.8)
                .attr("stroke", "none");
            // remove tooltip
            div.transition()
                .duration(0)
                .style("opacity", 0);
        })
}