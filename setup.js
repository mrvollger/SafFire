/// This is setup code for SafFire that only runs once, and sets up some of the global variables.
/// I have not idea how to javascript...
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
var MAX_BED_ITEMS = 500;
var BED_COUNT = 1;
var REF = get_url_elm("ref");
var QUERY = get_url_elm("query");
var targetGenome = d3.select("#targetGenome");
var queryGenome = d3.select("#queryGenome");
var space_for_bed = 20.0;
var draw_bed = function (d) { }
var miropeats_d3 = function (d) { };

var l_aln_data = [
    {
        c1_nm: "Chr 1", c1_st: 0, c1_en: 100, c1_len: 1000,
        strand: "+",
        c2_nm: "Chr 2", c2_st: 20, c2_en: 120, c2_len: 2000,
        id: "90",
    },
];
var bed9_data = {
    "datasets/CenSat.bed": [
        { ct: "chr1", st: 0, en: 500, name: "Acro1", score: 500, strand: "+", tst: 0, ten: 500, color: "200,0,0", file: 1 },
    ]
};
var zoom_bed_9 = bed9_data;
var cur_bed9_data = bed9_data;
// set up bed scales 
var bed_yscale_mod = d3.scaleBand()
    .domain(Object.keys(bed9_data))
    .range([0, space_for_bed]);

var bed_yscale_mod_query = d3.scaleBand()
    .domain(Object.keys(bed9_data))
    .range([0, space_for_bed]);

// thing I want to be global
var t_name = "";
var q_name = "";
// offset for each query contigs with default of 0.
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
var ALIGNMENTS = {};

// load in the metadata
var Q_GENOMES = new Set();
var T_GENOMES = new Set();
d3.csv("datasets/metadata.csv").then(function (data) {
    data.forEach(function (d) {
        ALIGNMENTS[d.ref + d.query] = d.file;
        Q_GENOMES.add(d.query);
        T_GENOMES.add(d.ref);
    });
    genome_selector();
}).then(function () {
    var tbl_file = ALIGNMENTS[REF + QUERY]
    d3.tsv(tbl_file)
        .then(function (d) {   // Handle the resolved Promise
            return create_table(d);
        });
}).then(function () {
    read_in_bed9_defaults();
});
var queryButton = d3.select("#queryButton");
var targetButton = d3.select("#targetButton");

// update when url is updated
window.addEventListener("hashchange", parse_url_change);

// change things when selector is used 
targetButton.on("change", function (d) {
    var sel = document.getElementById('targetButton');
    t_name = sel.options[sel.selectedIndex].value;
    // filter the second button
    filter_query_button_by_target(t_name);
    // update the drawings
    change_contigs();
})

// update when query is updated
queryButton.on("change", function (d) {
    change_contigs();
});

// check for updates to the genomes selected
targetGenome.on("change", function (d) {
    update_genomes();
});
queryGenome.on("change", function (d) {
    update_genomes();
});

new_target_selector(l_aln_data);