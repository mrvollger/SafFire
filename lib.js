
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