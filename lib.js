
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